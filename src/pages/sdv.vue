<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { PAGES } from '@/utils/conts'
import { useAudio } from '@/composables/useAudio'
import { getMaze } from './game'
import { TUTORIAL_LEVELS } from './data'

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface LevelDefinition {
	id: string
	type: 'tutorial' | 'static' | 'random'
	rows: string[]
	gridSize?: { rows: number; cols: number }
	catSpeed?: number
	minCommands?: number
	maxCommands?: number
}

// === АУДИО ===
const { playAudio } = useAudio()

// === СТОРЫ ===
const pageStore = usePageStore()
const gameStore = useGameStore()

const CELL_SIZE = 36

const currentLevel = ref<number>(1)
const tutorialPassed = ref<boolean>(false)

export function getLevelDefinition(level: number): LevelDefinition {
	if (!tutorialPassed.value) {
		const idx = Math.min(TUTORIAL_LEVELS.length - 1, Math.max(0, level - 1))
		return TUTORIAL_LEVELS[idx]
	}

	if (level >= 1 && level <= 10) {
		const pack = STATIC_LEVEL_PACKS.find((p) => p.level === level)
		if (pack) {
			const allTemplates = expandTemplates(pack)
			const tpl = allTemplates[Math.floor(Math.random() * allTemplates.length)]
			return {
				id: `L-${level}`,
				type: 'static',
				rows: tpl,
				gridSize: pack.gridSize,
				catSpeed: 0,
			}
		}
	}

	return generateRandomLevel(level)
}

// === СОСТОЯНИЕ СТРАНИЦЫ ===
const levelDef = ref<LevelDefinition | null>(null)
const mazeRows = ref<string[]>([])

const rowsCount = computed(() => mazeRows.value.length)
const colsCount = computed(() =>
	mazeRows.value[0] ? mazeRows.value[0].length : 0
)

// координаты сетки
const mouseGrid = ref({ x: 0, y: 0 })
const exitGrid = ref({ x: 0, y: 0 })
// можно потом добавить кота
// const catGrid = ref({ x: 0, y: 0 })

// пиксельные координаты
const mousePixel = ref({ x: 0, y: 0 })

const isRunning = ref(false)

// команды игрока
const commands = ref<Direction[]>([])

// время
let planningStart = performance.now()
const runStart = ref<number | null>(null)
const planningMs = ref(0)
const runningMs = ref(0)

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function gridToPixel(x: number, y: number) {
	return {
		x: x * CELL_SIZE + CELL_SIZE / 2,
		y: y * CELL_SIZE + CELL_SIZE / 2,
	}
}

function parseLevelRows(rows: string[]): void {
	let mouse: { x: number; y: number } | null = null
	let exit: { x: number; y: number } | null = null
	const floorCells: { x: number; y: number }[] = []

	for (let y = 0; y < rows.length; y++) {
		const row = rows[y]
		for (let x = 0; x < row.length; x++) {
			const ch = row[x]
			if (ch !== '#') {
				floorCells.push({ x, y })
			}
			if (ch === 'M') mouse = { x, y }
			if (ch === 'S') exit = { x, y }
		}
	}

	if (!mouse && floorCells.length > 0) {
		mouse = floorCells[0]
	}
	if (!exit && floorCells.length > 1) {
		exit = floorCells[floorCells.length - 1]
	}

	mouseGrid.value = mouse || { x: 0, y: 0 }
	exitGrid.value = exit || { x: colsCount.value - 1, y: rowsCount.value - 1 }

	const px = gridToPixel(mouseGrid.value.x, mouseGrid.value.y)
	mousePixel.value = px
}

function canMoveTo(x: number, y: number): boolean {
	if (y < 0 || y >= rowsCount.value || x < 0 || x >= colsCount.value)
		return false
	const row = mazeRows.value[y]
	const ch = row[x]
	return ch !== '#'
}

function easeOutQuad(t: number) {
	return 1 - (1 - t) * (1 - t)
}

function animateMouseStep(
	toX: number,
	toY: number,
	duration = 200
): Promise<void> {
	const from = gridToPixel(mouseGrid.value.x, mouseGrid.value.y)
	const to = gridToPixel(toX, toY)
	mouseGrid.value = { x: toX, y: toY }

	return new Promise((resolve) => {
		const start = performance.now()

		function tick(now: number) {
			const t = Math.min(1, (now - start) / duration)
			const k = easeOutQuad(t)

			mousePixel.value = {
				x: from.x + (to.x - from.x) * k,
				y: from.y + (to.y - from.y) * k,
			}

			if (t < 1) {
				requestAnimationFrame(tick)
			} else {
				resolve()
			}
		}

		requestAnimationFrame(tick)
	})
}

// === ЛОГИКА КОМАНД ===
function addCommand(dir: Direction) {
	if (isRunning.value) return
	commands.value.push(dir)
	playAudio('dir')
}

function clearCommands() {
	if (isRunning.value) return
	commands.value = []
	planningStart = performance.now()
}

async function runCommands() {
	for (const dir of commands.value) {
		const { x, y } = mouseGrid.value
		let nx = x
		let ny = y

		if (dir === 'UP') ny -= 1
		if (dir === 'DOWN') ny += 1
		if (dir === 'LEFT') nx -= 1
		if (dir === 'RIGHT') nx += 1

		if (!canMoveTo(nx, ny)) {
			await animateMouseStep(nx, ny, 200) // можно чуть «стукнуться» в стену
			finishLevel(false)
			return
		}

		await animateMouseStep(nx, ny, 200)

		// Проверка победы
		if (nx === exitGrid.value.x && ny === exitGrid.value.y) {
			finishLevel(true)
			return
		}
	}

	// команды закончились, но до выхода не дошли
	finishLevel(false)
}

function startRun() {
	if (isRunning.value || commands.value.length === 0) return

	const now = performance.now()
	planningMs.value = now - planningStart
	runStart.value = now
	isRunning.value = true

	playAudio('mouseStart')
	runCommands().catch(() => {
		isRunning.value = false
	})
}

function finishLevel(success: boolean) {
	isRunning.value = false
	if (runStart.value !== null) {
		runningMs.value = performance.now() - runStart.value
	}

	const byDir: Record<Direction, number> = {
		UP: 0,
		DOWN: 0,
		LEFT: 0,
		RIGHT: 0,
	}
	commands.value.forEach((d) => {
		byDir[d]++
	})

	const totalMoves = commands.value.length

	// Примитивный вывод результата (можно заменить на модалку)
	if (success) {
		playAudio('mouseWin')
		// Можно использовать score = чем меньше ходов, тем больше очков
		const score = Math.max(0, 1000 - totalMoves * 10)
		gameStore.recordGameStat(score)
		// Переходим к следующему уровню
		if (!tutorialPassed.value) {
			if (currentLevel.value >= TUTORIAL_LEVELS.length) {
				tutorialPassed.value = true
				currentLevel.value = 1
			} else {
				currentLevel.value += 1
			}
		} else {
			currentLevel.value += 1
		}
		alert(
			`Уровень пройден!\nХоды: ${totalMoves}\n` +
				`↑:${byDir.UP} ↓:${byDir.DOWN} ←:${byDir.LEFT} →:${byDir.RIGHT}\n` +
				`Планирование: ${(planningMs.value / 1000).toFixed(1)} сек\n` +
				`Прохождение: ${(runningMs.value / 1000).toFixed(1)} сек`
		)
	} else {
		playAudio('catWin')
		alert(
			`Не получилось 😿\nХоды: ${totalMoves}\n` +
				`↑:${byDir.UP} ↓:${byDir.DOWN} ←:${byDir.LEFT} →:${byDir.RIGHT}`
		)
	}

	// Готовим всё к новому запуску
	loadLevel()
}

// === ЗАГРУЗКА УРОВНЯ ===
function loadLevel() {
	const def = getLevelDefinition(currentLevel.value)
	levelDef.value = def
	mazeRows.value = def.rows
	parseLevelRows(def.rows)

	commands.value = []
	isRunning.value = false
	planningStart = performance.now()
	runStart.value = null
	planningMs.value = 0
	runningMs.value = 0
}

const levelTitle = computed(() => {
	if (!tutorialPassed.value) {
		return `Training ${currentLevel.value}/${TUTORIAL_LEVELS.length}`
	}
	return `Level ${currentLevel.value}`
})

const movesCount = computed(() => commands.value.length)
const movesByDir = computed(() => {
	const res: Record<Direction, number> = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 }
	commands.value.forEach((d) => {
		res[d]++
	})
	return res
})

const planningSeconds = computed(() => (planningMs.value / 1000).toFixed(1))
const runningSeconds = computed(() => (runningMs.value / 1000).toFixed(1))

function goBack() {
	pageStore.routeTo(PAGES.START)
}

onMounted(async () => {
	// загружаем рекорды, если нужно
	await gameStore.loadData()
	loadLevel()
})
</script>

<template>
	<div class="playground-page">
		<header class="top-bar">
			<button class="back-btn" type="button" @click="goBack">⟵</button>
			<div class="top-info">
				<div class="level-title">
					{{ levelTitle }}
				</div>
				<div class="timers">
					<span>Планирование: {{ planningSeconds }}s</span>
					<span>Прохождение: {{ runningSeconds }}s</span>
				</div>
			</div>
		</header>

		<main class="main-layout">
			<section class="maze-wrapper">
				<div
					v-if="rowsCount && colsCount"
					class="maze"
					:style="{
						'--rows': rowsCount,
						'--cols': colsCount,
						'--cell-size': CELL_SIZE + 'px',
					}"
				>
					<!-- клетки -->
					<template v-for="(row, y) in mazeRows" :key="`r-${y}`">
						<div
							v-for="(cell, x) in row"
							:key="`c-${x}`"
							class="cell"
							:class="{
								'cell-wall': cell === '#',
								'cell-exit': x === exitGrid.x && y === exitGrid.y,
							}"
						/>
					</template>

					<!-- мышка -->
					<div
						class="entity mouse-entity"
						:style="{
							left: mousePixel.x + 'px',
							top: mousePixel.y + 'px',
						}"
					/>
				</div>
				<div v-else class="maze-empty">Нет данных уровня</div>
			</section>

			<section class="side-panel">
				<div class="stat-block">
					<h3>Статистика хода</h3>
					<p>Шагов: {{ movesCount }}</p>
					<p>↑: {{ movesByDir.UP }} ↓: {{ movesByDir.DOWN }}</p>
					<p>←: {{ movesByDir.LEFT }} →: {{ movesByDir.RIGHT }}</p>
				</div>

				<div class="commands-block">
					<h3>Команды</h3>
					<div class="commands-list">
						<span
							v-for="(cmd, idx) in commands"
							:key="idx"
							class="command-chip"
						>
							<span v-if="cmd === 'UP'">↑</span>
							<span v-else-if="cmd === 'DOWN'">↓</span>
							<span v-else-if="cmd === 'LEFT'">←</span>
							<span v-else-if="cmd === 'RIGHT'">→</span>
						</span>
						<span v-if="!commands.length" class="commands-empty">
							Пока нет команд — добавь стрелками ниже.
						</span>
					</div>
				</div>

				<div class="controls">
					<h3>Управление</h3>
					<div class="dir-grid">
						<button class="dir-btn" type="button" @click="addCommand('UP')">
							↑
						</button>
						<button class="dir-btn" type="button" @click="addCommand('LEFT')">
							←
						</button>
						<button class="dir-btn" type="button" @click="addCommand('DOWN')">
							↓
						</button>
						<button class="dir-btn" type="button" @click="addCommand('RIGHT')">
							→
						</button>
					</div>

					<div class="action-buttons">
						<button
							class="primary-btn"
							type="button"
							:disabled="isRunning || !commands.length"
							@click="startRun"
						>
							▶ Старт
						</button>
						<button
							class="secondary-btn"
							type="button"
							:disabled="isRunning || !commands.length"
							@click="clearCommands"
						>
							⟲ Очистить
						</button>
					</div>
				</div>
			</section>
		</main>
	</div>
</template>

<style scoped>
.playground-page {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background: radial-gradient(
		circle at top,
		#1f2933 0,
		#050816 55%,
		#02010a 100%
	);
	color: #f9fafb;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
		sans-serif;
}

.top-bar {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	border-bottom: 1px solid rgba(148, 163, 184, 0.3);
	background: linear-gradient(
		to right,
		rgba(15, 23, 42, 0.9),
		rgba(15, 23, 42, 0.6)
	);
	backdrop-filter: blur(10px);
}

.back-btn {
	border: none;
	outline: none;
	background: rgba(15, 23, 42, 0.9);
	color: #e5e7eb;
	border-radius: 999px;
	padding: 6px 10px;
	cursor: pointer;
	font-size: 18px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
	box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.3);
}

.back-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 8px 16px rgba(15, 23, 42, 0.6);
	background: rgba(30, 64, 175, 0.9);
}

.top-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.level-title {
	font-weight: 600;
	letter-spacing: 0.04em;
	font-size: 14px;
	text-transform: uppercase;
	color: #e5e7eb;
}

.timers {
	display: flex;
	gap: 12px;
	font-size: 12px;
	color: #9ca3af;
}

.main-layout {
	flex: 1;
	display: grid;
	grid-template-columns: minmax(0, 2.2fr) minmax(0, 1.2fr);
	gap: 16px;
	padding: 16px;
}

.maze-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
}

.maze {
	position: relative;
	--cell-size: 36px;
	width: calc(var(--cols) * var(--cell-size));
	height: calc(var(--rows) * var(--cell-size));
	display: grid;
	grid-template-columns: repeat(var(--cols), var(--cell-size));
	grid-template-rows: repeat(var(--rows), var(--cell-size));
	background: radial-gradient(circle at top, #0f172a 0, #020617 100%);
	border-radius: 18px;
	padding: 8px;
	box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
	border: 1px solid rgba(148, 163, 184, 0.4);
}

.maze-empty {
	font-size: 14px;
	color: #9ca3af;
}

.cell {
	width: var(--cell-size);
	height: var(--cell-size);
	border-radius: 8px;
	box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.9);
	background: radial-gradient(circle at 25% 25%, #0b1120 0, #020617 60%);
}

.cell-wall {
	background: radial-gradient(circle at 20% 20%, #0f172a 0, #020617 70%);
	box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.9),
		inset 0 0 12px rgba(15, 23, 42, 1);
}

.cell-exit {
	background: radial-gradient(circle at 50% 30%, #facc15 0, #a16207 70%);
	box-shadow: 0 0 12px rgba(250, 204, 21, 0.7),
		inset 0 0 0 1px rgba(120, 53, 15, 0.7);
}

.entity {
	position: absolute;
	width: var(--cell-size);
	height: var(--cell-size);
	transform: translate(-50%, -50%);
	border-radius: 999px;
	transition: box-shadow 0.12s ease;
}

.mouse-entity {
	background: radial-gradient(
		circle at 30% 30%,
		#fde68a 0,
		#f97316 40%,
		#78350f 100%
	);
	box-shadow: 0 0 8px rgba(248, 250, 252, 0.7),
		0 12px 22px rgba(22, 101, 52, 0.7);
}

.side-panel {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.stat-block,
.commands-block,
.controls {
	background: linear-gradient(
		to bottom right,
		rgba(15, 23, 42, 0.9),
		rgba(15, 23, 42, 0.7)
	);
	border-radius: 16px;
	padding: 12px 14px;
	border: 1px solid rgba(148, 163, 184, 0.35);
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.8);
}

.stat-block h3,
.commands-block h3,
.controls h3 {
	font-size: 13px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: #e5e7eb;
	margin-bottom: 8px;
}

.stat-block p {
	font-size: 13px;
	color: #d1d5db;
	margin: 2px 0;
}

.commands-list {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	min-height: 32px;
}

.command-chip {
	min-width: 26px;
	height: 26px;
	border-radius: 999px;
	background: rgba(15, 23, 42, 0.9);
	border: 1px solid rgba(148, 163, 184, 0.5);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	color: #e5e7eb;
	box-shadow: 0 6px 12px rgba(15, 23, 42, 0.7);
}

.commands-empty {
	font-size: 12px;
	color: #9ca3af;
}

.controls {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.dir-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	grid-template-rows: repeat(3, 36px);
	gap: 6px;
	justify-items: center;
	align-items: center;
}

.dir-btn {
	width: 40px;
	height: 40px;
	border-radius: 999px;
	background: radial-gradient(circle at 30% 20%, #1d4ed8 0, #020617 70%);
	border: 1px solid rgba(129, 140, 248, 0.8);
	color: #e5e7eb;
	font-size: 18px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 10px 20px rgba(30, 64, 175, 0.9), 0 0 0 1px rgba(15, 23, 42, 1);
	transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease;
}

.dir-btn:nth-child(1) {
	grid-column: 2 / 3;
	grid-row: 1 / 2;
}
.dir-btn:nth-child(2) {
	grid-column: 1 / 2;
	grid-row: 2 / 3;
}
.dir-btn:nth-child(3) {
	grid-column: 2 / 3;
	grid-row: 3 / 4;
}
.dir-btn:nth-child(4) {
	grid-column: 3 / 4;
	grid-row: 2 / 3;
}

.dir-btn:hover {
	transform: translateY(-1px);
	filter: brightness(1.15);
	box-shadow: 0 14px 26px rgba(30, 64, 175, 1),
		0 0 0 1px rgba(59, 130, 246, 0.9);
}

.dir-btn:active {
	transform: translateY(0) scale(0.96);
	box-shadow: 0 4px 10px rgba(15, 23, 42, 0.9);
}

.action-buttons {
	display: flex;
	gap: 8px;
	margin-top: 6px;
}

.primary-btn,
.secondary-btn {
	flex: 1;
	border-radius: 999px;
	padding: 8px 10px;
	border: none;
	outline: none;
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	cursor: pointer;
	transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease,
		background 0.1s ease;
}

.primary-btn {
	background: linear-gradient(to right, #facc15, #f97316);
	color: #111827;
	box-shadow: 0 12px 26px rgba(250, 204, 21, 0.85),
		0 0 0 1px rgba(120, 53, 15, 0.7);
}

.primary-btn:hover:not(:disabled) {
	filter: brightness(1.1);
	transform: translateY(-1px);
}

.primary-btn:active:not(:disabled) {
	transform: translateY(0) scale(0.97);
	box-shadow: 0 6px 14px rgba(15, 23, 42, 0.9);
}

.primary-btn:disabled {
	cursor: default;
	opacity: 0.55;
	box-shadow: none;
}

.secondary-btn {
	background: rgba(15, 23, 42, 0.95);
	color: #e5e7eb;
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.9),
		0 0 0 1px rgba(148, 163, 184, 0.7);
}

.secondary-btn:hover:not(:disabled) {
	filter: brightness(1.08);
	transform: translateY(-1px);
}

.secondary-btn:active:not(:disabled) {
	transform: translateY(0) scale(0.97);
	box-shadow: 0 4px 10px rgba(15, 23, 42, 1);
}

.secondary-btn:disabled {
	cursor: default;
	opacity: 0.5;
	box-shadow: none;
}

/* Адаптив */
@media (max-width: 900px) {
	.main-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	.side-panel {
		order: -1;
	}
}
</style>
