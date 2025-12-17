import { LevelDefinition } from '@/utils/types'

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

export const STATIC_LEVEL_PACKS: {
	level: number
	gridSize: { rows: number; cols: number }
	templates: string[][]
}[] = [
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
	{
		level: 3,
		gridSize: { rows: 7, cols: 7 },
		templates: [
			[
				'#######',
				'#M..#S#',
				'#.#.#.#',
				'#.#...#',
				'#.###.#',
				'#.....#',
				'#######',
			],
		],
	},
]
