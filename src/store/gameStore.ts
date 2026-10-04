import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

import type { I_GameStats, Direction } from '@/utils/types'

export const useGameStore = defineStore('GameStore', () => {
	const name = ref<string>('')
	const setName = (value: string) => (name.value = value)

	const gameStats = ref<I_GameStats>([])

	/**
	 * Достигнутый уровень незаконченного забега. Сохраняется на диск, чтобы
	 * «Продолжить» в меню работало и после закрытия приложения, а не только
	 * пока игра висит в памяти.
	 *
	 * Ноль означает «продолжать нечего»: сюда его ставит проигрыш (см.
	 * animCatEnd) и начало новой игры. Забег обрывается только этими двумя
	 * способами — выход в меню прогресс сохраняет.
	 */
	const currentLevel = ref<number>(0)
	const tutorialPassed = ref<boolean>(false)

	const moves = ref<Direction[]>([])
	const planningMs = ref(0)
	const runningMs = ref(0)

	function resetMoves() {
		moves.value = []
		planningMs.value = 0
		runningMs.value = 0
	}

	function addMove(dir: Direction) {
		moves.value.push(dir)
	}

	function setPlanningMs(ms: number) {
		planningMs.value = ms
	}

	function setRunningMs(ms: number) {
		runningMs.value = ms
	}

	function nextLevel() {
		if (!tutorialPassed.value) {
			if (currentLevel.value >= 3) {
				tutorialPassed.value = true
				currentLevel.value = 1
			} else {
				currentLevel.value += 1
			}
		} else {
			currentLevel.value += 1
		}
	}

	const recordGameStat = (score: number) => {
		gameStats.value = [
			...gameStats.value,
			{
				name: name.value,
				score,
				date: new Date(),
			},
		]
			.sort((a, b) => (a.score > b.score ? -1 : 1))
			.slice(0, 10)
	}

	watch(
		() => ({
			gameStats: gameStats.value,
			tutorialPassed: tutorialPassed.value,
			currentLevel: currentLevel.value,
		}),
		async (data) => {
			await Preferences.set({
				key: 'gameData',
				value: JSON.stringify(data),
			})
		},
		{ deep: true }
	)

	const loadData = async () => {
		const localData = await Preferences.get({ key: 'gameData' })
		if (localData.value) {
			try {
				const parsed = JSON.parse(localData.value) as {
					gameStats: I_GameStats
					tutorialPassed: boolean
					currentLevel?: number
				}
				gameStats.value = parsed.gameStats || []
				tutorialPassed.value = parsed.tutorialPassed ?? false
				// Число, а не что попало: значение читается из файла, который мог
				// остаться от прошлой версии, где уровень не сохранялся вовсе.
				currentLevel.value =
					typeof parsed.currentLevel === 'number' && parsed.currentLevel > 0
						? parsed.currentLevel
						: 0
			} catch (e) {
				const old = await Preferences.get({ key: 'gameStats' })
				if (old.value) {
					gameStats.value = JSON.parse(old.value) as I_GameStats
				}
			}
		}
	}

	return {
		name,
		setName,
		gameStats,
		recordGameStat,
		loadData,

		currentLevel,
		tutorialPassed,
		moves,
		planningMs,
		runningMs,
		resetMoves,
		addMove,
		setPlanningMs,
		setRunningMs,
		nextLevel,
	}
})
