import { LevelDefinition } from '@/utils/types'
import { STATIC_LEVEL_PACKS } from './data'
import { getMaze } from './game'

export function getGridSizeByLevel(level: number) {
	if (level <= 3) return { rows: 7, cols: 7 }
	if (level <= 7) return { rows: 9, cols: 9 }
	if (level <= 11) return { rows: 11, cols: 11 }
	if (level <= 15) return { rows: 13, cols: 13 }
	if (level <= 17) return { rows: 15, cols: 15 }
	if (level <= 19) return { rows: 17, cols: 17 }
	if (level <= 21) return { rows: 19, cols: 19 }
	if (level <= 23) return { rows: 21, cols: 21 }
	if (level <= 25) return { rows: 23, cols: 23 }
	if (level <= 27) return { rows: 25, cols: 25 }
	if (level <= 29) return { rows: 27, cols: 27 }
	if (level <= 31) return { rows: 29, cols: 29 }
	if (level <= 33) return { rows: 31, cols: 31 }
	return level % 2 === 0 ? { rows: 31, cols: 31 } : { rows: 29, cols: 29 }
}

export function rotate90(rows: string[]): string[] {
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

export function mirrorH(rows: string[]): string[] {
	return rows.map((r) => r.split('').reverse().join(''))
}

export function mirrorV(rows: string[]): string[] {
	return [...rows].reverse()
}

export function expandTemplates(pack: (typeof STATIC_LEVEL_PACKS)[number]) {
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

export function generateRandomLevel(level: number): LevelDefinition {
	const size = getGridSizeByLevel(level)
	const maze = getMaze(size.rows, size.cols)
	const rows = maze.map((row) =>
		row.map((cell) => (cell === 0 ? '.' : '#')).join('')
	)

	return {
		id: `R-${level}`,
		type: 'random',
		rows,
		gridSize: size,
		catSpeed: level < 30 ? 1 : 2,
	}
}
