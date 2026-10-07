# Maze of Mouse — ассеты для генерации в GPT

> Эта часть уже выполнена: ассеты встроены в игру (`src/assets/img/v2/`). Актуальное задание — `design-brief/asset-prompts-2.md`.

## Как работать

1. Откройте **один** чат с GPT и сначала загрузите оба макета из `design/` (меню и игровой экран). Напишите: *«Это утверждённый стиль игры. Дальше я буду просить отдельные ассеты в точно таком же стиле.»*
2. Отправляйте промпты по одному, в порядке списка. Каждый промпт копируйте целиком, вместе с общим блоком стиля.
3. Если результат не похож на макет, ответьте: *«Ближе к стилю макета: те же контуры, те же цвета, та же мягкая подсветка.»*
4. Сохраняйте файлы под указанными именами в `design-brief/design/assets/`.
5. Размеры GPT выдаёт только квадрат (1024×1024) или вытянутые 1024×1536 и 1536×1024. До нужных размеров я уменьшу и подгоню сам.

**Не нужно генерировать:** кнопки, деревянные плашки, панель команд, иконки (музыка, звук, назад, корона), звёзды, конфетти. Их я сделаю кодом, тогда подписи на трёх языках всегда поместятся.

---

## Общий блок стиля (вставлять в начало каждого промпта)

```
Style: polished casual mobile game art, same as the attached mockups. Bright cartoon garden theme, soft daylight, clean bold shapes, gentle dark-brown outlines, rich but friendly colors (fresh greens, warm wood browns, cream, sunny yellow, soft grey stone). Family-friendly, cute, not scary. High detail but readable at small size. No text, no letters, no numbers, no logos, no UI, no watermark.
```

---

## 1. Фон главного меню — `menu-bg.png`
Размер генерации: **1024×1536**, фон обычный (не прозрачный).

```
[Общий блок стиля]
Vertical background illustration for the main menu of a mobile game. A sunny cartoon garden: blue sky with soft clouds at the very top, tree branches with leaves framing the top corners, a wooden fence in the back, round green bushes with small white daisies, grey stones, a stone path in the lower middle. On the left, a small arched mouse burrow built into a bush with a wedge of cheese glowing inside.
IMPORTANT composition: leave the upper-middle area (top 35%) calm and fairly empty — a logo will be placed there. Leave the lower-middle area (from 55% to 90% height) calm with soft grass and slight blur — buttons will be placed there. NO characters, NO mouse, NO cat, NO logo, NO buttons. Edges of the image should continue naturally (grass and leaves), so it can be extended.
```

## 2. Логотип — `logo.png`
Размер: **1536×1024**, **прозрачный фон**.

```
[Общий блок стиля, но БЕЗ запрета на текст]
Game logo "MAZE OF MOUSE" on a wooden signboard. Three lines: "MAZE" / "of" (small) / "MOUSE". Big chunky rounded yellow letters with a dark-brown outline and a soft orange shade, like the attached mockup. The wooden board is decorated with green leaves and small white daisies around the edges. Front view, centered, no characters. Transparent background, PNG, nothing outside the sign.
```
> Логотип на всех языках остаётся английским: это название игры в сторе.

## 3. Мышь в полный рост — `mouse-full.png`
Размер: **1024×1024**, **прозрачный фон**.

```
[Общий блок стиля]
Cute cartoon grey mouse character, full body, standing on all fours, three-quarter view facing right, big pink ears, big shiny black eyes, pink nose, thin whiskers, long pink tail, happy curious expression. Same character design as in the attached mockup. Single character, centered, soft contact shadow under feet only. Transparent background, PNG.
```

## 4. Кот выглядывает — `cat-peek.png`
Размер: **1024×1024**, **прозрачный фон**.

```
[Общий блок стиля]
Cute cartoon orange tabby cat peeking over an edge: only the head and two front paws are visible, paws resting on the bottom edge of the image, as if looking over a bush. Big round amber eyes, playful sly smile, pointy ears with red inside. Same character design as in the attached mockup. Not scary. The bottom of the image is cut straight (paws on the edge). Transparent background, PNG.
```

## 5. Фон игрового экрана — `game-bg.png`
Размер: **1024×1536**, фон обычный.

```
[Общий блок стиля]
Vertical background for the gameplay screen of a mobile puzzle game: top-down view of a lawn of soft green grass. Lush leaves, ferns and small white daisies only along the left and right edges and corners, a few small grey pebbles. The whole CENTER (about 80% of the width, from top to bottom) must be calm, flat, low-detail grass with no objects — the game board and controls will cover it. Top-down, no perspective, no characters, no UI.
```

---

## Тайлы поля (вид строго сверху)

Для всех тайлов: размер **1024×1024**, фон обычный, предмет **заполняет весь квадрат**.

Добавлять к каждому:
```
Strictly top-down view, flat orthographic, no perspective, no cast shadow outside the square. The tile fills the whole square edge to edge with a small rounded-corner bevel, like a game board tile. Must stay readable when shrunk to 24×24 pixels: big simple shapes, strong contrast between center and edge.
```

### 6. Дорожка — `tile-path.png`
```
[Общий блок стиля]
Game board floor tile: smooth cream-beige sand/stone slab, very light texture, soft warm color (#F1E3C2 range), slightly lighter center and a subtle darker bevel at the edges. Calm and simple — this is the walkable path.
```

### 7. Камень — `tile-stone-1.png`, `tile-stone-2.png`
Сгенерировать два варианта: второй запросом *«another variation of the same tile, different crack pattern»*.
```
[Общий блок стиля]
Game board wall tile: a single chunky grey stone block seen from above, cool grey (#9AA0A6 range) with a few soft cracks, a lighter top face and darker beveled edges, like the stone blocks in the attached mockup.
```

### 8. Живая изгородь — `tile-hedge-1.png`, `tile-hedge-2.png`
Два варианта, как с камнем.
```
[Общий блок стиля]
Game board wall tile: a dense trimmed green hedge block seen from above, many small rounded leaves, two or three tiny white daisies, darker green at the edges and lighter green on top, like the hedge blocks in the attached mockup.
```

### 9. Выход — `tile-exit.png`
```
[Общий блок стиля]
Game board goal tile: cream path tile (same as the path tile) with a round mouse burrow hole in the center seen from above, dark warm-brown inside, a small yellow cheese wedge at the hole, a couple of grass tufts at the rim. The hole must be clearly visible even when the tile is tiny.
```

---

## Фишки персонажей на поле

Размер **1024×1024**, **прозрачный фон**. Они рисуются поверх клетки и могут быть очень мелкими (до 12px), поэтому:
```
Only the head, front view, perfectly centered, filling about 90% of the square. Thick clean dark outline, big simple shapes, very high contrast, minimal fine detail (no thin whiskers or keep them thick). Must be recognizable at 16×16 pixels. Transparent background, PNG.
```

### 10. Мышь — `token-mouse.png`
```
[Общий блок стиля]
Head of the cute grey cartoon mouse from the mockup: big round pink ears, big black eyes with a white highlight, pink nose, small smile.
```

### 11. Кот — `token-cat.png`
```
[Общий блок стиля]
Head of the cute orange tabby cartoon cat from the mockup: pointy ears with red inside, big amber eyes, pink nose, sly playful smile.
```

---

## 12. Иконка приложения — `app-icon.png`
Размер **1024×1024**, фон обычный.

```
[Общий блок стиля]
Mobile app icon for the game "Maze of Mouse": the cute grey mouse head peeking happily from the bottom, a small piece of a green hedge maze with a cream path behind it, and a tiny cheese wedge. Bright, simple, bold shapes, readable at 48×48 pixels. Square full-bleed composition, important content within the central circle (it will be masked to a circle or rounded square). No text.
```

---

## По желанию (для экранов победы и проигрыша)

### 13. Радостная мышь — `mouse-win.png`
Размер **1024×1024**, прозрачный фон.
```
[Общий блок стиля]
The same cute grey mouse character jumping with joy, arms up, hugging a big yellow cheese wedge, eyes closed in happiness. Full body, single character, centered. Transparent background, PNG.
```

### 14. Кот поймал — `cat-caught.png`
Размер **1024×1024**, прозрачный фон.
```
[Общий блок стиля]
The same cute orange cat character, playful and smug (not scary), sitting with one paw raised, the small grey mouse sitting next to it looking surprised and a bit embarrassed. Friendly, funny, suitable for kids. Transparent background, PNG.
```

---

## Чеклист

| # | Файл | Размер генерации | Прозрачный фон |
|---|---|---|---|
| 1 | `menu-bg.png` | 1024×1536 | нет |
| 2 | `logo.png` | 1536×1024 | да |
| 3 | `mouse-full.png` | 1024×1024 | да |
| 4 | `cat-peek.png` | 1024×1024 | да |
| 5 | `game-bg.png` | 1024×1536 | нет |
| 6 | `tile-path.png` | 1024×1024 | нет |
| 7 | `tile-stone-1.png`, `tile-stone-2.png` | 1024×1024 | нет |
| 8 | `tile-hedge-1.png`, `tile-hedge-2.png` | 1024×1024 | нет |
| 9 | `tile-exit.png` | 1024×1024 | нет |
| 10 | `token-mouse.png` | 1024×1024 | да |
| 11 | `token-cat.png` | 1024×1024 | да |
| 12 | `app-icon.png` | 1024×1024 | нет |
| 13 | `mouse-win.png` (по желанию) | 1024×1024 | да |
| 14 | `cat-caught.png` (по желанию) | 1024×1024 | да |

Если у прозрачного файла фон всё же получился белым или в «шахматку», ничего страшного: пришлите как есть, вырежу сам.
