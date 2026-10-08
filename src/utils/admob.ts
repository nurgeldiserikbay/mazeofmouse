import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	RewardAdOptions,
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

// Минимальный интервал между показами интерстишла (частотный кап). Было 60 с:
// при уровне в 30–60 с это выходило почти «объявление на каждый лабиринт».
const INTERSTITIAL_MIN_INTERVAL_MS = 100_000

// Первые минуты после запуска — без полноэкранной рекламы: больше всего
// игроков уходит именно в начале первой сессии.
const INTERSTITIAL_GRACE_MS = 180_000

// Не чаще, чем каждая 3-я завершённая партия (победа или проигрыш). Считается
// здесь, а не в странице, чтобы кап покрывал все точки показа.
const INTERSTITIAL_EVERY_N_GAMES = 3

// Страховка от «зависшего» показа: если событие Dismissed по какой-то причине не
// пришло и приложение не сообщило о возврате на передний план, блокировка
// игрового потока снимается по таймеру. Системные панели этот путь НЕ трогает
// (см. releaseInterstitialFlow) — объявление может быть ещё на экране, и
// возврат immersive-режима спрятал бы его кнопку закрытия под панель.
// Интервал заведомо больше обычного просмотра объявления (5–15 с), чтобы в
// нормальном сценарии первым срабатывал Dismissed.
const INTERSTITIAL_WATCHDOG_MS = 25_000

// Резерв под баннер, пока настоящая высота неизвестна. Совпадает со значением
// по умолчанию в вёрстке (--ad-slot): adaptive-баннер на телефоне — 50dp, и
// полоса чуть выше него читается как отдельная техническая строка.
const BANNER_RESERVE_HEIGHT = 56

const BANNER_AD_ID = 'ca-app-pub-9702825788968948/7982858451'
const INTERSTITIAL_AD_ID = 'ca-app-pub-9702825788968948/9323860288'

/**
 * Реклама за награду: «продолжить, когда кот поймал». Её игрок смотрит сам,
 * по кнопке, поэтому она не мешает так, как полноэкранная.
 *
 * Боевого блока пока нет — его заводит владелец в консоли AdMob. До этого в
 * отладке работает тестовый блок Google, а в релизе предложение «продолжить»
 * просто не показывается (см. rewardedAvailable).
 */
const REWARDED_AD_ID_PROD = '' // TODO: боевой ID блока Rewarded из AdMob
const REWARDED_AD_ID = import.meta.env.DEV
	? 'ca-app-pub-3940256099942544/5224354917'
	: REWARDED_AD_ID_PROD

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
	// Время запуска приложения (для стартовой паузы без рекламы).
	private readonly startedAt = Date.now()
	// Завершённые партии с запуска и их число на момент последнего показа.
	private gamesFinished = 0
	private gamesAtLastInterstitial = 0
	// Таймер-страховка на случай, если Dismissed не придёт.
	private watchdogId: ReturnType<typeof setTimeout> | undefined
	// Состояние предзагруженного объявления.
	private interstitialReady = false
	private interstitialLoading = false
	// Предзагруженная реклама за награду.
	private rewardedReady = false
	private rewardedLoading = false
	private rewardedShowing = false
	// Баннер показан — только в этом случае его имеет смысл возобновлять.
	private bannerVisible = false
	// Системные панели возвращены ради показа объявления и ждут обратной уборки.
	private barsShownForAd = false

	// Кому сообщать, стоит ли в слоте настоящее объявление (см. adsStore).
	private bannerListener: ((live: boolean, height: number) => void) | null = null
	/**
	 * Пришло ли объявление. Ставится только по `Loaded` и снимается только по
	 * отказу или снятию баннера.
	 *
	 * Отдельный флаг нужен потому, что `SizeChanged` о наличии объявления не
	 * говорит ничего: плагин рассылает его и на загрузке — с настоящим размером,
	 * и на отказе, скрытии, снятии — с нулями. Если считать слот живым по любому
	 * из них, после снятия баннера слот останется «живым» с нулевой высотой:
	 * кросс-промо спрячется, а на его месте будет пустая полоса.
	 */
	private bannerLoaded = false
	/** Последняя известная высота объявления. */
	private bannerHeightPx = 0

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

	/** Подписка страницы на состояние слота. Ставится до initialize(). */
	onBannerChange(listener: (live: boolean, height: number) => void) {
		this.bannerListener = listener
	}

	private publishBanner(live: boolean, height = 0) {
		this.bannerListener?.(live, height)
	}

	/**
	 * Нативный баннер рисуется поверх вебвью, а не внутри вёрстки, поэтому сама
	 * страница о нём ничего не знает. Через эту переменную она узнаёт высоту
	 * слота и держит под него место.
	 *
	 * Это же и есть защита от «реклама перекрывает управление»: раньше низ
	 * страницы был отодвинут на фиксированные 65px, а adaptive-баннер на
	 * планшете вырастает до 90dp — и ряд кнопок-стрелок уходил под объявление.
	 *
	 * `null` — вернуться к значению по умолчанию из вёрстки, то есть к резерву.
	 * Место при этом не исчезает: в нём просто снова появляется кросс-промо.
	 */
	private setSlotHeight(px: number | null) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (px === null) root.removeProperty('--ad-slot')
		else root.setProperty('--ad-slot', `${Math.max(44, Math.round(px))}px`)
	}

	/**
	 * Отодвигает рекламную зону туда же, куда система отодвинула баннер.
	 *
	 * Ставится и снимается вместе с самим объявлением, а не один раз при старте:
	 * отодвигать нужно под баннер, а когда баннера нет — не подо что, в полосе
	 * стоит кросс-промо, и уехавшая вверх полоса оставит под собой пустую кромку.
	 *
	 * Само число не считается здесь и не может: его знает браузер и отдаёт через
	 * `env(safe-area-inset-bottom)` — то же окно и те же инсеты, что читает
	 * плагин. Переменной присваивается выражение, а не результат: инсет меняется
	 * вместе с системными панелями, и вычислять его должен CSS.
	 *
	 * Требует `viewport-fit=cover` в `index.html` — без него `env()` всегда ноль
	 * и вся эта настройка молча ничего не делает.
	 */
	private setBannerInset(on: boolean) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (on) {
			// Нижняя граница не ноль, а 16px: плагин отодвигает баннер от низа на
			// системный инсет, взятый нативно (BannerExecutor.java, ветка Android
			// 15+), а вебвью тот же инсет может отдать нулём — в immersive-режиме
			// системные панели скрыты, и env() про них уже ничего не знает. При
			// расхождении зона оказалась бы ровно по высоте объявления, и под
			// висящим баннером снова был бы виден лабиринт. 16px — минимальная
			// подложка, которая закрывает это расхождение и читается как кромка.
			root.setProperty(
				'--ad-inset',
				'max(env(safe-area-inset-bottom, 0px), 16px)'
			)
		} else {
			root.removeProperty('--ad-inset')
		}
	}

	/** Слот пуст: место остаётся, но в нём снова кросс-промо. */
	private clearBanner() {
		this.bannerLoaded = false
		this.bannerHeightPx = 0
		this.setSlotHeight(null)
		this.setBannerInset(false)
		this.publishBanner(false)
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
		void this.preloadRewarded()
	}

	// Регистрируем все слушатели ровно один раз.
	private registerListeners() {
		if (this.listenersRegistered) return
		this.listenersRegistered = true

		AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
			this.bannerLoaded = true
			this.setBannerInset(true)
			this.publishBanner(true, this.bannerHeightPx || BANNER_RESERVE_HEIGHT)
		})

		AdMob.addListener(
			BannerAdPluginEvents.SizeChanged,
			(size: AdMobBannerSize) => {
				// Нули означают, что баннера на экране нет: отказ, скрытие или
				// снятие. Не «объявление нулевой высоты», а его отсутствие.
				if (!size.height) {
					this.clearBanner()
					return
				}

				// Настоящая высота заменяет резерв, как только стала известна. О
				// самом наличии объявления это событие не говорит, поэтому
				// состояние слота остаётся тем, какое было.
				this.bannerHeightPx = size.height
				this.setSlotHeight(size.height)
				this.setBannerInset(true)
				this.publishBanner(this.bannerLoaded, size.height)
			}
		)

		// Нет заполнения, нет сети, нет объявления: место остаётся за слотом, но
		// рисует в нём снова кросс-промо. Обнулять резерв нельзя — вёрстка
		// прыгнет вниз ровно так же, как раньше прыгала вверх при появлении
		// баннера.
		AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
			this.clearBanner()
			// Ничего не показано — значит следующий заход имеет право попробовать
			// снова, а не считать баннер уже стоящим.
			this.bannerVisible = false
		})

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
		this.clearBanner()
		await AdMob.hideBanner()
	}

	async removeBanner() {
		this.bannerVisible = false
		this.clearBanner()
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

	/** Отметить завершённую партию (победу или проигрыш) — для частотного капа. */
	gameFinished() {
		this.gamesFinished += 1
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

		// Первый заход новичка, стартовая пауза и частотный кап (по времени и по
		// числу партий) — реклама не показывается.
		const now = Date.now()
		if (
			isFirst ||
			now - this.startedAt < INTERSTITIAL_GRACE_MS ||
			now - this.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS ||
			this.gamesFinished - this.gamesAtLastInterstitial <
				INTERSTITIAL_EVERY_N_GAMES
		) {
			onInterstitialAdClosed()
			void this.preloadInterstitial()
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
		this.gamesAtLastInterstitial = this.gamesFinished

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

	/** Есть ли что предложить игроку: блок заведён и объявление уже загружено. */
	get rewardedAvailable() {
		return !!REWARDED_AD_ID && this.initialized && this.rewardedReady
	}

	async preloadRewarded() {
		if (!REWARDED_AD_ID || !this.initialized) return
		if (this.rewardedReady || this.rewardedLoading) return

		this.rewardedLoading = true
		try {
			const options: RewardAdOptions = {
				adId: REWARDED_AD_ID,
				isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
				npa: true,
				// immersiveMode не выставляем — та же причина, что у интерстишла.
			}
			await AdMob.prepareRewardVideoAd(options)
			this.rewardedReady = true
		} catch (error) {
			console.log(error)
			this.rewardedReady = false
		} finally {
			this.rewardedLoading = false
		}
	}

	/**
	 * Показ рекламы за награду. true — игрок досмотрел и награда положена.
	 *
	 * Промис плагина разрешается наградой, когда SDK засчитал просмотр, и
	 * отклоняется, если объявление закрыли раньше или оно не показалось.
	 * Системные панели на время показа возвращаются, как у интерстишла.
	 */
	async rewarded(): Promise<boolean> {
		if (!this.rewardedAvailable || this.rewardedShowing) return false

		this.rewardedReady = false
		this.rewardedShowing = true
		await this.showSystemBars()

		try {
			const reward = await AdMob.showRewardVideoAd()
			return !!reward
		} catch (error) {
			console.log(error)
			return false
		} finally {
			this.rewardedShowing = false
			this.barsShownForAd = false
			void this.restoreImmersiveMode()
			void this.preloadRewarded()
		}
	}
}

export default new Admob()
