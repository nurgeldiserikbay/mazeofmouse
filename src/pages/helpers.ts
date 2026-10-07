/** Лабиринтов в главе. Проигрыш возвращает к началу главы, а не к первому. */
export const CHAPTER_SIZE = 10

export function chapterOf(level: number) {
	return Math.floor(level / CHAPTER_SIZE)
}

/** Первый лабиринт главы, в которой стоит level: сюда откатывает проигрыш. */
export function checkpointOf(level: number) {
	return chapterOf(level) * CHAPTER_SIZE
}

/**
 * Звёзды за пройденный лабиринт по доле оставшегося времени: от половины —
 * три, от четверти — две, иначе одна. Те же доли отмечены на полосе таймера.
 */
export const STAR_MARKS = [0.5, 0.25]

export function starsFor(timeLeft: number) {
	if (timeLeft >= STAR_MARKS[0]) return 3
	if (timeLeft >= STAR_MARKS[1]) return 2
	return 1
}

/**
 * Размер поля по уровню.
 *
 * Раньше поле росло до 31x31: клетка становилась ~11px, и сложнее от этого не
 * было — только мельче. Теперь рост останавливается на 19x19, а дальше
 * сложность дают время, скорость кота и плотность развилок.
 */
export function getGridSizeByLevel(level: number) {
	if (level <= 3) return { rows: 7, cols: 7 }
	if (level <= 9) return { rows: 9, cols: 9 }
	if (level <= 16) return { rows: 11, cols: 11 }
	if (level <= 24) return { rows: 13, cols: 13 }
	if (level <= 34) return { rows: 15, cols: 15 }
	if (level <= 49) return { rows: 17, cols: 17 }
	return { rows: 19, cols: 19 }
}
