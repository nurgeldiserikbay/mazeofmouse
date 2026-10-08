<script lang="ts" setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { useAdsStore } from '@/store/adsStore'

/**
 * Масштаб интерфейса под планшеты.
 *
 * Вёрстка рассчитана на телефон (колонка до 480px), и на планшете игра
 * стояла узкой полоской вверху экрана с пустой лужайкой ниже. Вместо отдельной
 * планшетной вёрстки весь интерфейс пропорционально увеличивается: на телефоне
 * масштаб 1, на 7" около 1.3, на 10" около 1.6. Применяется через zoom на #app
 * (style.scss); высоты, привязанные к экрану, делятся на него обратно.
 */
function applyUiZoom() {
	const zoom = Math.min(window.innerWidth / 440, window.innerHeight / 800)
	const clamped = Math.round(Math.min(1.8, Math.max(1, zoom)) * 20) / 20
	document.documentElement.style.setProperty('--ui-zoom', String(clamped))
}
applyUiZoom()
window.addEventListener('resize', applyUiZoom)

const pageStore = usePageStore()
const gameStore = useGameStore()
const adsStore = useAdsStore()

onMounted(async () => {
	if (Capacitor.getPlatform() === 'android') {
		// Подписка ставится до инициализации: первое событие о баннере может
		// прийти сразу за ней, и потерять его нельзя — иначе слот останется с
		// кросс-промо под уже стоящим объявлением.
		Admob.onBannerChange((live, height) => adsStore.setBanner(live, height))

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
	min-height: calc(100dvh / var(--ui-zoom, 1));
}
</style>
