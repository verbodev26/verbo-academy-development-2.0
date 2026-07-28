## Objetivo

Reemplazar por completo la sección 2 del homepage (`src/routes/index.tsx`, sección `id="how"`) — hoy 3 cards con `PhotoPlaceholder` — por el grid de 5 cards de la referencia, con personas recortadas en PNG transparente y gradientes de color.

## Lo que necesito de ti antes de implementar

Las **5 imágenes PNG con fondo transparente**, una por card:

1. Hombre con celular (chaqueta de mezclilla) → card amarilla "Learn on Your Own Terms"
2. Dos personas conversando → card morada "Speak with confidence, not pressure"
3. Mujer celebrando con celular → card verde "Track real, tangible progress"
4. Dos instructores brazos cruzados → card navy "Guided by expert Instructors"
5. Pareja riendo con celulares → card roja "Level Up with Fun Challenges"

Sin ellas puedo dejar la estructura lista, pero las cards quedarían sin arte.

## Layout

```text
Desktop (lg+)                          Mobile
┌──────────┬──────────┬──────────┐     ┌──────────┐
│ Amarilla │ Morada   │          │     │  1 card  │
├──────────┼──────────┤   Roja   │     ├──────────┤
│  Verde   │  Navy    │  (alta)  │     │  1 card  │
└──────────┴──────────┴──────────┘     └──────────┘  ...apiladas
```

- Grid de 3 columnas × 2 filas en `lg`; la card roja usa `row-span-2`.
- En `md`: 2 columnas, la roja pasa a ancho completo.
- En mobile: una columna apilada, imagen arriba y texto abajo en cada card.
- Se mantiene la animación de reveal escalonado (`data-reveal` / `verbo-reveal`) que ya existe.

## Cards — contenido y tratamiento

| Card | Gradiente | Texto | Imagen |
|---|---|---|---|
| Learn on Your Own Terms | `card-gradient-gold` | navy | izquierda |
| Speak with confidence, not pressure | `card-gradient-orchid` | navy | derecha |
| Track real, tangible progress | `card-gradient-lime` | navy | derecha |
| Guided by expert Instructors | `card-gradient-navy` | blanco | izquierda |
| Level Up with Fun Challenges | **nuevo** `card-gradient-crimson` | blanco | abajo, grande |

Textos exactos de la captura, respetando los **bolds** internos (`24/7, 365`, `anywhere in the world`, `Insights & Book Clubs`, `Clear milestones and visual tracking`, `qualified, human instructors`).

Encabezado de la sección: se mantiene "Built around you, not the other way around." con **"Built around you,"** en naranja de marca, y el subtítulo cambia a *"Learning designed around your routine, not the other way around. Study on your time, practice with purpose, and see results that stick"*.

## Detalles técnicos

- **`src/styles.css`**: nueva utility `@utility card-gradient-crimson` con `linear-gradient(150deg, #c2410c 0%, #b52904 55%, #760137 100%)`, junto a las demás `card-gradient-*`.
- **Assets**: cada imagen se sube con `lovable-assets create` desde `/mnt/user-uploads/` y se referencia vía su `.asset.json` en `src/assets/` — sin binarios en el repo.
- **`src/routes/index.tsx`**: se extrae un componente local `BenefitCard` (props: gradiente, tono de texto, eyebrow, título, cuerpo, imagen, posición de imagen) para no repetir markup 5 veces. Se elimina el uso de `PhotoPlaceholder` en esta sección y el import si queda sin uso.
- Imágenes con `object-contain`, ancladas al borde inferior de la card, `alt` descriptivo y `loading="lazy"`.
- Responsive: `min-w-0` en los contenedores de texto y `shrink-0` en el arte para evitar clipping en pantallas angostas.
- Sin cambios en lógica de datos ni en `DATA_MODEL.md` (es puramente presentacional).

## Siguiente paso

Adjunta las 5 imágenes y las integro; si prefieres, puedo dejar primero la estructura con los gradientes y sumar el arte después.