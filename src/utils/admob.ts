import {
	AdMob,
	AdmobConsentStatus,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: false,
}

// Минимальный интервал между показами интерстишла (частотный кап).
const INTERSTITIAL_MIN_INTERVAL_MS = 60_000

class Admob {
	// Слушатели регистрируются один раз за жизненный цикл приложения,
	// чтобы не накапливались при каждом показе рекламы.
	private listenersRegistered = false
	// Колбэк текущего показа интерстишла и флаг «уже закрыт».
	private onInterstitialClosed: (() => void) | null = null
	private interstitialClosed = true
	// Время последнего фактического показа интерстишла (для частотного капа).
	private lastInterstitialAt = 0

	async initialize() {
		await AdMob.initialize(AdMobInitializationOptions)

		this.registerListeners()

		const [trackingInfo, consentInfo] = await Promise.all([
			AdMob.trackingAuthorizationStatus(),
			AdMob.requestConsentInfo(),
		])

		if (trackingInfo.status === 'notDetermined') {
			// console.log('Display information before ads load first time')
		} else if (
			trackingInfo.status === 'authorized' &&
			consentInfo.isConsentFormAvailable &&
			consentInfo.status === AdmobConsentStatus.REQUIRED
		) {
			await AdMob.showConsentForm()
		}
	}

	// Регистрируем все слушатели ровно один раз.
	private registerListeners() {
		if (this.listenersRegistered) return
		this.listenersRegistered = true

		AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
			// Subscribe Banner Event Listener
		})

		AdMob.addListener(
			BannerAdPluginEvents.SizeChanged,
			(size: AdMobBannerSize) => {
				console.log(size)
				// Subscribe Change Banner Size
			}
		)

		AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
			console.log(info)
		})
		AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			console.log('Dismissed')
			this.handleInterstitialClosed()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			console.log('FailedToLoad')
			this.handleInterstitialClosed()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			this.handleInterstitialClosed()
		})
	}

	// Гарантированно однократный вызов колбэка закрытия для текущего показа.
	private handleInterstitialClosed() {
		if (this.interstitialClosed) return
		this.interstitialClosed = true
		const cb = this.onInterstitialClosed
		this.onInterstitialClosed = null
		if (cb) cb()
	}

	async showBanner() {
		// Слушатели уже подписаны в initialize(); подписываемся один раз.
		this.registerListeners()

		const options: BannerAdOptions = {
			// TODO: боевой ID баннера
			adId: 'ca-app-pub-9702825788968948/7982858451',
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// margin: 0,
			// npa: true
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		await AdMob.hideBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean
		onInterstitialAdClosed: () => void
	}) {
		// Слушатели уже подписаны в initialize(); подписываемся один раз.
		this.registerListeners()

		const options: AdOptions = {
			// TODO: боевой ID интерстишла
			adId: 'ca-app-pub-9702825788968948/9323860288',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.prepareInterstitial(options)

		if (isFirst) return

		// Частотный кап: если с прошлого показа прошло мало времени —
		// пропускаем рекламу, но обязательно продолжаем игровой поток.
		const now = Date.now()
		if (now - this.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) {
			onInterstitialAdClosed()
			return
		}

		this.onInterstitialClosed = onInterstitialAdClosed
		this.interstitialClosed = false
		this.lastInterstitialAt = now

		await AdMob.showInterstitial()
	}
}

export default new Admob()
