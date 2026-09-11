<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { Capacitor } from '@capacitor/core'

import IconRightArrow from '@/assets/img/right-arrow.svg'

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
const dirs = ref<string[]>([])
const curDirs = ref(0)
const catDirs = ref<string[]>([])
const timeEnd = ref(false)
const isEnd = ref(false)
const isCatch = ref(false)
const isWin = ref<boolean | null>(null)

// Открыт список «Другие игры», в который ведёт полоса кросс-промо снизу.
const promoOpen = ref(false)

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
// время уже идёт, и читать его под модалкой игрок не может.
const timerPaused = computed(
	() => adShowing.value || promoOpen.value || isWin.value === true
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
		<div class="page__head">
			<BackLink />
			<TimerItem
				class="time"
				:level="level"
				:show-cat="!catRunned"
				:paused="timerPaused"
				@timeend="timeend"
			/>
		</div>

		<div v-if="maze" class="page__maze-container">
			<div class="container maze-container">
				<div ref="mazeRef" class="maze">
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
									src="@/assets/img/mouse.png"
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
									src="@/assets/img/cat.png"
									alt="cat"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="dirs">
				<div class="dirs__in">
					<div
						v-for="(dir, dirInd) in dirs"
						:key="dir"
						:class="{
							[dir]: true,
							anim: catDirs.length && curDirs == dirInd,
							hide: hideButton,
						}"
						class="dirs__item"
						@click="removeAnswer(dirInd)"
					>
						<IconRightArrow />
					</div>
				</div>
			</div>

			<div class="commands">
				<button
					:class="{ disabled: isEnd || dirs.length === 36 || catDirs.length }"
					@click="answer('left'), audioCont.playAudio('dir')"
				></button>
				<button
					:class="{ disabled: isEnd || dirs.length === 36 || catDirs.length }"
					@click="answer('right'), audioCont.playAudio('dir')"
				></button>
				<button
					:class="{ disabled: isEnd || dirs.length === 36 || catDirs.length }"
					@click="answer('top'), audioCont.playAudio('dir')"
				></button>
				<button
					:class="{ disabled: isEnd || dirs.length === 36 || catDirs.length }"
					@click="answer('bottom'), audioCont.playAudio('dir')"
				></button>
				<button
					:class="{ disabled: isEnd || !dirs.length || catDirs.length }"
					@click="removeAnswer(dirs.length - 1), audioCont.playAudio('dir')"
				></button>
				<button
					:class="{ disabled: isEnd || !dirs.length || catDirs.length }"
					@click="
						checkAnswers(),
							audioCont.playAudio('dir'),
							audioCont.playAudio('mouseStart')
					"
				></button>
			</div>
		</div>

		<div v-if="isWin" class="next-modal">
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
	</div>
</template>

<style lang="scss" scoped>
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

.maze-container {
	margin: 10px 0 15px;
	width: 100%;
}

.maze {
	margin: 0 auto;
	width: 100%;
	aspect-ratio: 1;
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	grid-template-rows: repeat(v-bind(ylen), minmax(0, 1fr));

	&__row {
		display: grid;
		grid-template-columns: repeat(v-bind(xlen), minmax(0, 1fr));
		grid-template-rows: repeat(1, minmax(0, 1fr));
	}

	&__col {
		position: relative;
		box-sizing: border-box;
		background-image: url('@/assets/img/green-bg.png');

		&.cell {
			background-color: #000;
			background-image: url('@/assets/img/grey-bg.png');
			box-shadow: 0px 0px 5px 0 rgba(0, 0, 0, 0.5);
			z-index: 20;

			&::before {
				content: '';
				position: absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
				background: rgba(0, 0, 0, 0.1);
			}
		}

		&.start {
			z-index: 12;
		}

		&.end {
			position: relative;

			&::before {
				content: '';
				position: absolute;
				top: 2px;
				left: 2px;
				right: 2px;
				bottom: 2px;
				border-radius: 50%;
				background: #377220;
			}
		}

		.tesei {
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

		.tesei img {
			width: 100%;
			height: 95%;
			transition: transform 0.12s linear;
		}

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

		.cat img {
			width: 100%;
			height: 95%;
			transition: transform 0.12s linear;
		}
	}
}

.dirs {
	position: relative;
	height: 14vh;
	margin-bottom: 15px;
	background: #d5ad51;
	border-radius: 10px;

	&__in {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		max-width: 100%;
		padding: 2px 8px;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 5px 0;
		align-items: flex-start;
		overflow-y: auto;
	}

	&__item {
		cursor: pointer;
		width: 20px;
		transform-origin: center;

		&.left {
			transform: rotateZ(180deg);
		}

		&.right {
			transform: rotateZ(0deg);
		}

		&.top {
			transform: rotateZ(-90deg);
		}

		&.bottom {
			transform: rotateZ(90deg);
		}

		svg {
			display: block;
			fill: rgba(102, 62, 26, 0.4);
		}

		&.anim {
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
		opacity: 0;
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

.commands {
	display: flex;
	justify-content: space-between;
	gap: 5px;

	button {
		flex-grow: 1;
		max-width: 52px;
		aspect-ratio: 1;
		cursor: pointer;
		border-radius: 15px;
		border: none;
		outline: none;
		cursor: pointer;
		background-size: contain;
		background-color: transparent;

		&.disabled {
			pointer-events: none;
			opacity: 0.5;
		}

		&:nth-child(1) {
			background-image: url('@/assets/img/left.png');
		}

		&:nth-child(2) {
			background-image: url('@/assets/img/right.png');
		}

		&:nth-child(3) {
			background-image: url('@/assets/img/top.png');
		}

		&:nth-child(4) {
			background-image: url('@/assets/img/bottom.png');
		}

		&:nth-child(5) {
			background-image: url('@/assets/img/return.png');
		}

		&:nth-child(6) {
			background-image: url('@/assets/img/start.png');
		}
	}
}

.next-modal {
	position: absolute;
	z-index: 30;
	top: 38%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;

	&__level {
		color: rgb(254, 206, 13);
		text-align: center;
		letter-spacing: 3px;
		// См. .privacy в StartPage: локализованный заголовок («Новый лабиринт»)
		// вдвое длиннее «Next Maze» и на узких экранах должен переноситься.
		max-width: 90vw;
		line-height: 1.15;
		-webkit-text-stroke: 2px rgb(45, 128, 0);
		text-stroke: 2px rgb(45, 128, 0);

		div {
			&:first-child {
				font-size: 32px;
				margin-bottom: 20px;
			}

			&:last-child {
				font-size: 52px;
				font-weight: 400;
				margin-bottom: 25px;
			}
		}
	}

	&__btn {
		padding: 10px 15px;
		cursor: pointer;
		box-shadow: 0 5px 15px 0 rgba(0, 0, 0, 0.3);
	}
}
</style>
