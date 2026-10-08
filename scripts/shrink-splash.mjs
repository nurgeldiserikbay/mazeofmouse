// Пережимает заставку Android из PNG в WebP с тем же именем ресурса.
//
// `capacitor-assets generate` раскладывает splash.png в 26 файлов (плотности ×
// ориентации × ночь) общим весом ~9,5 МБ — больше самой игры; в WebP ~0,8 МБ.
// PNG после этого удаляется: два ресурса с одним именем (splash.png и
// splash.webp) Android не соберёт — «Duplicate resources».
//
// Запускается в build:android сразу после capacitor-assets generate.
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const res = path.resolve('android/app/src/main/res')
let before = 0
let after = 0

for (const dir of fs.readdirSync(res).filter((d) => d.startsWith('drawable'))) {
	const png = path.join(res, dir, 'splash.png')
	if (!fs.existsSync(png)) continue
	const webp = png.replace(/\.png$/, '.webp')
	await sharp(png).webp({ quality: 85, effort: 6 }).toFile(webp)
	before += fs.statSync(png).size
	after += fs.statSync(webp).size
	fs.rmSync(png)
}

console.log('splash:', (before / 1048576).toFixed(1), 'MB ->', (after / 1048576).toFixed(1), 'MB')
