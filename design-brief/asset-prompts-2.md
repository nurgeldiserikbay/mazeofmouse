# Maze of Mouse — ассеты, часть 2: сыр и главы

Нужны для второй части развития игры: сыр в коридорах и новые главы, у каждой из которых своё оформление и одна новая механика.

| Глава | Место | Новая механика |
|---|---|---|
| 1 | Сад | — (уже готово) |
| 2 | Погреб | **лёд**: мышь проскальзывает развилки и тормозит только у стены |
| 3 | Кухня | **конвейер**: плитка со стрелкой сама поворачивает мышь |
| 4 | Кладовая | **кнопка и дверь**: дверь открывается, когда мышь проехала по кнопке |
| 5 | Чердак | **норки-телепорты**: нырнула в одну — вынырнула из парной |
| 6 | Ночной сад | **умный кот**: бежит к мыши кратчайшим путём |

---

## Как работать

Все пути ниже — от корня репозитория `mazeofmouse`.

**Образцы стиля** лежат в `design-brief/refs/`:

| Файл | Что это |
|---|---|
| `mockup-menu.png` | утверждённый макет главного меню |
| `mockup-game.png` | утверждённый макет игрового экрана |
| `tile-stone.png`, `tile-hedge.png`, `tile-path.png` | готовые тайлы стены и прохода — новые тайлы должны быть в той же манере и того же масштаба |
| `token-mouse.png`, `token-cat.png` | персонажи |

**Готовые картинки** кладутся в `design-brief/assets-2/` под именами из чеклиста в конце файла (например `design-brief/assets-2/tile-ice.png`). Формат — PNG.

### Если вы — GPT с доступом к этому репозиторию

1. Прочитайте этот файл целиком и откройте все картинки из `design-brief/refs/` — это эталон стиля.
2. Сгенерируйте ассеты по промптам ниже, по одному, в порядке чеклиста. К каждому промпту добавляйте общий блок стиля (и блок для тайлов, если это тайл) и используйте картинки из `refs/` как образец.
3. Сохраните каждый файл в `design-brief/assets-2/` точно под именем из чеклиста и закоммитьте в ветку `main`. Другие файлы репозитория не меняйте.
4. Прозрачный фон получился белым — так и сохраняйте, разработчик вырежет фон сам.

### Если генерируете вручную в ChatGPT

1. Откройте новый чат и загрузите картинки из `design-brief/refs/`. Напишите: *«Это утверждённый стиль игры и её тайлы. Дальше прошу отдельные ассеты в точно таком же стиле: та же толщина контуров, та же мягкая подсветка, тот же масштаб деталей.»*
2. Отправляйте промпты по одному, каждый целиком вместе с общим блоком стиля.
3. Сохраняйте файлы под именами из чеклиста в `design-brief/assets-2/` (или просто в эту папку на компьютере — разработчик закоммитит сам).

**Не нужно генерировать:** стрелки, звёзды, кнопки, плашки, цифры — это делается кодом.

---

## Общий блок стиля (в начало каждого промпта)

```
Style: polished casual mobile game art, exactly matching the attached mockups and tiles. Cartoon, soft daylight, clean bold shapes, gentle dark-brown outlines, rich but friendly colors. Family-friendly, cute, not scary. Readable when shrunk small. No text, no letters, no numbers, no logos, no UI, no watermark.
```

## Общий блок для тайлов (добавлять к каждому тайлу)

```
Strictly top-down view, flat orthographic, no perspective, no cast shadow outside the square. The tile fills the whole square edge to edge with a small rounded-corner bevel, like the attached stone and hedge tiles. Must stay readable when shrunk to 24x24 pixels: big simple shapes, strong contrast between center and edge.
```

Все тайлы: **1024×1024**, фон обычный (тайл заполняет весь квадрат).

---

## 0. Сыр — `cheese.png`
Размер **1024×1024**, **прозрачный фон**. Лежит в коридорах как бонус.

```
[Общий блок стиля]
A single small wedge of yellow cheese with round holes, seen from slightly above, thick dark-brown outline, a small white shine, a soft sparkle star next to it. Centered, fills about 70% of the square. Must be recognizable at 16x16 pixels. Transparent background, PNG.
```

---

## Глава 2 — Погреб (лёд)

### `bg-cellar.png` — фон экрана
Размер **1024×1536**, фон обычный.
```
[Общий блок стиля]
Vertical background for a gameplay screen, top-down view of a cozy stone cellar floor: cool blue-grey flagstones, a few jars of jam and wooden barrels only along the left and right edges and corners, frost patterns in the corners, a little warm light. The whole CENTER (about 80% of the width, top to bottom) must be calm and low-detail — the game board covers it. No characters.
```

### `tile-cellar-floor.png` — проход
```
[Общий блок стиля] [Общий блок для тайлов]
Cellar floor tile: smooth light grey-blue flagstone with a very subtle texture, calm and simple. This is the walkable path.
```

### `tile-cellar-wall.png` — стена
```
[Общий блок стиля] [Общий блок для тайлов]
Cellar wall tile: a chunky block of dark grey-brown brick masonry seen from above, a few bricks with rounded edges, darker beveled border.
```

### `tile-ice.png` — лёд (механика)
```
[Общий блок стиля] [Общий блок для тайлов]
Ice floor tile: glossy pale-blue ice with white streaks and two small shiny highlights, a few tiny cracks, clearly slippery. Must be instantly distinguishable from the grey floor tile even at small size.
```

---

## Глава 3 — Кухня (конвейер)

### `bg-kitchen.png` — фон экрана
Размер **1024×1536**, фон обычный.
```
[Общий блок стиля]
Vertical background for a gameplay screen, top-down view of a warm cartoon kitchen floor: checkered cream and terracotta tiles, a rug corner, a fallen spoon, bread crumbs and a few vegetables only along the left and right edges and corners. The whole CENTER (about 80% of the width) must be calm and low-detail. No characters.
```

### `tile-kitchen-floor.png` — проход
```
[Общий блок стиля] [Общий блок для тайлов]
Kitchen floor tile: one cream ceramic floor tile with a thin darker grout edge, very subtle shine. Calm and simple.
```

### `tile-kitchen-wall.png` — стена
```
[Общий блок стиля] [Общий блок для тайлов]
Kitchen wall tile: a wooden kitchen cabinet block seen from above, warm honey-colored wood top with visible planks and a darker beveled edge.
```

### `tile-conveyor.png` — конвейер (механика)
```
[Общий блок стиля] [Общий блок для тайлов]
Conveyor belt tile seen from above: a dark grey rubber belt with ribbed stripes running left to right, metal rollers visible at the left and right edges, and ONE big bright yellow arrow painted on the belt pointing RIGHT. The arrow must be very clear. (The game will rotate this tile for other directions.)
```

---

## Глава 4 — Кладовая (кнопка и дверь)

### `bg-pantry.png` — фон экрана
Размер **1024×1536**, фон обычный.
```
[Общий блок стиля]
Vertical background for a gameplay screen, top-down view of a pantry floor made of wooden planks, with sacks of flour, jars, apples and a cheese wheel only along the left and right edges and corners. The whole CENTER (about 80% of the width) must be calm and low-detail. No characters.
```

### `tile-pantry-floor.png` — проход
```
[Общий блок стиля] [Общий блок для тайлов]
Pantry floor tile: light wooden floor boards (three planks) seen from above, warm and calm.
```

### `tile-pantry-wall.png` — стена
```
[Общий блок стиля] [Общий блок для тайлов]
Pantry wall tile: a stack of wooden crates seen from above, dark wood frame with a cross plank, chunky and solid.
```

### `tile-button.png` — кнопка (механика)
```
[Общий блок стиля] [Общий блок для тайлов]
Floor tile with a big round red pressure button in the center seen from above, the button has a shiny highlight and a dark ring around it, on a light wooden floor board base. Very clear at small size.
```

### `tile-door.png` — закрытая дверь (механика)
```
[Общий блок стиля] [Общий блок для тайлов]
A closed little wooden gate seen from above blocking the path: vertical wooden bars with a red metal band and a small red round lock in the middle (same red as the pressure button). Clearly reads as "closed, blocked".
```
> Открытую дверь рисовать не нужно: открытая — это обычный пол.

---

## Глава 5 — Чердак (телепорты)

### `bg-attic.png` — фон экрана
Размер **1024×1536**, фон обычный.
```
[Общий блок стиля]
Vertical background for a gameplay screen, top-down view of a cozy attic floor: old wooden boards, a round window light patch, old toys, a trunk, books and cobweb-free corners, only along the left and right edges and corners. Warm sunset light. The whole CENTER (about 80% of the width) must be calm and low-detail. No characters.
```

### `tile-attic-floor.png` — проход
```
[Общий блок стиля] [Общий блок для тайлов]
Attic floor tile: dusty warm-brown old wooden boards seen from above, calm and simple.
```

### `tile-attic-wall.png` — стена
```
[Общий блок стиля] [Общий блок для тайлов]
Attic wall tile: a stack of old books and a cardboard box seen from above, chunky shapes, darker beveled edge.
```

### `tile-portal-a.png` и `tile-portal-b.png` — парные норки (механика)
Два запроса: первый — фиолетовая, второй — бирюзовая.
```
[Общий блок стиля] [Общий блок для тайлов]
A magic mouse hole seen from above on a wooden floor board: a round dark hole with a glowing swirling PURPLE ring around it and a few small sparkles. Must clearly look like a portal, different from a normal burrow.
```
Для второго замените `PURPLE` на `TURQUOISE`.

---

## Глава 6 — Ночной сад (умный кот)

### `bg-night.png` — фон экрана
Размер **1024×1536**, фон обычный.
```
[Общий блок стиля]
The same garden lawn background as in the attached gameplay mockup, but at night: deep blue moonlight, glowing fireflies, small lanterns only along the left and right edges. Cozy, not scary. The whole CENTER (about 80% of the width) must be calm and low-detail. No characters.
```

### `token-cat-hunt.png` — кот «на охоте»
Размер **1024×1024**, **прозрачный фон**.
```
[Общий блок стиля]
Head of the same cute orange tabby cat from the mockup, front view, but in playful "hunting" mode: narrowed determined eyes, ears forward, a tiny mischievous grin. Still cute and not scary. Thick clean dark outline, big simple shapes, recognizable at 16x16 pixels. Centered, fills 90% of the square. Transparent background, PNG.
```

---

## Чеклист

| # | Файл | Размер генерации | Прозрачный |
|---|---|---|---|
| 0 | `cheese.png` | 1024×1024 | да |
| 1 | `bg-cellar.png` | 1024×1536 | нет |
| 2 | `tile-cellar-floor.png` | 1024×1024 | нет |
| 3 | `tile-cellar-wall.png` | 1024×1024 | нет |
| 4 | `tile-ice.png` | 1024×1024 | нет |
| 5 | `bg-kitchen.png` | 1024×1536 | нет |
| 6 | `tile-kitchen-floor.png` | 1024×1024 | нет |
| 7 | `tile-kitchen-wall.png` | 1024×1024 | нет |
| 8 | `tile-conveyor.png` | 1024×1024 | нет |
| 9 | `bg-pantry.png` | 1024×1536 | нет |
| 10 | `tile-pantry-floor.png` | 1024×1024 | нет |
| 11 | `tile-pantry-wall.png` | 1024×1024 | нет |
| 12 | `tile-button.png` | 1024×1024 | нет |
| 13 | `tile-door.png` | 1024×1024 | нет |
| 14 | `bg-attic.png` | 1024×1536 | нет |
| 15 | `tile-attic-floor.png` | 1024×1024 | нет |
| 16 | `tile-attic-wall.png` | 1024×1024 | нет |
| 17 | `tile-portal-a.png` | 1024×1024 | нет |
| 18 | `tile-portal-b.png` | 1024×1024 | нет |
| 19 | `bg-night.png` | 1024×1536 | нет |
| 20 | `token-cat-hunt.png` | 1024×1024 | да |

Можно частями: сначала сыр и погреб (№0–4), остальное по мере готовности.
