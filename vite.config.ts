import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
	base: './',
	build: {
		outDir: './docs',
	},
	css: {
		preprocessorOptions: {
			// Старый JS-API Dart Sass объявлен устаревшим и будет удалён в Sass 2.0.
			scss: { api: 'modern-compiler' },
		},
	},
	plugins: [vue(), svgLoader()],
	resolve: {
		alias: [
			{
				find: '@',
				replacement: path.resolve(__dirname, './src/'),
			},
		],
	},
})
