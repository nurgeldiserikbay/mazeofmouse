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
import {
	getGridSizeByLevel,
	CHAPTER_SIZE,
	chapterOf,
	checkpointOf,
	starsFor,
} from './helpers'
import { TUTORIAL } from './tutorial'
import { session, QUIET_START_MAZES } from '@/utils/session'

let timerID: ReturnType<typeof setInterval>
let timerDirID: ReturnType<typeof setInterval>
let timerCatID: ReturnType<typeof setInterval>
let catAnimId: ReturnType<typeof setInterval>
const gameStore = useGameStore()
const pageStore = usePageStore()
const audioCont = useAudio()

const mazeRef = ref()
const level = ref(gameStore.currentLevel)

/**
 * Шаг обучения или null, если играем по-настоящему.
 *
 * Обучение видит только новичок: кто уже играл (есть рекорды) или вернулся к
 * незаконченному забегу, правило знает. Флаг tutorialPassed на диске раньше
 * никто не поднимал, поэтому одного его мало — старые игроки увидели бы
 * обучение заново.
 */
const tutorialStep = ref<number | null>(
	gameStore.tutorialPassed ||
		gameStore.gameStats.length > 0 ||
		gameStore.currentLevel > 0
		? null
		: 0
)
const tutorial = computed(() =>
	tutorialStep.value === null ? null : TUTORIAL[tutorialStep.value]
)
const isLastTutorial = computed(
	() => tutorialStep.value === TUTORIAL.length - 1
)

const sizes = computed(() => {
	if (tutorial.value) {
		return {
			rows: tutorial.value.maze.length,
			cols: tutorial.value.maze[0].length,
		}
	}
	return getGridSizeByLevel(level.value)
})
let blockSize = 30
const xlen = computed(() => sizes.value.cols)
const ylen = computed(() => sizes.value.rows)
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
// Фишки только сдвигаются по полю и не поворачиваются: мышь и кот нарисованы
// мордочками анфас. Раньше их крутили по направлению бега и тут же
// откручивали картинку обратно — во время анимации поворота два вращения
// расходились, и мордочка кувыркалась.
const currentStyle = ref(`translate(0px, 0px)`)
const currentCatStyle = ref(`translate(0px, 0px)`)
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

/**
 * Какую кнопку обучение ждёт следующей: стрелку из сценария или 'run'.
 * Остальные кнопки на это время неактивны — игрок не может сбиться.
 */
const coachExpect = computed(() => {
	const step = tutorial.value
	if (!step || runStarted.value || isEnd.value) return null
	return dirs.value.length < step.dirs.length
		? step.dirs[dirs.value.length]
		: 'run'
})

/**
 * Путь мыши, нарисованный на поле стрелками: куда она побежит по уже
 * набранным командам (бледно) и по той, что ждёт обучение (ярко).
 * Считается тем же правилом, что и настоящий бег: прямо до стены или развилки.
 */
const ghost = computed(() => {
	const cells: Record<string, { dir: string; next: boolean }> = {}
	if (!tutorial.value || runStarted.value || isEnd.value) return cells

	const plan = [...dirs.value]
	const want = coachExpect.value
	if (want && want !== 'run') plan.push(want)

	let pos: [number, number] = [0, 0]
	plan.forEach((dir, index) => {
		let next = nextPost(maze.value, pos, DIRS[dir])
		while (next) {
			pos = next
			cells[`${pos[0]},${pos[1]}`] = {
				dir,
				next: index === dirs.value.length,
			}
			if (isCross(maze.value, pos)) break
			next = nextPost(maze.value, pos, DIRS[dir])
		}
	})
	return cells
})

function arrowDisabled(d: string) {
	if (isEnd.value || dirs.value.length >= MAX_DIRS || catDirs.value.length) {
		return true
	}
	return coachExpect.value !== null && coachExpect.value !== d
}

/**
 * Таймер пересоздаётся ключом на каждый новый заход в лабиринт: по смене
 * уровня он перезапускался и раньше, но «продолжить» и выход из обучения
 * уровень не меняют.
 */
const timerRef = ref<InstanceType<typeof TimerItem>>()
const roundKey = ref(0)

/** Звёзды за только что пройденный лабиринт и «глава закончена». */
const wonStars = ref(0)
const chapterDone = ref(false)

/** Лабиринт внутри главы (0..CHAPTER_SIZE-1) — для полоски прогресса в HUD. */
const chapterStep = computed(() => level.value % CHAPTER_SIZE)

/**
 * Предложение «ещё попытка» после поимки. Один раз на лабиринт, только когда
 * объявление за награду есть (на Android) — без него кнопка обещала бы то,
 * чего не будет. В вебе рекламы нет вовсе, там попытка просто даётся.
 */
const offerContinue = ref(false)
const continuedThisMaze = ref(false)
function canOfferContinue() {
	if (continuedThisMaze.value || tutorial.value) return false
	return Capacitor.getPlatform() !== 'android' || Admob.rewardedAvailable
}

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
		tutorial.value !== null ||
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

	if (coachExpect.value) {
		const want: Record<string, string> = {
			ArrowLeft: 'left',
			ArrowRight: 'right',
			ArrowUp: 'top',
			ArrowDown: 'bottom',
			Enter: 'run',
		}
		if (want[e.key] !== coachExpect.value) return
	}

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
	maze.value = tutorial.value
		? tutorial.value.maze.map((row) => [...row])
		: getMaze(sizes.value.rows, sizes.value.cols)

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

	// Прогресс здесь не трогаем: игрок может взять ещё попытку. Откат к началу
	// главы — только когда он от неё отказался (см. save).
	catAnimId = setTimeout(() => {
		audioCont.stop('gameMusic')
		isEnd.value = true
		isWin.value = false
		offerContinue.value = canOfferContinue()
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

		if (!tutorial.value) {
			wonStars.value = starsFor(timerRef.value?.fraction ?? 0)
			gameStore.setStars(level.value, wonStars.value)
			session.mazesWon += 1
			Admob.gameFinished()
			chapterDone.value = (level.value + 1) % CHAPTER_SIZE === 0
		} else {
			wonStars.value = 3
		}
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
			moveTesei(next)
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
			moveCat(next)

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

function moveTesei(pos: [number, number]) {
	currentStyle.value = `translate(${pos[0] * blockSize}px, ${pos[1] * blockSize}px)`
	curPos.value = pos
}

function moveCat(pos: [number, number]) {
	currentCatStyle.value = `translate(${pos[0] * blockSize}px, ${pos[1] * blockSize}px)`
	curCatPos.value = pos
}

function answer(option: string) {
	dirs.value.push(option)
}

function removeAnswer(index: number) {
	dirs.value.splice(index, 1)
}

/**
 * Игрок закрыл таблицу результата после проигрыша.
 *
 * Проигрыш откатывает к началу главы, а не к первому лабиринту: раньше один
 * промах на 15-м уровне стоил всего пути, и дети на этом бросали игру.
 * Полноэкранная реклама — здесь, на уходе в меню, а не поверх счёта сразу
 * после поимки: это естественная пауза, а не наказание за проигрыш.
 */
function save() {
	// Реклама решается ДО записи результата: isFirstGame() смотрит на таблицу
	// результатов, и после записи первый проигрыш новичка уже не считался бы
	// первой партией. Гейт тот же, что у again(): первые лабиринты сессии — без
	// полноэкранной рекламы.
	Admob.gameFinished()
	if (!inQuietStart()) showInterstitial()
	gameStore.recordGameStat(level.value)
	gameStore.currentLevel = checkpointOf(level.value)
	nextTick(() => {
		pageStore.toBackLink()
	})
}

/** «Ещё попытка»: тот же лабиринт заново, с полным временем. */
async function continueRun() {
	if (advancing.value) return
	advancing.value = true

	let granted = true
	if (Capacitor.getPlatform() === 'android') {
		adShowing.value = true
		granted = await Admob.rewarded()
		adShowing.value = false
	}
	advancing.value = false

	offerContinue.value = false
	if (!granted) return

	continuedThisMaze.value = true
	restartRound()
}

function declineContinue() {
	offerContinue.value = false
	audioCont.playAudio('click')
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
	currentStyle.value = `translate(0px, 0px)`
	currentCatStyle.value = `translate(0px, 0px)`
	dirs.value = []
	curDirs.value = 0
	catDirs.value = []
	isEnd.value = false
	isWin.value = null
	isCatch.value = false
	offerContinue.value = false
	wonStars.value = 0
	chapterDone.value = false
}

/** Очистить таймеры и начать текущий лабиринт сначала. */
function restartRound() {
	if (timerID) clearTimeout(timerID)
	if (timerCatID) clearTimeout(timerCatID)
	if (timerDirID) clearTimeout(timerDirID)
	if (catAnimId) clearTimeout(catAnimId)
	reset()
	roundKey.value += 1
	audioCont.play('gameMusic')
}

/**
 * Каждый N-й пройденный лабиринт зарабатывает полноэкранное объявление.
 * Само решение о показе всё равно за Admob: там ещё частотный кап и первый
 * заход новичка, так что «заработал» не значит «покажется».
 */
function earnsInterstitial() {
	if (inQuietStart()) return false
	return (level.value + 1) % 4 === 0
}

/** Первые лабиринты сессии — без полноэкранной рекламы: игрок только сел. */
function inQuietStart() {
	return session.mazesWon <= QUIET_START_MAZES
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

	// Учебные лабиринты: без рекламы и без роста уровня.
	if (tutorial.value) {
		if (isLastTutorial.value) {
			tutorialStep.value = null
			gameStore.tutorialPassed = true
		} else {
			tutorialStep.value = (tutorialStep.value ?? 0) + 1
		}
		nextRound(false)
		return
	}

	if (!earnsInterstitial()) {
		nextRound()
		return
	}

	showInterstitial(() => nextRound())
}

function nextRound(levelUp = true) {
	advancing.value = false

	if (timerID) clearTimeout(timerID)
	if (timerCatID) clearTimeout(timerCatID)
	if (timerDirID) clearTimeout(timerDirID)
	if (catAnimId) clearTimeout(catAnimId)
	reset()
	isStarted.value = false

	if (levelUp) level.value += 1
	continuedThisMaze.value = false
	roundKey.value += 1
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
				ref="timerRef"
				:key="roundKey"
				class="time"
				:level="level"
				:show-cat="!catRunned"
				:paused="timerPaused"
				@timeend="timeend"
			/>
		</div>

		<!-- Где игрок в забеге и сколько надо, чтобы побить рекорд. -->
		<div class="hud">
			<div v-if="tutorial" class="hud__chip hud__chip--steps">
				<span
					v-for="(_, i) in TUTORIAL"
					:key="i"
					:class="{ on: i <= (tutorialStep ?? 0) }"
				></span>
			</div>
			<div v-else class="hud__chip hud__chip--level">
				{{ $t('continueFrom', { level: level + 1 }) }}
				<!-- Прогресс главы: до конца главы и до новой контрольной точки. -->
				<span class="hud__pips">
					<i
						v-for="i in CHAPTER_SIZE"
						:key="i"
						:class="{ done: i - 1 < chapterStep, now: i - 1 === chapterStep }"
					></i>
				</span>
			</div>
			<div v-if="bestScore > 0 && !tutorial" class="hud__chip hud__chip--best">
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
								mark:
									!!tutorial?.mark &&
									!runStarted &&
									tutorial.mark[0] === colInd &&
									tutorial.mark[1] === mazeRowInd,
								end:
									mazeRowInd === maze.length - 1 &&
									colInd === maze[mazeRowInd].length - 1,
							}"
							class="maze__col"
						>
							<span
								v-if="ghost[`${colInd},${mazeRowInd}`]"
								class="ghost"
								:class="[
									ghost[`${colInd},${mazeRowInd}`].dir,
									{ next: ghost[`${colInd},${mazeRowInd}`].next },
								]"
							>
								<svg viewBox="0 0 24 24"><path d="M3.5 9.5h8.5V4.5l8.5 7.5-8.5 7.5v-5H3.5z" /></svg>
							</span>
							<div
								v-show="mazeRowInd === 0 && colInd === 0"
								class="tesei"
								:style="{ transform: currentStyle }"
							>
								<img
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
				<div v-if="!dirs.length && !tutorial" class="dirs__hint">{{ $t('dirsHint') }}</div>
				<div v-else-if="dirs.length" class="dirs__count">{{ dirs.length }}/{{ MAX_DIRS }}</div>
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
					:class="[d, { disabled: arrowDisabled(d), wanted: coachExpect === d }]"
					class="commands__arrow"
					@click="answer(d), audioCont.playAudio('dir')"
				>
					<svg viewBox="0 0 24 24"><path d="M3.5 9.5h8.5V4.5l8.5 7.5-8.5 7.5v-5H3.5z" /></svg>
					<span v-if="coachExpect === d" class="tap-hand"><svg viewBox="0 0 24 24"><path d="M9 11.5V4.6a1.6 1.6 0 0 1 3.2 0V10h.4V8.6a1.6 1.6 0 0 1 3.2 0V10h.4V9.4a1.6 1.6 0 0 1 3.2 0V15a6 6 0 0 1-6 6h-1.4a5 5 0 0 1-4-2l-3.1-4.3a1.5 1.5 0 0 1 2.3-1.9L9 14.6z" /></svg></span>
				</button>
				<button
					:class="{ disabled: isEnd || !dirs.length || catDirs.length || !!tutorial }"
					class="commands__undo"
					@click="removeAnswer(dirs.length - 1), audioCont.playAudio('dir')"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
				</button>
				<button
					:class="{
						disabled:
							isEnd ||
							!dirs.length ||
							catDirs.length ||
							(coachExpect !== null && coachExpect !== 'run'),
						wanted: coachExpect === 'run',
					}"
					class="commands__run"
					@click="
						checkAnswers(),
							audioCont.playAudio('dir'),
							audioCont.playAudio('mouseStart')
					"
				>
					<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
					<span v-if="coachExpect === 'run'" class="tap-hand"><svg viewBox="0 0 24 24"><path d="M9 11.5V4.6a1.6 1.6 0 0 1 3.2 0V10h.4V8.6a1.6 1.6 0 0 1 3.2 0V10h.4V9.4a1.6 1.6 0 0 1 3.2 0V15a6 6 0 0 1-6 6h-1.4a5 5 0 0 1-4-2l-3.1-4.3a1.5 1.5 0 0 1 2.3-1.9L9 14.6z" /></svg></span>
				</button>
			</div>
		</div>

		<div v-if="isWin" class="next-modal__shade" aria-hidden="true"></div>
		<div v-if="isWin" class="next-modal">
			<img class="next-modal__mouse" src="@/assets/img/v2/mouse-win.webp" alt="" />
			<!-- Обучение пройдено: дальше всерьёз — время идёт, кот ждёт. -->
			<div v-if="tutorial && isLastTutorial" class="next-modal__warn">
				<div class="warn-timer">
					<span class="warn-timer__bar"></span>
					<img src="@/assets/img/v2/token-cat.webp" alt="" />
				</div>
			</div>
			<template v-else>
				<div class="next-modal__stars">
					<span v-for="i in 3" :key="i" :class="{ off: i > wonStars }"><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /></svg></span>
				</div>
				<div v-if="!tutorial" class="next-modal__level">
					<div v-if="chapterDone" class="next-modal__chapter">
						{{ $t('chapterDone', { n: chapterOf(level) + 1 }) }}
					</div>
					<div class="next-modal__title">{{ $t('nextMaze') }}</div>
					<div class="next-modal__num">{{ level + 2 }}</div>
				</div>
			</template>
			<UiButton
				ref="button"
				class="next-modal__btn"
				@click="again(), audioCont.playAudio('click')"
			>
				<template v-if="tutorial" #icon>
					<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
				</template>
				{{ tutorial ? (isLastTutorial ? $t('start') : '') : $t('run') }}
			</UiButton>
		</div>

		<!-- Ещё попытка после поимки: по рекламе за награду, один раз на лабиринт. -->
		<div v-if="offerContinue" class="again">
			<div class="again__in">
				<div class="again__title">{{ $t('continueTitle') }}</div>
				<img class="again__art" src="@/assets/img/v2/cat-caught.webp" alt="" />
				<UiButton :width="250" @click="continueRun">
					<template #icon>
						<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="13" height="12" rx="2.5" fill="currentColor" /><path d="M16.5 10.5 21.5 7.5v9l-5-3z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
					</template>
					{{ $t('continueAd') }}
				</UiButton>
				<span class="again__badge">{{ $t('adBadge') }}</span>
				<button class="again__no" @click="declineContinue">{{ $t('continueNo') }}</button>
			</div>
		</div>

		<ResultTable
			v-if="isCatch && isEnd && !offerContinue"
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
	height: calc(100dvh / var(--ui-zoom, 1));
	/*
	   Низ страницы отодвинут на настоящую высоту объявления, а не на
	   фиксированные 65px, как было раньше: adaptive-баннер на планшете
	   вырастает до 90dp, и ряд кнопок-стрелок уходил под него — тап попадал в
	   рекламу. Ровно это Google и называет «ads interfere with app use» и
	   «inadvertent clicks». Высоту публикует admob.ts через --ad-slot, лишние
	   8px — зазор, чтобы палец не задевал объявление у самой кромки кнопок.
	*/
	padding: 10px 15px calc(var(--ad-band-z) + 8px);
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
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
			font-size: 18px;
		}

		/* Ход по главе: пройденные, текущий, оставшиеся. */
		.hud__pips {
			display: flex;
			gap: 3px;
		}

		/* Прогресс обучения точками: без слов, на любом языке. */
		&--steps {
			gap: 8px;
			padding: 9px 12px 11px;

			span {
				width: 14px;
				height: 14px;
				border-radius: 50%;
				background: rgba(0, 0, 0, 0.25);
				box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.2);

				&.on {
					background: $sun;
					box-shadow: 0 0 0 2px $sunEdge;
				}
			}
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

/* Путь мыши в обучении: стрелки по клеткам, яркие — следующая команда. */
.ghost {
	position: absolute;
	inset: 22%;
	z-index: 3;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.35;
	pointer-events: none;

	svg {
		width: 100%;
		height: 100%;
		fill: $leafEdge;
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

	&.next {
		opacity: 1;

		svg {
			fill: $sun;
			stroke: $sunEdge;
			stroke-width: 1.6;
			stroke-linejoin: round;
		}
		animation: ghostPulse 0.9s ease-in-out infinite;
	}
}

@keyframes ghostPulse {
	0%,
	100% {
		opacity: 0.55;
	}
	50% {
		opacity: 1;
	}
}

/* Клетка, на которую обучение просит посмотреть (развилка). */
.maze__col.mark::after {
	content: '';
	position: absolute;
	inset: 6%;
	z-index: 2;
	border: 3px solid $sun;
	border-radius: 50%;
	box-shadow: 0 0 0 2px $sunEdge;
	animation: markPulse 1s ease-in-out infinite;
	pointer-events: none;
}

@keyframes markPulse {
	0%,
	100% {
		transform: scale(0.85);
		opacity: 0.6;
	}
	50% {
		transform: scale(1.05);
		opacity: 1;
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

		/* Кнопка, которую ждёт обучение: светится и подпрыгивает. */
		&.wanted {
			position: relative;
			animation: coachHop 0.9s ease-in-out infinite;

			&::after {
				content: '';
				position: absolute;
				inset: -7px;
				border: 3px solid #fff;
				border-radius: 18px;
				box-shadow: 0 0 0 3px $sunEdge;
				animation: coachRing 0.9s ease-in-out infinite;
				pointer-events: none;
			}
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

		.next-modal__title,
		.next-modal__num {
			&.next-modal__title {
				font-size: 30px;
				font-weight: 800;
				text-transform: uppercase;
				@include outlined(#fff, $leafEdge);
				margin-bottom: 8px;
			}

			&.next-modal__num {
				font-size: 64px;
				font-weight: 900;
				@include outlined($sun, $woodEdge);
			}

		}
	}
}

/* Рука-подсказка: «нажми сюда». Сидит у правого нижнего угла кнопки. */
.tap-hand {
	position: absolute;
	right: -12px;
	bottom: -18px;
	z-index: 2;
	width: 34px;
	height: 34px;
	pointer-events: none;
	animation: tap 0.9s ease-in-out infinite;

	svg {
		width: 100% !important;
		height: 100% !important;
		fill: #fff;
		stroke: $ink;
		stroke-width: 1.4;
		stroke-linejoin: round;
		transform: rotate(-20deg);
	}
}

@keyframes tap {
	0%,
	100% {
		transform: translate(4px, 6px);
	}
	45% {
		transform: translate(-2px, -2px) scale(0.92);
	}
}

@keyframes coachHop {
	0%,
	100% {
		transform: translateY(0);
	}
	40% {
		transform: translateY(-6px);
	}
}

@keyframes coachRing {
	0%,
	100% {
		opacity: 0.4;
	}
	50% {
		opacity: 1;
	}
}

.hud__pips i {
	width: 9px;
	height: 6px;
	border-radius: 3px;
	background: rgba(0, 0, 0, 0.28);

	&.done {
		background: $sun;
	}

	&.now {
		background: #fff;
	}
}

.next-modal__stars {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	margin: 4px 0 22px;

	svg {
		width: 56px;
		height: 56px;
		fill: $sun;
		stroke: $woodEdge;
		stroke-width: 1.4;
		stroke-linejoin: round;
		filter: drop-shadow(0 3px 0 $woodEdge);
		animation: starPop 0.5s ease-out both;
	}

	span {
		display: flex;
	}

	span:nth-child(2) svg {
		width: 72px;
		height: 72px;
		animation-delay: 0.15s;
	}

	span:nth-child(3) svg {
		animation-delay: 0.3s;
	}

	/* Незаработанная звезда — пустая, чтобы было видно, что можно лучше. */
	span.off svg {
		fill: rgba(255, 255, 255, 0.25);
		filter: none;
	}
}

.next-modal__chapter {
	margin-bottom: 10px;
	padding: 6px 14px 8px;
	@include wood(12px);
	font-size: 18px !important;
	font-weight: 800;
	text-transform: uppercase;
	color: $sun !important;
	text-shadow: none !important;
}

.again {
	@include modal-shade(1000);

	&__in {
		@include modal-card;
		max-width: 340px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&__title {
		@include modal-title;
	}

	&__art {
		width: 76%;
		margin-bottom: 14px;
	}

	/* Families Policy: кнопка ведёт на рекламу — это должно быть видно. */
	&__badge {
		margin-top: 12px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: rgba(74, 42, 16, 0.55);
	}

	&__no {
		margin-top: 8px;
		padding: 8px 12px;
		border: none;
		background: transparent;
		font-family: $font;
		font-size: 15px;
		font-weight: 700;
		color: rgba(74, 42, 16, 0.75);
		cursor: pointer;
	}
}

@keyframes starPop {
	from {
		transform: scale(0);
	}
	70% {
		transform: scale(1.2);
	}
	to {
		transform: scale(1);
	}
}

/* «Дальше всерьёз»: полоса времени тает, кот на её конце готов бежать. */
.next-modal__warn {
	margin: 6px 0 26px;
}

.warn-timer {
	position: relative;
	width: 230px;
	height: 30px;
	@include wood(14px);
	padding: 5px;
	box-sizing: border-box;

	&__bar {
		display: block;
		height: 100%;
		border-radius: 8px;
		background: linear-gradient(180deg, #8be04f, #4fae22);
		animation: drain 2.4s linear infinite;
	}

	img {
		position: absolute;
		right: -26px;
		top: 50%;
		width: 60px;
		height: 60px;
		transform: translateY(-55%);
		animation: catReady 0.6s ease-in-out infinite alternate;
	}
}

@keyframes drain {
	from {
		width: 100%;
	}
	to {
		width: 0;
	}
}

@keyframes catReady {
	from {
		transform: translateY(-55%) rotate(-6deg);
	}
	to {
		transform: translateY(-62%) rotate(6deg);
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
