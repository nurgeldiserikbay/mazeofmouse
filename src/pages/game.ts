export function createMaze(rows: number, cols: number): number[][] {
	const maze: number[][] = []
	for (let i = 0; i < rows; i++) {
		const row: number[] = []
		for (let j = 0; j < cols; j++) {
			row.push(1)
		}
		maze.push(row)
	}
	return maze
}

export function generateMaze(maze: number[][], row: number, col: number): number[][] {
	const directions = [
		[-2, 0],
		[0, 2],
		[2, 0],
		[0, -2],
	]

	maze[row][col] = 0

	directions.sort(() => Math.random() - 0.5)

	for (const [dr, dc] of directions) {
		const newRow = row + dr
		const newCol = col + dc

		if (
			newRow >= 0 &&
			newRow < maze.length &&
			newCol >= 0 &&
			newCol < maze[0].length
		) {
			if (maze[newRow][newCol] === 1) {
				maze[row + Math.floor(dr / 2)][col + Math.floor(dc / 2)] = 0
				generateMaze(maze, newRow, newCol)
			}
		}
	}

	return maze
}

export function getMaze(rows: number, cols: number): number[][] {
  return generateMaze(createMaze(rows, cols), 0, 0)
}

export function isPosMove(maze: number[][], pos: [number, number]): boolean {
  const row = maze[pos[1]]

  if (!row) return false

  return row[pos[0]] === 0
}

export function nextPost(maze: number[][], cur: [number, number], dir: [number, number]) {
  const next: [number, number] = [cur[0] + dir[0], cur[1] + dir[1]]

  if (!isPosMove(maze, [...next])) return false

  return next
}

export function isCross(maze: number[][], cur: [number, number]) {
	let posDir = 0

	if (isPosMove(maze, [cur[0] + 1, cur[1]])) posDir += 1
	if (isPosMove(maze, [cur[0] - 1, cur[1]])) posDir += 1
	if (isPosMove(maze, [cur[0], cur[1] + 1])) posDir += 1
	if (isPosMove(maze, [cur[0], cur[1] - 1])) posDir += 1

  return posDir >= 3
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}
