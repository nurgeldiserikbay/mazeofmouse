import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Состояние рекламного слота.
 *
 * Место под баннер зарезервировано в вёрстке всегда, поэтому кто-то должен
 * решать, что в нём рисовать: пришедший нативный баннер закрывает полосу собой,
 * а пока его нет — в полосе стоит кросс-промо наших же игр (AdSlot.vue).
 * Ответ на этот вопрос знает только нативный слой, поэтому Admob публикует его
 * сюда через `onBannerChange` (см. App.vue).
 */
export const useAdsStore = defineStore('adsStore', () => {
	/** Стоит ли сейчас настоящее объявление в баннерном слоте. */
	const bannerLive = ref(false)
	/** Настоящая высота объявления, когда она стала известна. */
	const bannerHeight = ref(0)

	function setBanner(live: boolean, height = 0) {
		bannerLive.value = live
		bannerHeight.value = live ? height : 0
	}

	return { bannerLive, bannerHeight, setBanner }
})
