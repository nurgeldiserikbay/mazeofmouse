<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { Capacitor } from '@capacitor/core'


import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import Admob from '@/utils/admob'
import { useAudio } from '@/composables/useAudio'

import UiButton from '@/components/UiButton.vue'
import BackLink from '@/components/BackLink.vue'
import TimerItem from '@/components/TimerItem.vue'
import ResultTable from '@/components/ResultTable.vue'
import AdSlot from '@/components/AdSlot.vue'
import OtherGames from '@/components/OtherGames.vue'
import ConfirmExit from '@/components/ConfirmExit.vue'

import { getMaze, isCross, nextPost } from './game'
import { getGridSizeByLevel } from './helpers'

let timerID: ReturnType<typeof setInterval>
let timerDirID: ReturnType<typeof setInterval>
let timerCatID: ReturnType<typeof setInterval>
let catAnimId: ReturnType<typeof setInterval>
const gameStore = useGameStore()
const pageStore = usePageStore()
const audioCont = useAudio()

const mazeRef = ref()
const level = ref(gameStore.currentLevel)
const sizes = computed(() => {
	return getGridSizeByLevel(level.value)
})
let blockSize = 30
const xlen = computed(() => sizes.value.cols)
const ylen = computed(() => sizes.value.rows)
const dirGrad: { [key: string]: number } = {
	'-10': 180,
	'10': 0,
	'0-1': -90,
	'01': 90,
}
const DIRS: { [key: string]: [number, number] } = {
	top: [0, -1],
	bottom: [0, 1],
	left: [-1, 0],
	right: [1, 0],
}
const isStarted = ref(false)
// Полноэкранное объявление сейчас на экране: игра под ним продолжает работать,
// но таймер уровня на это время замирает, иначе реклама съедала бы время игрока.
const adShowing = ref(false)
const curPos = ref<[number, number]>([0, 0])
const curCatPos = ref<[number, number]>([0, 0])
const currentStyle = ref(`translate(0px, 0px) rotateZ(0deg)`)
const currentCatStyle = ref(`translate(0px, 0px) rotateZ(0deg)`)
const maze = ref<number[][]>([])

/**
 * Стены бывают каменные и живой изгородью, как на макете. Тип выбирается не
 * поклеточно (вышел бы пёстрый шум), а участками 3x3, и раскладка своя у
 * каждого лабиринта. На механику не влияет: стена есть стена.
 */
const mazeSeed = ref(0)
function wallClass(row: number, col: number) {
	const region =
		(Math.imul(Math.floor(row / 3) + 1, 73856093) ^
			Math.imul(Math.floor(col / 3) + 1, 19349663) ^
			mazeSeed.value) >>>
		0
	const kind = region % 5 < 2 ? 'stone' : 'hedge'
	const variant = (row * 7 + col * 3) % 2 ? 'v2' : 'v1'
	return `${kind} ${variant}`
}

/**
 * Крупные лабиринты (клетка мельче ~17px) рисуются плоскими тайлами тех же
 * цветов: листва и трещины на 11px превращаются в шум, а мышь и выход в нём
 * теряются. Фишки там же чуть крупнее клетки, чтобы их было видно.
 */
const fineMaze = computed(() => sizes.value.cols >= 19)
const dirs = ref<string[]>([])
const curDirs = ref(0)
const catDirs = ref<string[]>([])
const timeEnd = ref(false)
const isEnd = ref(false)
const isCatch = ref(false)
const isWin = ref<boolean | null>(null)

// Открыт список «Другие игры», в который ведёт полоса кросс-промо снизу.
const promoOpen = ref(false)

// Игрок нажал «домой» и решает, уходить ли. Прогресс при уходе сохраняется.
const exitAsk = ref(false)

// Сколько поворотов помещается в очередь: три полных ряда панели по 12.
const MAX_DIRS = 36

// Рекорд для HUD. Счёт забега — число пройденных лабиринтов (см. save).
const bestScore = computed(() =>
	gameStore.gameStats.reduce((best, stat) => Math.max(best, stat.score), 0)
)

/**
 * Забег начался: игрок нажал «Бежать». Отдельный флаг, а не `catDirs.length`,
 * которым страница гасит кнопки: кот вычерпывает `catDirs` через `shift()`, и
 * на последнем шаге длина снова становится нулевой — по ней забег выглядит
 * законченным, хотя кот ещё бежит.
 */
const runStarted = ref(false)

// Таймер стоит и под объявлением, и на выигранном уровне. Второе — отдельный баг:
// после победы таймер продолжал идти, и если игрок не жал «Run» сразу, время
// истекало, кот пробегал записанный маршрут и ловил мышь — проигрыш после победы.
// С рекламой на экране победы это стало почти гарантированным.
// Список игр таймер тоже останавливает: он открывается на планировании, где
// время уже идёт, и читать его под модалкой игрок не может. По той же причине
// его останавливает и вопрос о выходе: пока игрок решает, время не должно течь.
const timerPaused = computed(
	() =>
		adShowing.value ||
		promoOpen.value ||
		exitAsk.value ||
		isWin.value === true
)
const catRunned = ref(false)

/**
 * Можно ли открыть список игр касанием полосы кросс-промо.
 *
 * Только на этапе планирования: мышь ещё не побежала, и модалку можно открыть,
 * не отняв у игрока партию. `catRunned` добавлен потому, что кот запускается и
 * сам, по истечении времени, без нажатия «Бежать».
 */
const canOpenPromo = computed(
	() => !isEnd.value && !runStarted.value && !catRunned.value
)
const hideButton = computed(() => {
	return catDirs.value.length === 0 && level.value >= 40 && level.value < 50
})
const catSpeed = computed(() => {
	if (level.value >= 40) return 60
	if (level.value >= 30) return 90
	return 110
})
const mouseDirPause = computed(() => {
	if (level.value >= 35) return 65
	if (level.value >= 25) return 70
	if (level.value >= 20) return 75
	if (level.value >= 10) return 100
	return 150
})
const mouseStepSpeed = computed(() => {
	if (level.value >= 35) return 60
	if (level.value >= 20) return 80
	return 100
})

watch(
	() => catRunned.value,
	() => {
		if (catRunned.value) audioCont.playAudio('catIn')
	}
)

watch(
	() => level.value,
	(value) => {
		gameStore.currentLevel = value
	}
)

onMounted(async () => {
	audioCont.play('gameMusic')
	document.addEventListener('keydown', keydown)

	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}

	isStarted.value = true
	drawMaze()
})

onBeforeUnmount(() => {
	audioCont.stop('gameMusic')
	document.removeEventListener('keydown', keydown)

	if (timerID) clearTimeout(timerID)
	if (timerCatID) clearTimeout(timerCatID)
	if (catAnimId) clearTimeout(catAnimId)
	if (timerDirID) clearTimeout(timerDirID)

	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

function keydown(e: KeyboardEvent) {
	if (isWin.value && e.key === 'Enter') {
		again()
		audioCont.playAudio('click')
		return
	}
	if (isEnd.value || catDirs.value.length) return

	switch (e.key) {
		case 'ArrowLeft':
			answer('left')
			audioCont.playAudio('dir')
			break
		case 'ArrowRight':
			answer('right')
			audioCont.playAudio('dir')
			break
		case 'ArrowUp':
			answer('top')
			audioCont.playAudio('dir')
			break
		case 'ArrowDown':
			answer('bottom')
			audioCont.playAudio('dir')
			break
		case 'Backspace':
			if (dirs.value.length) {
				removeAnswer(dirs.value.length - 1)
				audioCont.playAudio('dir')
			}
			break
		case 'Enter':
			if (isWin.value) {
				again()
				audioCont.playAudio('click')
			} else if (dirs.value.length) {
				checkAnswers()
				audioCont.playAudio('dir')
				audioCont.playAudio('mouseStart')
			}
			break
	}
}

function drawMaze() {
	mazeSeed.value = Math.floor(Math.random() * 0x7fffffff)
	maze.value = getMaze(sizes.value.rows, sizes.value.cols)

	if (mazeRef.value) {
		blockSize = mazeRef.value.getBoundingClientRect().width / sizes.value.cols
	}
}

function timeend() {
	timeEnd.value = true
	if (catRunned.value) return
	nextCatDir()
	catRunned.value = true
}

function checkAnswers() {
	runStarted.value = true
	catDirs.value = [...dirs.value]
	nextDir()
}

function nextDir() {
	timerDirID = setTimeout(() => {
		if (dirs.value[curDirs.value]) {
			mouseMoveDir(DIRS[dirs.value[curDirs.value]])
		} else {
			checkWin()
		}
	}, mouseDirPause.value)
}

function nextCatDir() {
	const dir = catDirs.value.shift()
	if (dir) {
		mouseCatMoveDir(DIRS[dir])
	} else {
		animCatEnd()
	}
}

// Новичок в своём самом первом лабиринте рекламы не видит: интерстишл до
// первого прохождения — и нарушение Families Policy, и худший первый опыт.
function isFirstGame() {
	return !gameStore.gameStats.length && level.value === 0
}

// Единая точка показа полноэкранной рекламы. Колбэк закрытия используется
// только для косметики (возврат игровой музыки) и никогда для прогресса игры:
// если объявление не закроется, зависать будет нечему.
function showInterstitial(onClosed: () => void = () => {}) {
	if (Capacitor.getPlatform() !== 'android') {
		onClosed()
		return
	}

	// Если объявление показано не будет, колбэк вызывается синхронно и флаг
	// вернётся в false в том же тике — таймер даже не заметит паузы.
	adShowing.value = true

	Admob.interstitial({
		isFirst: isFirstGame(),
		onInterstitialAdClosed: () => {
			adShowing.value = false
			onClosed()
		},
	})
}

function animCatEnd() {
	isCatch.value = true
	audioCont.playAudio('catWin')

	// Проигрыш завершает забег: сохранённый прогресс сбрасывается, чтобы каждый
	// следующий старт начинался с первого лабиринта. Само level.value здесь не
	// трогаем — достигнутый уровень ещё нужен как результат для таблицы и
	// рекордов, а watch на level после проигрыша уже не сработает.
	gameStore.currentLevel = 0

	catAnimId = setTimeout(() => {
		audioCont.stop('gameMusic')
		isEnd.value = true
		isWin.value = false

		// Таблица результата уже показана — реклама поверх неё ничего не ждёт.
		showInterstitial()
	}, 1500)
}

function checkWin() {
	if (
		curPos.value[0] === sizes.value.cols - 1 &&
		curPos.value[1] === sizes.value.rows - 1
	) {
		isEnd.value = true
		isWin.value = true
		audioCont.playAudio('mouseWin')
		audioCont.stop('gameMusic')

		// Рекламы здесь нет намеренно: сначала игрок видит свой результат.
		// Объявление показывается позже, по нажатию «Бежать» в модалке — см.
		// again(). Так порядок такой: результат → Next → реклама → новый лабиринт.
	} else {
		if (catRunned.value) return
		nextCatDir()
		catRunned.value = true
	}
}

function mouseMoveDir(dir: [number, number]) {
	function moveDir(dir: [number, number]) {
		if (isCatch.value) return
		const next = nextPost(maze.value, curPos.value, dir)
		if (next) {
			moveTesei(next, dir)
			if (!isCross(maze.value, next)) {
				timerID = setTimeout(() => {
					moveDir(dir)
				}, mouseStepSpeed.value)
			} else {
				curDirs.value += 1
				nextDir()
			}
		} else {
			curDirs.value += 1
			nextDir()
		}
	}

	moveDir(dir)
}

function mouseCatMoveDir(dir: [number, number]) {
	function moveDir(dir: [number, number]) {
		if (isCatch.value) return
		const next = nextPost(maze.value, curCatPos.value, dir)
		if (next) {
			moveCat(next, dir)

			if (next[0] === curPos.value[0] && next[1] === curPos.value[1]) {
				animCatEnd()
			} else {
				if (!isCross(maze.value, next)) {
					timerCatID = setTimeout(() => {
						moveDir(dir)
					}, catSpeed.value)
				} else {
					nextCatDir()
				}
			}
		} else {
			nextCatDir()
		}
	}

	moveDir(dir)
}

function moveTesei(pos: [number, number], dir: [number, number]) {
	currentStyle.value = `translate(${pos[0] * blockSize}px, ${
		pos[1] * blockSize
	}px) rotateZ(${dirGrad[dir.join('')]}deg)`
	curPos.value = pos
}

function getReverseStyle(style: string) {
	return `rotateZ(${-1 * parseInt(`${style.split('(').pop()}`)}deg)`
}

function moveCat(pos: [number, number], dir: [number, number]) {
	currentCatStyle.value = `translate(${pos[0] * blockSize}px, ${
		pos[1] * blockSize
	}px) rotateZ(${dirGrad[dir.join('')]}deg)`
	curCatPos.value = pos
}

function answer(option: string) {
	dirs.value.push(option)
}

function removeAnswer(index: number) {
	dirs.value.splice(index, 1)
}

function save() {
	gameStore.recordGameStat(level.value)
	nextTick(() => {
		pageStore.toBackLink()
	})
}

/**
 * Уход в меню по подтверждённому запросу.
 *
 * Прогресс не трогаем намеренно: `gameStore.currentLevel` уже держит текущий
 * лабиринт (его пишет watch на level), и именно он даст в меню «Продолжить».
 * Обнуляет прогресс только проигрыш — см. animCatEnd.
 */
function leaveGame() {
	exitAsk.value = false
	audioCont.playAudio('click')
	pageStore.toBackLink()
}

function reset() {
	catRunned.value = false
	runStarted.value = false
	curPos.value = [0, 0]
	curCatPos.value = [0, 0]
	currentStyle.value = `translate(0px, 0px) rotateZ(0deg)`
	currentCatStyle.value = `translate(0px, 0px) rotateZ(0deg)`
	dirs.value = []
	curDirs.value = 0
	catDirs.value = []
	isEnd.value = false
	isWin.value = null
}

/**
 * Каждый N-й пройденный лабиринт зарабатывает полноэкранное объявление.
 * Само решение о показе всё равно за Admob: там ещё частотный кап и первый
 * заход новичка, так что «заработал» не значит «покажется».
 */
function earnsInterstitial() {
	return (level.value + 1) % 4 === 0
}

/** Нажатие «Бежать» уже обрабатывается: второе за тот же переход игнорируем. */
const advancing = ref(false)

/**
 * Нажатие «Бежать» в модалке результата.
 *
 * Порядок: игрок посмотрел результат → нажал «Бежать» → объявление → новый
 * лабиринт. Новый лабиринт стартует из колбэка закрытия, но зависнуть на нём
 * нельзя: Admob вызывает колбэк во всех отказных ветках сразу (реклама
 * выключена, не загрузилась, не прошла частотный кап, ошибка показа), а на
 * случай потерянного события закрытия там же стоит страхующий таймер.
 */
function again() {
	if (advancing.value) return
	advancing.value = true

	if (!earnsInterstitial()) {
		nextRound()
		return
	}

	showInterstitial(nextRound)
}

function nextRound() {
	advancing.value = false

	if (timerID) clearTimeout(timerID)
	if (timerCatID) clearTimeout(timerCatID)
	if (timerDirID) clearTimeout(timerDirID)
	if (catAnimId) clearTimeout(catAnimId)
	reset()
	isStarted.value = false

	level.value += 1
	drawMaze()
	isStarted.value = true
	audioCont.play('gameMusic')
}
</script>

<template>
	<div class="page play-page">
		<!-- Лужайка во весь экран: колонка игры узкая, а на планшете фон должен
		     закрывать и поля по бокам. -->
		<div class="play-page__bg" aria-hidden="true"></div>

		<div class="page__head">
			<BackLink confirm @request="exitAsk = true" />
			<TimerItem
				class="time"
				:level="level"
				:show-cat="!catRunned"
				:paused="timerPaused"
				@timeend="timeend"
			/>
		</div>

		<!-- Где игрок в забеге и сколько надо, чтобы побить рекорд. -->
		<div class="hud">
			<div class="hud__chip hud__chip--level">
				{{ $t('continueFrom', { level: level + 1 }) }}
			</div>
			<div v-if="bestScore > 0" class="hud__chip hud__chip--best">
				<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
				{{ $t('best', { score: bestScore }) }}
			</div>
		</div>

		<div v-if="maze" class="page__maze-container">
			<div class="container maze-container">
				<div ref="mazeRef" class="maze" :class="{ 'maze--fine': fineMaze }">
					<div
						v-for="(mazeRow, mazeRowInd) in maze"
						:key="mazeRowInd"
						class="maze__row"
					>
						<div
							v-for="(col, colInd) in mazeRow"
							:key="colInd"
							:class="{
								cell: col,
								[wallClass(mazeRowInd, colInd)]: col,
								start: mazeRowInd === 0 && colInd === 0,
								end:
									mazeRowInd === maze.length - 1 &&
									colInd === maze[mazeRowInd].length - 1,
							}"
							class="maze__col"
						>
							<div
								v-show="mazeRowInd === 0 && colInd === 0"
								class="tesei"
								:style="{ transform: currentStyle }"
							>
								<img
									:style="{ transform: getReverseStyle(currentStyle) }"
									src="@/assets/img/v2/token-mouse.webp"
									alt="mouse"
								/>
							</div>
							<div
								v-show="mazeRowInd === 0 && colInd === 0"
								class="cat"
								:style="{
									transform: currentCatStyle,
									opacity: catRunned ? 1 : 0,
								}"
							>
								<img
									:style="{ transform: getReverseStyle(currentCatStyle) }"
									src="@/assets/img/v2/token-cat.webp"
									alt="cat"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="dirs">
				<!--
					Пустая панель учит главному правилу: команда тратится не на
					каждом шаге, а только на развилке. Без этого новичок жмёт
					стрелку на каждую клетку пути и проигрывает, не поняв почему.
				-->
				<div v-if="!dirs.length" class="dirs__hint">{{ $t('dirsHint') }}</div>
				<div v-else class="dirs__count">{{ dirs.length }}/{{ MAX_DIRS }}</div>
				<div class="dirs__in">
					<div
						v-for="(dir, dirInd) in dirs"
						:key="dirInd"
						:class="{
							[dir]: true,
							anim: catDirs.length && curDirs == dirInd,
							hide: hideButton,
						}"
						class="dirs__item"
						@click="removeAnswer(dirInd)"
					>
						<svg viewBox="0 0 24 24"><path d="M3.5 9.5h8.5V4.5l8.5 7.5-8.5 7.5v-5H3.5z" /></svg>
					</div>
				</div>
			</div>

			<div class="commands">
				<button
					v-for="d in ['left', 'right', 'top', 'bottom']"
					:key="d"
					:class="[d, { disabled: isEnd || dirs.length >= MAX_DIRS || catDirs.length }]"
					class="commands__arrow"
					@click="answer(d), audioCont.playAudio('dir')"
				>
					<svg viewBox="0 0 24 24"><path d="M3.5 9.5h8.5V4.5l8.5 7.5-8.5 7.5v-5H3.5z" /></svg>
				</button>
				<button
					:class="{ disabled: isEnd || !dirs.length || catDirs.length }"
					class="commands__undo"
					@click="removeAnswer(dirs.length - 1), audioCont.playAudio('dir')"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
				</button>
				<button
					:class="{ disabled: isEnd || !dirs.length || catDirs.length }"
					class="commands__run"
					@click="
						checkAnswers(),
							audioCont.playAudio('dir'),
							audioCont.playAudio('mouseStart')
					"
				>
					<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
				</button>
			</div>
		</div>

		<div v-if="isWin" class="next-modal__shade" aria-hidden="true"></div>
		<div v-if="isWin" class="next-modal">
			<img class="next-modal__mouse" src="@/assets/img/v2/mouse-win.webp" alt="" />
			<div class="next-modal__level">
				<div>{{ $t('nextMaze') }}</div>
				<div>{{ level + 2 }}</div>
			</div>
			<UiButton
				ref="button"
				class="next-modal__btn"
				@click="again(), audioCont.playAudio('click')"
			>
				{{ $t('run') }}
			</UiButton>
		</div>

		<ResultTable
			v-if="isCatch && isEnd"
			:result="level"
			@close="save(), audioCont.playAudio('click')"
		/>

		<!--
			Полоса под кнопками: пока AdMob не отдал баннер, в ней стоит одна из
			наших игр, а не пустое место. Касание ведёт в список игр внутри
			приложения — наружу из детского приложения одним касанием уходить
			нельзя, и только на планировании, чтобы не отнять партию.
		-->
		<AdSlot
			:interactive="canOpenPromo"
			@open=";(promoOpen = true), audioCont.playAudio('click')"
		/>

		<OtherGames
			v-if="promoOpen"
			@close=";(promoOpen = false), audioCont.playAudio('click')"
		/>

		<ConfirmExit
			v-if="exitAsk"
			@confirm="leaveGame"
			@cancel=";(exitAsk = false), audioCont.playAudio('click')"
		/>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.play-page__bg {
	position: fixed;
	inset: 0;
	z-index: -1;
	background: #6fbf3a url('@/assets/img/v2/game-bg.webp') center / cover no-repeat;
}

.page {
	height: 100dvh;
	/*
	   Низ страницы отодвинут на настоящую высоту объявления, а не на
	   фиксированные 65px, как было раньше: adaptive-баннер на планшете
	   вырастает до 90dp, и ряд кнопок-стрелок уходил под него — тап попадал в
	   рекламу. Ровно это Google и называет «ads interfere with app use» и
	   «inadvertent clicks». Высоту публикует admob.ts через --ad-slot, лишние
	   8px — зазор, чтобы палец не задевал объявление у самой кромки кнопок.
	*/
	padding: 10px 15px calc(var(--ad-band) + 8px);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	max-width: 480px;
	margin: 0 auto;

	&__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		max-width: 480px;
	}
}

.hud {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	margin-top: 12px;

	&__chip {
		@include wood(10px);
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px 6px;
		font-size: 16px;
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: $cream;
		white-space: nowrap;

		&--level {
			font-size: 18px;
		}

		/* Рекорд — на каменной плашке с короной, как на макете: отличается от
		   текущего лабиринта и материалом, и цветом. */
		&--best {
			background: linear-gradient(180deg, #d6d0c3, $stone);
			border-color: $stoneEdge;
			box-shadow:
				inset 0 -3px 0 rgba(0, 0, 0, 0.12),
				0 4px 0 $stoneEdge;
			color: $ink;

			svg {
				width: 20px;
				height: 20px;
				fill: $sun;
				stroke: $sunEdge;
				stroke-width: 1.6;
				stroke-linejoin: round;
			}
		}
	}
}

.maze-container {
	margin: 14px 0 18px;
	width: 100%;
}

/*
   Каменный бортик поля нарисован тенями, а не border/padding: размер клетки
   считается от ширины .maze (blockSize), и рамка внутри сдвинула бы мышь.
*/
.maze {
	margin: 0 auto;
	width: 100%;
	aspect-ratio: 1;
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	grid-template-rows: repeat(v-bind(ylen), minmax(0, 1fr));
	background: #f0d7ad;
	border-radius: 4px;
	box-shadow:
		0 0 0 4px #d8d2c4,
		0 0 0 6px $stoneEdge,
		0 7px 0 6px $stoneEdge;

	&__row {
		display: grid;
		grid-template-columns: repeat(v-bind(xlen), minmax(0, 1fr));
		grid-template-rows: repeat(1, minmax(0, 1fr));
	}

	&__col {
		position: relative;
		box-sizing: border-box;
		background: url('@/assets/img/v2/tile-path.webp') center / 100% 100%;

		&.cell {
			z-index: 1;

			&.stone.v1 {
				background-image: url('@/assets/img/v2/tile-stone-1.webp');
			}
			&.stone.v2 {
				background-image: url('@/assets/img/v2/tile-stone-2.webp');
			}
			&.hedge {
				background-color: #2f6b12;
			}
			&.hedge.v1 {
				background-image: url('@/assets/img/v2/tile-hedge-1.webp');
			}
			&.hedge.v2 {
				background-image: url('@/assets/img/v2/tile-hedge-2.webp');
			}
		}

		/* Старт подсвечен: отсюда побежит мышь. Ячейка старта выше остальных,
		   потому что мышь и кот лежат внутри неё и ездят по полю сдвигом. */
		&.start {
			z-index: 30;
			box-shadow: inset 0 0 0 2px rgba(255, 196, 0, 0.9);
		}

		&.end {
			background-image: url('@/assets/img/v2/tile-exit.webp');
			box-shadow: inset 0 0 0 2px rgba(255, 196, 0, 0.9);
		}

		.tesei,
		.cat {
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			transform-origin: center;
			display: flex;
			justify-content: center;
			align-items: center;
			transition: transform 0.12s linear;
		}

		.tesei img,
		.cat img {
			width: 96%;
			height: 96%;
			filter: drop-shadow(0 2px 0 rgba(60, 30, 5, 0.35));
			transition: transform 0.12s linear;
		}
	}

	/* Крупные лабиринты: плоские тайлы тех же цветов и фишки крупнее клетки. */
	&--fine {
		.maze__col {
			background: #f0d7ad;

			&.cell {
				background: #8d939c;
				box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);

				&.hedge {
					background: #408316;
				}
			}

			&.start {
				background: #ffe08a;
			}

			&.end {
				background: #6b3a12;
				border-radius: 50%;
				box-shadow: 0 0 0 2px #ffc400;
			}

			.tesei img,
			.cat img {
				width: 170%;
				height: 170%;
				max-width: none;
				filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.5));
			}
		}
	}
}

/*
   Квадрат лабиринта берёт ширину экрана, но не больше, чем осталось по высоте.
   Иначе на коротких телефонах (360x640) ряд стрелок уезжал под рекламную
   полосу. На обычных экранах основа равна ширине, и ничего не меняется.
   Без поддержки container-единиц остаётся прежняя раскладка по ширине.
   Блок стоит после .maze: иначе его width: 100% перебил бы ограничение.
*/
@supports (container-type: size) {
	.page__maze-container {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;

		.dirs,
		.commands {
			flex-shrink: 0;
		}
	}

	.maze-container {
		container-type: size;
		// Ширина квадрата: экран минус поля страницы (2x15) и .container (2x10).
		flex: 0 1 min(calc(100vw - 50px), 430px);
		min-height: 0;
	}

	.maze {
		width: min(100cqw, 100cqh);
	}
}

/* Очередь команд: деревянная рама, кремовое поле, фишки-стрелки. */
.dirs {
	position: relative;
	height: 14vh;
	min-height: 84px;
	margin-bottom: 16px;
	@include wood(16px);

	&::before {
		content: '';
		position: absolute;
		inset: 5px;
		border-radius: 10px;
		background: $cream;
		box-shadow: inset 0 2px 0 rgba(90, 50, 15, 0.18);
	}

	&__hint {
		position: absolute;
		inset: 5px;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 18px;
		text-align: center;
		font-size: 15px;
		font-weight: 600;
		line-height: 1.35;
		color: rgba(74, 42, 16, 0.75);
		pointer-events: none;
	}

	&__count {
		position: absolute;
		right: 14px;
		bottom: 9px;
		font-size: 12px;
		font-weight: 700;
		color: rgba(74, 42, 16, 0.55);
		pointer-events: none;
	}

	&__in {
		position: absolute;
		inset: 5px;
		padding: 6px 8px 18px;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 5px 3px;
		align-content: start;
		overflow-y: auto;
	}

	&__item {
		cursor: pointer;
		aspect-ratio: 1;
		max-width: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fffaf0;
		border: 1.5px solid $creamEdge;
		border-radius: 6px;
		box-shadow: 0 2px 0 $creamEdge;
		box-sizing: border-box;

		/* Стрелка в svg смотрит вправо; поворачиваем её саму, а не фишку,
		   чтобы тень фишки оставалась снизу. */
		svg {
			display: block;
			width: 78%;
			height: 78%;
			fill: $leaf;
			stroke: $leafEdge;
			stroke-width: 1.4;
			stroke-linejoin: round;
		}

		&.left svg {
			transform: rotate(180deg);
		}
		&.top svg {
			transform: rotate(-90deg);
		}
		&.bottom svg {
			transform: rotate(90deg);
		}

		/* Команда, которую мышь выполняет сейчас. */
		&.anim {
			background: #fff1b8;
			border-color: $sunEdge;
			box-shadow: 0 2px 0 $sunEdge;
			animation: opac 0.3s infinite linear;
		}

		&.hide {
			opacity: 0;
			animation: hide 0.8s 1 linear;
		}
	}
}

@keyframes opac {
	0% {
		opacity: 0.35;
	}
	100% {
		opacity: 1;
	}
}

@keyframes hide {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

/* Кнопки команд: стрелки жёлтые, отмена синяя, запуск зелёный. */
.commands {
	display: flex;
	justify-content: space-between;
	gap: 7px;
	padding-bottom: 6px;

	button {
		flex: 1 1 0;
		max-width: 60px;
		aspect-ratio: 1;
		padding: 0 0 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		outline: none;
		-webkit-tap-highlight-color: transparent;

		svg {
			display: block;
			width: 58%;
			height: 58%;
		}

		&.disabled {
			pointer-events: none;
			opacity: 0.45;
			filter: saturate(0.6);
		}
	}

	&__arrow {
		@include chunky(linear-gradient(180deg, #ffd65a, #ffb81c), #b5730b, 5px, 14px);

		svg {
			fill: #7a3f0c;
		}

		&.left svg {
			transform: rotate(180deg);
		}
		&.top svg {
			transform: rotate(-90deg);
		}
		&.bottom svg {
			transform: rotate(90deg);
		}
	}

	&__undo {
		@include chunky(linear-gradient(180deg, #4d9ef2, $sky), $skyEdge, 5px, 14px);
		color: #fff;
	}

	&__run {
		@include chunky(linear-gradient(180deg, #84d64a, $leaf), $leafEdge, 5px, 14px);
		color: #fff;

		svg {
			fill: #fff;
		}
	}
}

/* Победа: затемнение поверх поля, мышь с сыром, номер следующего лабиринта. */
.next-modal__shade {
	position: fixed;
	inset: 0;
	z-index: 29;
	background: rgba(20, 45, 10, 0.55);
}

.next-modal {
	position: absolute;
	z-index: 30;
	top: 42%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 90vw;
	max-width: 420px;

	&__mouse {
		width: 46%;
		margin-bottom: -6px;
		filter: drop-shadow(0 6px 0 rgba(30, 20, 5, 0.35));
		animation: winHop 1.2s ease-in-out infinite;
	}

	&__level {
		text-align: center;
		line-height: 1.1;
		margin-bottom: 22px;

		div {
			&:first-child {
				font-size: 30px;
				font-weight: 800;
				text-transform: uppercase;
				@include outlined(#fff, $leafEdge);
				margin-bottom: 8px;
			}

			&:last-child {
				font-size: 64px;
				font-weight: 900;
				@include outlined($sun, $woodEdge);
			}
		}
	}
}

@keyframes winHop {
	0%,
	100% {
		transform: translateY(0) rotate(-2deg);
	}
	50% {
		transform: translateY(-12px) rotate(2deg);
	}
}
</style>
