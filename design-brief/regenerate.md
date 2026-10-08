# 14 картинок для перегенерации в ChatGPT

Генерировать в **обычном чате ChatGPT с генерацией картинок**, не через агента с доступом к репозиторию.

**Перед первым промптом** загрузите в чат образцы из `design-brief/refs/`: `mockup-menu.png`, `mockup-game.png`, `tile-stone.png`, `tile-hedge.png`, `tile-path.png`, `token-cat.png`. Напишите:

> Это утверждённый стиль моей игры. Дальше я попрошу отдельные картинки — рисуй их в точно таком же стиле: та же мягкая рисованная мультяшная манера, те же контуры, свет и масштаб деталей. Не делай плоскую векторную графику.

Дальше отправляйте промпты по одному. Каждый уже содержит всё нужное, копируйте его целиком.

Готовые файлы сохраняйте в `design-brief/assets-2/` **под теми же именами**, заменяя старые.

| # | Файл | Формат |
|---|---|---|
| 1 | `bg-cellar.png` | вертикальный 1024×1536 |
| 2 | `bg-kitchen.png` | вертикальный 1024×1536 |
| 3 | `bg-pantry.png` | вертикальный 1024×1536 |
| 4 | `bg-attic.png` | вертикальный 1024×1536 |
| 5 | `bg-night.png` | вертикальный 1024×1536 |
| 6 | `tile-cellar-floor.png` + `tile-cellar-wall.png` | квадрат 1024×1024 |
| 7 | `tile-kitchen-floor.png` + `tile-kitchen-wall.png` | квадрат 1024×1024 |
| 8 | `tile-pantry-floor.png` + `tile-pantry-wall.png` | квадрат 1024×1024 |
| 9 | `tile-attic-floor.png` + `tile-attic-wall.png` | квадрат 1024×1024 |
| 10 | `token-cat-hunt.png` | квадрат 1024×1024, прозрачный фон |

---

## 1. `bg-cellar.png`

```
Generate a vertical image 1024x1536. Painterly cartoon mobile game art, exactly the same style as the attached mockups: soft rich lighting, gentle dark-brown outlines, detailed but friendly, NOT flat vector art. No text, no UI, no characters.

Background for the gameplay screen of a maze puzzle, top-down view of a cozy stone cellar floor: cool blue-grey worn flagstones with soft texture, wooden barrels, jars of jam and a lantern ONLY along the left and right edges and in the corners, light frost patterns in the corners, a little warm candle light. The whole CENTER (about 80% of the width, from top to bottom) must stay calm, softly lit and low-detail, because the game board covers it.
```

## 2. `bg-kitchen.png`

```
Generate a vertical image 1024x1536. Painterly cartoon mobile game art, exactly the same style as the attached mockups: soft rich lighting, gentle dark-brown outlines, detailed but friendly, NOT flat vector art. No text, no UI, no characters.

Background for the gameplay screen of a maze puzzle, top-down view of a warm cartoon kitchen floor: checkered cream and terracotta ceramic tiles with soft shine, a corner of a striped rug, a wooden spoon, bread crumbs, tomatoes and carrots ONLY along the left and right edges and in the corners. Warm morning sunlight. The whole CENTER (about 80% of the width, from top to bottom) must stay calm and low-detail, because the game board covers it.
```

## 3. `bg-pantry.png`

```
Generate a vertical image 1024x1536. Painterly cartoon mobile game art, exactly the same style as the attached mockups: soft rich lighting, gentle dark-brown outlines, detailed but friendly, NOT flat vector art. No text, no UI, no characters.

Background for the gameplay screen of a maze puzzle, top-down view of a pantry floor of warm wooden planks, with sacks of flour, jars of pickles, red apples and a big cheese wheel ONLY along the left and right edges and in the corners. Cozy warm light. The whole CENTER (about 80% of the width, from top to bottom) must stay calm and low-detail, because the game board covers it.
```

## 4. `bg-attic.png`

```
Generate a vertical image 1024x1536. Painterly cartoon mobile game art, exactly the same style as the attached mockups: soft rich lighting, gentle dark-brown outlines, detailed but friendly, NOT flat vector art. No text, no UI, no characters.

Background for the gameplay screen of a maze puzzle, top-down view of a cozy attic floor of old wooden boards, a warm sunset light patch from a round window, an old toy train, a teddy bear, a trunk and stacks of books ONLY along the left and right edges and in the corners. No cobwebs, nothing scary. The whole CENTER (about 80% of the width, from top to bottom) must stay calm and low-detail, because the game board covers it.
```

## 5. `bg-night.png`

```
Generate a vertical image 1024x1536. Painterly cartoon mobile game art, exactly the same style as the attached mockups: soft rich lighting, gentle dark-brown outlines, detailed but friendly, NOT flat vector art. No text, no UI, no characters.

The same garden lawn as the background of the attached gameplay mockup, but at night: soft deep-blue moonlight on the grass, glowing yellow fireflies, small warm paper lanterns, leaves and white flowers ONLY along the left and right edges and in the corners. Cozy and magical, not scary. The whole CENTER (about 80% of the width, from top to bottom) must stay calm and low-detail, because the game board covers it.
```

---

Для тайлов (6–9) каждый промпт генерирует **одну** картинку. Отправляйте пол и стену отдельными сообщениями.

## 6. Погреб

`tile-cellar-floor.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-path images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Cellar floor tile: one smooth light grey-blue flagstone with soft painted texture and a subtle lighter center. Calm and simple — this is the walkable path. Must stay readable when shrunk to 24x24 pixels.
```

`tile-cellar-wall.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-hedge images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Cellar wall tile: a chunky block of dark brown-grey brick masonry seen from above, a few rounded bricks with soft highlights, darker beveled edge, clearly a solid wall. Must stay readable when shrunk to 24x24 pixels.
```

## 7. Кухня

`tile-kitchen-floor.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-path images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Kitchen floor tile: one cream ceramic floor tile with a soft shine and a thin darker grout edge. Calm and simple — this is the walkable path. Must stay readable when shrunk to 24x24 pixels.
```

`tile-kitchen-wall.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-hedge images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Kitchen wall tile: the top of a wooden kitchen cabinet seen from above, warm honey-colored wood with visible planks and grain, soft highlights, darker beveled edge, clearly a solid wall. Must stay readable when shrunk to 24x24 pixels.
```

## 8. Кладовая

`tile-pantry-floor.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-path images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Pantry floor tile: three light wooden floor boards seen from above with soft painted grain, warm and calm — this is the walkable path. Must stay readable when shrunk to 24x24 pixels.
```

`tile-pantry-wall.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-hedge images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Pantry wall tile: the top of a sturdy wooden crate seen from above, dark wood frame with a cross plank, soft highlights, darker beveled edge, clearly a solid wall. Must stay readable when shrunk to 24x24 pixels.
```

## 9. Чердак

`tile-attic-floor.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-path images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Attic floor tile: old warm-brown wooden boards seen from above with soft painted grain and a slightly dusty look, calm — this is the walkable path. Must stay readable when shrunk to 24x24 pixels.
```

`tile-attic-wall.png`
```
Generate a square image 1024x1024. A single game board tile in exactly the same painterly cartoon style as the attached tile-stone and tile-hedge images, NOT flat vector art. Strictly top-down view, no perspective, the tile fills the whole square edge to edge with a small rounded beveled border, no shadow outside the square. No text.

Attic wall tile: a neat stack of old colorful books and a cardboard box seen from above, chunky shapes, soft highlights, darker beveled edge, clearly a solid wall. Must stay readable when shrunk to 24x24 pixels.
```

---

## 10. `token-cat-hunt.png`

```
Generate a square image 1024x1024 with a TRANSPARENT background, PNG. Exactly the same character and painterly style as the attached token-cat image — the same cute orange tabby cat head, front view.

Change only the expression to playful "hunting" mode: narrowed determined eyes, ears pointed forward, a tiny mischievous grin. Still cute and friendly, not scary. Thick clean dark outline, big simple shapes, recognizable at 16x16 pixels. Only the head, centered, filling about 90% of the square. Nothing else in the image.
```
