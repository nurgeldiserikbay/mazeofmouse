<script lang="ts" setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

const pageStore = usePageStore()
const gameStore = useGameStore()

onMounted(async () => {
	if (Capacitor.getPlatform() === 'android') {
		// Реклама не должна ломать запуск: ошибка инициализации гасится здесь.
		Admob.initialize().catch(() => {})

		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
			await StatusBar.setOverlaysWebView({ overlay: true })
		} catch {
			// Полноэкранный режим не критичен — игра должна стартовать в любом случае.
		} finally {
			// Сплэш скрываем всегда, иначе приложение зависает на заставке.
			await SplashScreen.hide().catch(() => {})
		}
	}

	gameStore.loadData()
})
</script>

<template>
	<div class="wrapper">
		<component :is="pageStore.currentPageComponent" />
	</div>
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: 100dvh;
}
</style>
