export type TYPE_PAGES = 'START' | 'PLAYGROUND'

export interface I_GameStat {
	name: string
	score: number
	date: Date
}

export type I_GameStats = I_GameStat[]

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface LevelDefinition {
	id: string
	type: 'tutorial' | 'static' | 'random'
	rows: string[]
	gridSize?: { rows: number; cols: number }
	catSpeed?: number
	minCommands?: number
	maxCommands?: number
}

export interface LevelStats {
	level: number
	moves: number
	byDir: Record<Direction, number>
	planningMs: number
	runningMs: number
}
