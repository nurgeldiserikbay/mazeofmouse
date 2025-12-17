import { getMaze } from '@/pages/game'
import type { LevelDefinition } from './types'

export const TUTORIAL_LEVELS: LevelDefinition[] = [
	{
		id: 'T1',
		type: 'tutorial',
		rows: ['########', '#M.....#', '#......#', '#.....S#', '########'],
		minCommands: 4,
		maxCommands: 8,
		catSpeed: 0,
	},
	{
		id: 'T2',
		type: 'tutorial',
		rows: ['########', '#M.....#', '###.####', '#.....S#', '########'],
		minCommands: 6,
		maxCommands: 10,
		catSpeed: 0,
	},
	{
		id: 'T3',
		type: 'tutorial',
		rows: ['########', '#M..C..#', '#......#', '#.....S#', '########'],
		minCommands: 5,
		maxCommands: 10,
		catSpeed: 1,
	},
	{
		id: 'T4',
		type: 'tutorial',
		rows: [
			'##########',
			'#M.......#',
			'#.######.#',
			'#......C.#',
			'#.######.#',
			'#.......S#',
			'##########',
		],
		minCommands: 10,
		maxCommands: 16,
		catSpeed: 1,
	},
]

interface LevelPack {
	level: number
	gridSize: { rows: number; cols: number }
	templates: string[][]
}

export const STATIC_LEVEL_PACKS: LevelPack[] = [
	{
		level: 1,
		gridSize: { rows: 5, cols: 5 },
		templates: [
			['#####', '#M..#', '#...#', '#..S#', '#####'],
			['#####', '#M..#', '#.#.#', '#..S#', '#####'],
		],
	},
	{
		level: 2,
		gridSize: { rows: 7, cols: 7 },
		templates: [
			[
				'#######',
				'#M....#',
				'#.###.#',
				'#.....#',
				'#.###.#',
				'#....S#',
				'#######',
			],
		],
	},
]

function rotate90(rows: string[]): string[] {
	const h = rows.length
	const w = rows[0].length
	const result: string[] = []

	for (let x = 0; x < w; x++) {
		let newRow = ''
		for (let y = h - 1; y >= 0; y--) {
			newRow += rows[y][x]
		}
		result.push(newRow)
	}
	return result
}

function mirrorH(rows: string[]): string[] {
	return rows.map((r) => r.split('').reverse().join(''))
}

function mirrorV(rows: string[]): string[] {
	return [...rows].reverse()
}

function expandTemplates(pack: LevelPack) {
	const res: string[][] = []

	for (const base of pack.templates) {
		const variants = [
			base,
			rotate90(base),
			rotate90(rotate90(base)),
			rotate90(rotate90(rotate90(base))),
			mirrorH(base),
			mirrorV(base),
		]

		variants.forEach((v) => res.push(v))
	}

	return res
}

export function getGridSizeByLevel(level: number) {
	if (level <= 3) return { rows: 7, cols: 7 }
	if (level <= 7) return { rows: 9, cols: 9 }
	if (level <= 15) return { rows: 11, cols: 11 }
	if (level <= 20) return { rows: 13, cols: 13 }
	return level % 2 === 0 ? { rows: 13, cols: 13 } : { rows: 15, cols: 15 }
}

export function generateRandomLevel(level: number): LevelDefinition {
	const size = getGridSizeByLevel(level)
	const maze = getMaze(size.rows, size.cols)

	return {
		id: `R-${level}`,
		type: 'random',
		rows: maze.map((row) =>
			row.map((cell) => (cell === 0 ? '.' : '#')).join('')
		),
		gridSize: size,
		catSpeed: level < 30 ? 1 : 2,
	}
}

export function getLevelDefinition(
	levelNumber: number,
	tutorialPassed: boolean
): LevelDefinition {
	if (!tutorialPassed) {
		const idx = Math.max(0, Math.min(TUTORIAL_LEVELS.length - 1, levelNumber))
		return TUTORIAL_LEVELS[idx]
	}

	if (levelNumber >= 1 && levelNumber <= 10) {
		const pack = STATIC_LEVEL_PACKS.find((p) => p.level === levelNumber)
		if (pack) {
			const allTemplates = expandTemplates(pack)
			const tpl = allTemplates[Math.floor(Math.random() * allTemplates.length)]
			return {
				id: `L-${levelNumber}`,
				type: 'static',
				rows: tpl,
				gridSize: pack.gridSize,
				catSpeed: 0,
			}
		}
	}

	if (levelNumber >= 20) {
		return generateRandomLevel(levelNumber)
	}

	return generateRandomLevel(levelNumber)
}
