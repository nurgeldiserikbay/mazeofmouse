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
