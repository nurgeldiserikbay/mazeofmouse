import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

// Целевая аудитория игры в Google Play включает детей, поэтому действует
// Families Policy: каждый рекламный запрос должен быть помечен как детский,
// ограничен инвентарём с рейтингом G и неперсонализирован. Именно отключение
// этих флагов дало отказ «ad content is not consistent with the app's content
// rating» — обратно на false их возвращать нельзя.
const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: true,
	tagForUnderAgeOfConsent: true,
	maxAdContentRating: MaxAdContentRating.General,
}

// Полноэкранная реклама включена по решению владельца. Google дважды отклонял
// игру по Families Ad Format Requirements («unclosable ads»), поэтому показ ниже
// построен так, чтобы объявление физически не могло заблокировать игру:
//  - immersiveMode не выставляется, системные панели на время показа возвращаются
//    (иначе с Android 15 кнопка закрытия уходит под панель или вырез);
//  - объявление грузится заранее, точка показа никогда не ждёт загрузку;
//  - игровой поток не зависит от колбэка закрытия, а сам колбэк подстрахован
//    событием возврата приложения на передний план и таймером.
const INTERSTITIALS_ENABLED: boolean = true

// Минимальный интервал между показами интерстишла (частотный кап).
const INTERSTITIAL_MIN_INTERVAL_MS = 60_000

// Страховка от «зависшего» показа: если событие Dismissed по какой-то причине не
// пришло и приложение не сообщило о возврате на передний план, блокировка
// игрового потока снимается по таймеру. Системные панели этот путь НЕ трогает
// (см. releaseInterstitialFlow) — объявление может быть ещё на экране, и
// возврат immersive-режима спрятал бы его кнопку закрытия под панель.
// Интервал заведомо больше обычного просмотра объявления (5–15 с), чтобы в
// нормальном сценарии первым срабатывал Dismissed.
const INTERSTITIAL_WATCHDOG_MS = 25_000

const BANNER_AD_ID = 'ca-app-pub-9702825788968948/7982858451'
const INTERSTITIAL_AD_ID = 'ca-app-pub-9702825788968948/9323860288'

class Admob {
	// Слушатели регистрируются один раз за жизненный цикл приложения,
	// чтобы не накапливались при каждом показе рекламы.
	private listenersRegistered = false
	// Колбэк текущего показа интерстишла и флаг «уже закрыт».
	private onInterstitialClosed: (() => void) | null = null
	private interstitialClosed = true
	// Приложение уходило в фон во время текущего показа. Activity объявления
	// принадлежит SDK, поэтому её открытие выглядит для нас как уход в фон, а
	// возврат на передний план после этого означает, что объявление закрыто.
	private sawBackgroundDuringShow = false
	// Время последнего фактического показа интерстишла (для частотного капа).
	private lastInterstitialAt = 0
	// Таймер-страховка на случай, если Dismissed не придёт.
	private watchdogId: ReturnType<typeof setTimeout> | undefined
	// Состояние предзагруженного объявления.
	private interstitialReady = false
	private interstitialLoading = false
	// Баннер показан — только в этом случае его имеет смысл возобновлять.
	private bannerVisible = false
	// Системные панели возвращены ради показа объявления и ждут обратной уборки.
	private barsShownForAd = false

	// Детская конфигурация запросов применяется именно в initialize(), поэтому ни
	// один запрос рекламы не должен уйти раньше. Промис кэшируется: точки показа
	// рекламы ждут этот же промис, повторная инициализация не происходит.
	private initPromise: Promise<void> | null = null
	private initialized = false

	initialize() {
		if (!this.initPromise) {
			this.initPromise = this.runInitialize()
		}
		return this.initPromise
	}

	private async runInitialize() {
		await AdMob.initialize(AdMobInitializationOptions)
		this.initialized = true

		this.registerListeners()

		// Форму согласия UMP осознанно не запрашиваем. Запросы помечены
		// tagForUnderAgeOfConsent, а у пользователя ниже возраста согласия
		// согласие на персонализацию не спрашивают — показывать ему форму выбора
		// персонализации неверно и по GDPR, и по Families Policy.
		// Неперсонализированную выдачу обеспечивает npa: true в каждом запросе.

		// Первое объявление греем сразу после инициализации, чтобы к первой точке
		// показа оно уже было готово и игре не пришлось ничего ждать.
		void this.preloadInterstitial()
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
			this.interstitialReady = true
			this.interstitialLoading = false
		})
		AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			console.log('Dismissed')
			this.interstitialReady = false
			this.handleInterstitialClosed()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			console.log('FailedToLoad')
			this.interstitialReady = false
			this.interstitialLoading = false
			this.handleInterstitialClosed()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			console.log('FailedToShow')
			this.interstitialReady = false
			this.handleInterstitialClosed()
		})

		// Второй, независимый от SDK механизм закрытия. Событие Dismissed приходит
		// из плагина и на части устройств теряется; возврат приложения на передний
		// план после ухода в фон означает, что activity объявления уже завершилась.
		CapacitorApp.addListener('appStateChange', ({ isActive }) => {
			if (!isActive) {
				if (!this.interstitialClosed) this.sawBackgroundDuringShow = true
				return
			}

			if (!this.interstitialClosed && this.sawBackgroundDuringShow) {
				this.handleInterstitialClosed()
			} else {
				// Поток мог быть разблокирован страхующим таймером раньше, чем игрок
				// закрыл объявление. Тогда системные панели всё ещё подняты, и вернуть
				// полноэкранный режим игры нужно именно здесь: barsShownForAd true
				// только внутри окна показа, так что лишний раз это не сработает.
				this.restoreBarsAfterAd()
			}

			// Возвращаясь из фона, Android нередко оставляет баннер скрытым.
			if (this.bannerVisible) {
				AdMob.resumeBanner().catch((error) => console.log(error))
			}
		})
	}

	// Объявление точно ушло с экрана: снимаем блокировку игрового потока и
	// возвращаем полноэкранный режим игры.
	private handleInterstitialClosed() {
		this.releaseInterstitialFlow()
		this.restoreBarsAfterAd()
	}

	// Снимает только блокировку игрового потока, не касаясь системных панелей.
	// Вызывается в том числе страхующим таймером, когда объявление, возможно, всё
	// ещё на экране: скрыть панели в этот момент означало бы увести кнопку
	// закрытия под них. Гарантированно однократный вызов колбэка на показ.
	private releaseInterstitialFlow() {
		if (this.interstitialClosed) return
		this.interstitialClosed = true
		this.sawBackgroundDuringShow = false
		if (this.watchdogId) {
			clearTimeout(this.watchdogId)
			this.watchdogId = undefined
		}
		const cb = this.onInterstitialClosed
		this.onInterstitialClosed = null
		if (cb) cb()

		// Готовим следующее объявление заранее: к следующей точке показа оно должно
		// быть загружено, чтобы игра снова ничего не ждала.
		void this.preloadInterstitial()
	}

	// Immersive-режим возвращается ровно один раз и только после того, как
	// объявление действительно закрылось. Флаг живёт отдельно от
	// interstitialClosed: если поток уже разблокирован таймером, панели всё равно
	// должны вернуться позже — по Dismissed или по возврату приложения из фона.
	private restoreBarsAfterAd() {
		if (!this.barsShownForAd) return
		this.barsShownForAd = false
		void this.restoreImmersiveMode()
	}

	// Пока показывается полноэкранная реклама, системные панели должны быть
	// видны. Activity объявления принадлежит SDK, а с Android 15 система
	// принудительно рисует его edge-to-edge: если игра держит immersive-режим,
	// кнопка закрытия может оказаться под навигационной панелью или вырезом —
	// ровно то, что ревью описывает как «unclosable ads». Ошибки здесь не
	// критичны: не удалось вернуть панели — реклама всё равно показывается.
	private async showSystemBars() {
		this.barsShownForAd = true

		try {
			await Fullscreen.deactivateImmersiveMode()
			await StatusBar.show()
		} catch (error) {
			console.log(error)
		}
	}

	private async restoreImmersiveMode() {
		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
		} catch (error) {
			console.log(error)
		}
	}

	async showBanner() {
		// Ждём детскую конфигурацию; если инициализация упала — баннер не
		// запрашиваем, показать нетегированный запрос хуже, чем не показать ничего.
		await this.initialize().catch((error) => console.log(error))
		if (!this.initialized) return

		// Слушатели уже подписаны в initialize(); подписываемся один раз.
		this.registerListeners()

		const options: BannerAdOptions = {
			adId: BANNER_AD_ID,
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// margin: 0,
			npa: true,
		}

		await AdMob.showBanner(options)
		this.bannerVisible = true
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
		this.bannerVisible = true
	}

	async hideBanner() {
		this.bannerVisible = false
		await AdMob.hideBanner()
	}

	async removeBanner() {
		this.bannerVisible = false
		await AdMob.removeBanner()
	}

	// Загружает объявление заранее, вне точки показа. initialize() здесь не
	// ожидается намеренно: метод вызывается и из самой инициализации, ожидание
	// собственного промиса привело бы к взаимной блокировке.
	async preloadInterstitial() {
		if (!INTERSTITIALS_ENABLED || !this.initialized) return
		if (this.interstitialReady || this.interstitialLoading) return

		this.interstitialLoading = true

		try {
			await AdMob.prepareInterstitial(this.interstitialOptions())
			this.interstitialReady = true
		} catch (error) {
			console.log(error)
			this.interstitialReady = false
		} finally {
			this.interstitialLoading = false
		}
	}

	private interstitialOptions(): AdOptions {
		return {
			adId: INTERSTITIAL_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// immersiveMode осознанно не выставляем: с Android 15 (edge-to-edge)
			// он уводит кнопку закрытия рекламы под системные панели или вырез, и
			// объявление становится незакрываемым — это отказ по Families Policy.
		}
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean
		onInterstitialAdClosed: () => void
	}) {
		// Во всех отказных ветках колбэк вызывается сразу же: точка показа никогда
		// не остаётся висеть в ожидании рекламы.
		if (!INTERSTITIALS_ENABLED || !this.initialized) {
			onInterstitialAdClosed()
			return
		}

		// Первый заход новичка и частотный кап — реклама не показывается.
		const now = Date.now()
		if (
			isFirst ||
			now - this.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS
		) {
			onInterstitialAdClosed()
			return
		}

		// Объявление не готово — ждать загрузку нельзя, это и есть «реклама мешает
		// пользоваться приложением». Пропускаем показ и греем следующее.
		if (!this.interstitialReady) {
			onInterstitialAdClosed()
			void this.preloadInterstitial()
			return
		}

		this.interstitialReady = false
		this.onInterstitialClosed = onInterstitialAdClosed
		this.interstitialClosed = false
		this.sawBackgroundDuringShow = false
		this.lastInterstitialAt = now

		// Возвращаем системные панели, чтобы кнопка закрытия объявления заведомо
		// была в видимой области, и ставим страховку на случай пропавшего Dismissed.
		await this.showSystemBars()
		this.watchdogId = setTimeout(() => {
			console.log('Interstitial dismiss watchdog fired')
			this.releaseInterstitialFlow()
		}, INTERSTITIAL_WATCHDOG_MS)

		try {
			await AdMob.showInterstitial()
		} catch (error) {
			console.log(error)
			this.handleInterstitialClosed()
		}
	}
}

export default new Admob()
