// Скриншоты Maze of Mouse для Google Play: телефон, 7" и 10" планшет, en и ru.
//
// Запуск (из корня проекта):
//   npx vite build --mode development     # собрать docs/
//   node _docs/store/make-store-shots.mjs
//
// Почему скрипт: витрину приходится переснимать при каждом изменении вида, а
// Play требует все три класса устройств — пустые планшетные слоты он считает
// «не рассчитано на планшеты». Соотношение строго 9:16 (у 03-MathBoxes был
// отказ за 5:8). Таймеры игры не разгоняем: это ломает саму партию (см. 04),
// вместо этого ждём нужное состояние на экране.
import { createRequire } from 'module'
import { readdirSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DOCS = path.join(ROOT, 'docs')
const OUT = path.join(ROOT, '_docs/store/screenshots')

// patchright берём из расширения VS Code DS CodeGPT: в проекте его нет.
const EXT = path.join(process.env.USERPROFILE || '', '.vscode/extensions')
const ext = readdirSync(EXT).filter((d) => d.startsWith('danielsanmedium.dscodegpt-')).sort().pop()
const { chromium } = createRequire(path.join(EXT, ext, 'standalone') + '/')('patchright')

// Все размеры — ровно 9:16.
const DEVICES = [
	{ name: 'phone', width: 360, height: 640, scale: 3 }, // 1080×1920
	{ name: 'tablet7', width: 576, height: 1024, scale: 2 }, // 1152×2048
	{ name: 'tablet10', width: 720, height: 1280, scale: 2 }, // 1440×2560
]
const LOCALES = ['en-US', 'ru-RU']

// --- статический сервер над docs/ ---
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.json': 'application/json' }
const server = createServer((req, res) => {
	let p = path.join(DOCS, decodeURIComponent(req.url.split('?')[0]))
	if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(DOCS, 'index.html')
	res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' })
	res.end(readFileSync(p))
}).listen(0)
const URL = `http://localhost:${server.address().port}/`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Витрине реклама не нужна: прячем полосу кросс-промо и отдаём её место игре.
const NO_ADS = ':root{--ad-band:0px !important}.slot{display:none !important}'

async function open(browser, device, locale, save) {
	const ctx = await browser.newContext({
		viewport: { width: device.width, height: device.height },
		deviceScaleFactor: device.scale,
	})
	const page = await ctx.newPage()
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
	await page.addInitScript(
		([locale, save, css]) => {
			Object.defineProperty(navigator, 'languages', { get: () => [locale, locale.slice(0, 2)] })
			Object.defineProperty(navigator, 'language', { get: () => locale })
			localStorage.clear()
			if (save) localStorage.setItem('CapacitorStorage.gameData', JSON.stringify(save))
			document.addEventListener('DOMContentLoaded', () => {
				const s = document.createElement('style')
				s.textContent = css
				document.head.appendChild(s)
			})
		},
		[locale, save, NO_ADS]
	)
	await page.goto(URL)
	await page.waitForSelector('.ui-button')
	await sleep(1200)
	return { ctx, page }
}

// Решатель: читает лабиринт из DOM и набирает команды по правилам игры —
// мышь бежит прямо до стены или развилки.
async function solve(page) {
	const grid = await page.evaluate(() =>
		[...document.querySelectorAll('.maze__row')].map((r) =>
			[...r.querySelectorAll('.maze__col')].map((c) => (c.classList.contains('cell') ? 1 : 0))
		)
	)
	const H = grid.length
	const W = grid[0].length
	const free = (x, y) => y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === 0
	const D = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }
	const cross = (x, y) => Object.values(D).filter(([dx, dy]) => free(x + dx, y + dy)).length >= 3
	const key = (x, y) => x + ',' + y
	const prev = new Map([[key(0, 0), null]])
	const queue = [[0, 0]]
	while (queue.length) {
		const [x, y] = queue.shift()
		for (const [dx, dy] of Object.values(D)) {
			if (free(x + dx, y + dy) && !prev.has(key(x + dx, y + dy))) {
				prev.set(key(x + dx, y + dy), [x, y])
				queue.push([x + dx, y + dy])
			}
		}
	}
	const route = []
	for (let c = [W - 1, H - 1]; c; c = prev.get(key(...c))) route.unshift(c)
	const index = new Map(route.map((p, i) => [key(...p), i]))
	const cmds = []
	let pos = [0, 0]
	while (!(pos[0] === W - 1 && pos[1] === H - 1)) {
		const next = route[index.get(key(...pos)) + 1]
		const name = Object.keys(D).find((k) => D[k][0] === next[0] - pos[0] && D[k][1] === next[1] - pos[1])
		cmds.push(name)
		const [dx, dy] = D[name]
		while (free(pos[0] + dx, pos[1] + dy)) {
			pos = [pos[0] + dx, pos[1] + dy]
			if (cross(...pos)) break
		}
	}
	return cmds
}

const BTN = { left: 1, right: 2, top: 3, bottom: 4 }
const press = async (page, cmds) => {
	for (const c of cmds) await page.locator(`.commands button:nth-child(${BTN[c]})`).click({ force: true })
}
const run = (page) => page.locator('.commands button:nth-child(6)').click({ force: true })
const veteran = (level, extra = {}) => ({
	gameStats: [
		{ name: 'Andrey', score: 14, date: Date.now() - 864e5 },
		{ name: 'Mia', score: 9, date: Date.now() - 2 * 864e5 },
	],
	tutorialPassed: true,
	currentLevel: level,
	name: 'Andrey',
	stars: { 0: 3, 1: 3, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 2, 8: 3, 9: 3, 10: 3 },
	...extra,
})

async function shoot(browser, device, locale) {
	const dir = path.join(OUT, device.name, locale.slice(0, 2))
	mkdirSync(dir, { recursive: true })
	const shot = (page, name) => page.screenshot({ path: path.join(dir, name + '.png') })

	// 1. Меню: незаконченный забег и собранные звёзды.
	let { ctx, page } = await open(browser, device, locale, veteran(11))
	await shot(page, '01-menu')
	await ctx.close()

	// 2. Обучение: рука на кнопке и путь мыши на поле (второй учебный лабиринт).
	;({ ctx, page } = await open(browser, device, locale, null))
	await page.locator('.ui-button').first().click()
	await sleep(500)
	await page.locator('.desc .ui-button').click()
	await sleep(1300)
	for (let guard = 0; guard < 6 && (await page.locator('.commands button.wanted').count()); guard++) {
		const isRun = await page.locator('.commands__run.wanted').count()
		await page.locator('.commands button.wanted').click({ force: true })
		await sleep(300)
		if (isRun) break
	}
	await page.waitForSelector('.next-modal', { timeout: 20000 })
	await sleep(500)
	await page.locator('.next-modal .ui-button').click()
	await sleep(1300)
	await page.locator('.commands button.wanted').click({ force: true })
	await sleep(600)
	await shot(page, '02-tutorial')
	await ctx.close()

	// 3–5. Планирование, бег, победа со звёздами.
	;({ ctx, page } = await open(browser, device, locale, veteran(11)))
	await page.locator('.ui-button').first().click()
	await sleep(1500)
	const cmds = await solve(page)
	await press(page, cmds)
	await sleep(400)
	await shot(page, '03-plan')
	await run(page)
	await sleep(1400)
	await shot(page, '04-run')
	await page.waitForSelector('.next-modal', { timeout: 40000 })
	await sleep(1100)
	await shot(page, '05-win')
	await ctx.close()

	// 6. Конец главы: десятый лабиринт.
	;({ ctx, page } = await open(browser, device, locale, veteran(9)))
	await page.locator('.ui-button').first().click()
	await sleep(1500)
	await press(page, await solve(page))
	await run(page)
	await page.waitForSelector('.next-modal', { timeout: 40000 })
	await sleep(1100)
	await shot(page, '06-chapter')
	await ctx.close()

	// 7. Погоня: неверный первый поворот — команды кончились, выбегает кот.
	;({ ctx, page } = await open(browser, device, locale, veteran(13)))
	await page.locator('.ui-button').first().click()
	await sleep(1500)
	const first = (await solve(page))[0]
	const wrong = { left: 'top', right: 'bottom', top: 'left', bottom: 'right' }[first]
	await press(page, [wrong])
	await run(page)
	await page.waitForFunction(
		() => [...document.querySelectorAll('.cat')].some((c) => getComputedStyle(c).opacity === '1'),
		null,
		{ timeout: 40000 }
	)
	await sleep(900)
	await shot(page, '07-chase')
	await ctx.close()

	console.log('ok', device.name, locale)
}

let browser
try {
	browser = await chromium.launch()
} catch {
	browser = await chromium.launch({ channel: 'chrome' })
}
try {
	for (const device of DEVICES) for (const locale of LOCALES) await shoot(browser, device, locale)
} finally {
	await browser.close()
	server.close()
}
