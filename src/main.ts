import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createI18n } from 'vue-i18n'

import en from './langs/en'

import './style.scss'

import App from './App.vue'

const i18n = createI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: {
		en,
	},
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')
