import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createI18n } from 'vue-i18n'

import en from './langs/en'
import ru from './langs/ru'
import kk from './langs/kk'

import './style.scss'

import App from './App.vue'

const messages = { en, ru, kk }

type Locale = keyof typeof messages

const FALLBACK_LOCALE: Locale = 'en'

// Язык берём из локали устройства (в Android WebView navigator.language её
// отражает). Учитываем только языковую часть: 'ru-RU' и 'ru' должны дать один
// и тот же результат. Незнакомый язык — английский.
function detectLocale(): Locale {
	const preferred = navigator.languages?.length
		? navigator.languages
		: [navigator.language]

	for (const tag of preferred) {
		const lang = tag?.toLowerCase().split('-')[0]
		if (lang && lang in messages) return lang as Locale
	}

	return FALLBACK_LOCALE
}

// legacy: false — Options API режим vue-i18n объявлен устаревшим.
// globalInjection оставляет $t доступным прямо в шаблонах.
const i18n = createI18n({
	legacy: false,
	globalInjection: true,
	locale: detectLocale(),
	fallbackLocale: FALLBACK_LOCALE,
	messages,
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')
