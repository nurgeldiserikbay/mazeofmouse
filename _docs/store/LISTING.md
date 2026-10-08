# Maze of Mouse — материалы для Google Play

Лимиты Play: название — 30 символов, краткое описание — 80, полное — 4000.
Длины ниже посчитаны.

## Картинки

| Слот в консоли | Файл | Размер |
|---|---|---|
| Значок приложения | `icon-512.png` | 512×512, без прозрачности |
| Графический баннер (обложка) | `feature-1024x500.png` | 1024×500, без прозрачности |
| Скриншоты телефона | `screenshots/phone/<язык>/` | 1080×1920, 7 шт. |
| Скриншоты планшета 7" | `screenshots/tablet7/<язык>/` | 1152×2048, 7 шт. |
| Скриншоты планшета 10" | `screenshots/tablet10/<язык>/` | 1440×2560, 7 шт. |

Все скриншоты 9:16. Языки: `en` — для основного (en-US) описания, `ru` — для русского.
Порядок в консоли — по номерам в именах файлов:

1. `01-menu` — меню, продолжение забега и собранные звёзды
2. `02-tutorial` — обучение: рука на кнопке и путь мыши
3. `03-plan` — набранный маршрут
4. `04-run` — мышь бежит
5. `05-win` — победа и три звезды
6. `06-chapter` — «Глава 1 пройдена»
7. `07-chase` — кот гонится за мышью

Пересобрать:
- скриншоты — `npx vite build --mode development`, затем `node _docs/store/make-store-shots.mjs`;
- значок и обложку — вручную по исходникам из `design-brief/design/` (в репозитории их нет, только локально).

---

## English (en-US)

**Title** (29): `Maze of Mouse: Escape the Cat`

**Short description** (77):
`Plan the mouse's turns, beat the clock and race to the cheese before the cat!`

**Full description:**

```
Help a little mouse find its way home through a garden maze — before the cat catches up!

Maze of Mouse is a cozy logic puzzle for kids and grown-ups. You don't steer the mouse step by step: you plan its turns in advance, press Run, and watch your plan come to life.

HOW TO PLAY
• Tap the arrows to queue up turns.
• The mouse runs straight by itself and takes the next arrow only at a wall or a fork.
• Reach the burrow with cheese before time runs out.
• Too slow, or out of arrows? The cat comes running after the mouse!

WHAT'S INSIDE
• A short picture tutorial — no reading needed.
• Chapters of 10 mazes with checkpoints: a slip-up never sends you back to the very start.
• Earn up to 3 stars per maze — the faster you are, the more stars you get.
• Mazes grow bigger and the cat gets quicker as you go.
• Every maze is new — no two runs are the same.
• Hand-painted garden art, cute characters and cheerful music.
• Plays offline. Progress is saved on your device.

Great for practicing planning, attention and spatial thinking. Easy to start, fun to master!
```

---

## Русский (ru-RU)

**Название** (28): `Maze of Mouse: Убеги от кота`

**Краткое описание** (70):
`Спланируй повороты мышки, успей за время и добеги до сыра раньше кота!`

**Полное описание:**

```
Помоги мышке добраться до норки с сыром через садовый лабиринт — пока её не догнал кот!

Maze of Mouse — уютная логическая головоломка для детей и взрослых. Здесь не нужно вести мышку по шагам: ты заранее планируешь её повороты, нажимаешь «Бежать» и смотришь, как план оживает.

КАК ИГРАТЬ
• Нажимай стрелки, чтобы набрать повороты.
• Мышка бежит прямо сама и берёт следующую стрелку только у стены или на развилке.
• Доберись до норки с сыром, пока не кончилось время.
• Не успел или кончились стрелки? Выбегает кот и бежит за мышкой!

ЧТО ВНУТРИ
• Короткое обучение картинками — читать не нужно.
• Главы по 10 лабиринтов с контрольными точками: ошибка не отправит в самое начало.
• До 3 звёзд за лабиринт — чем быстрее, тем больше звёзд.
• Лабиринты растут, а кот становится быстрее.
• Каждый лабиринт новый — забеги не повторяются.
• Рисованный сад, милые персонажи и весёлая музыка.
• Играть можно без интернета. Прогресс сохраняется на устройстве.

Развивает планирование, внимание и пространственное мышление. Легко начать — интересно освоить!
```

---

## Перед загрузкой сборки — проверено 2026-10-08

| Что | Состояние |
|---|---|
| `APPLICATION_ID` AdMob в манифесте и `admob_app_id` в strings.xml | ✅ есть |
| `outDir` vite = `webDir` Capacitor (`docs`) | ✅ совпадают |
| targetSdk / compileSdk | ✅ 36 |
| `AD_ID` и `ACCESS_ADSERVICES_*` вырезаны из манифеста | ✅ в исходном манифесте; проверить слитый после сборки |
| Детские флаги AdMob, `npa: true` | ✅ |
| Патч баннера AdMob подключён (`patches/`) | ✅ |
| Заставка в WebP (26 файлов) | ✅ 9,5 МБ → 0,8 МБ |
| Иконка приложения новая | ✅ сгенерирована `capacitor-assets` |
| **versionCode** | ⚠️ сейчас 10 — **поднять до 11** перед сборкой, если 10 уже загружался |
| **Rewarded-блок AdMob** | ⚠️ ID не заведён: в релизе «Ещё попытка» не показывается |
| Политика конфиденциальности | ссылка на Google Doc в меню — убедиться, что открывается без входа |
| Подпись AAB | ключ `THELIGHT` — через Android Studio → Generate Signed App Bundle |
