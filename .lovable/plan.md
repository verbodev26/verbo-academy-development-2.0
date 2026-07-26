## Objetivo

Reemplazar el selector de iconos de lucide-react en el modal de Badges por un **uploader de imagen** que acepte `.gif` (y también `.png/.jpg/.webp` para no romper los badges existentes). La imagen subida se mostrará tanto en Admin > Challenges > Badges como en Student > Challenges cuando el badge esté ganado (manteniendo el `Lock` cuando aún no).

## Cambios de datos (`src/lib/badges-store.ts`)

El campo `icon: BadgeIconId` se reemplaza por:

- `image: string` — data URL de la imagen (`data:image/gif;base64,...`).

Los 8 badges seed dejan de tener `icon`. Para no romper la primera carga después del deploy:
- El seed vendrá con `image: ""` (vacío) en todos los badges.
- Si `image` está vacío, el UI muestra un placeholder neutral (un círculo con el ícono `ImageIcon` de lucide en gris) tanto en Admin como en Student. Así los admins pueden subir la imagen real de cada badge y el catálogo sigue funcionando mientras tanto.
- Se elimina `BADGE_ICON_OPTIONS`, `BadgeIconId` y las constantes/mapa de iconos que ya no aplican.

Migración de localStorage: si al cargar se detecta el shape viejo (`icon: string` sin `image`), se descarta silenciosamente y se vuelve al seed nuevo — es mock data, no hay riesgo de pérdida.

## Cambios de UI

### `src/routes/admin.challenges.tsx` — `BadgeModal`

- Se borra la sección `<Field label="Icon">` con los 9 botones de icono.
- Se reemplaza por `<Field label="Image">` con:
  - Preview cuadrado (h-20 w-20, rounded-full, `object-cover`) de la imagen actual, o un placeholder si aún no hay imagen.
  - Botón **Upload image** que abre un `<input type="file" accept="image/gif,image/png,image/jpeg,image/webp" hidden>`.
  - Hint: "GIF, PNG, JPG or WebP. Recommended: square, up to ~500 KB."
  - Botón **Remove** (solo si ya hay imagen) que vacía el campo.
- Al elegir archivo:
  1. Validar `type` (whitelist arriba) — si no, `alert("Please upload a GIF, PNG, JPG or WebP image.")`.
  2. Validar tamaño ≤ 1 MB — si excede, `alert("Image is too large (max 1 MB).")`. Guardarail contra reventar el cupo de localStorage con GIFs pesados.
  3. Leer con `FileReader.readAsDataURL` y guardar el resultado en el state `image` del modal.
- Al guardar el badge (`handleSave`), se persiste `image` (string, puede ser `""`).

### `src/routes/admin.challenges.tsx` — `BadgesManager`

En cada card de badge, la burbuja con el ícono se sustituye por:
- Si `badge.image`: `<img src={badge.image} alt="" class="h-12 w-12 rounded-full object-cover ring-2 ring-amber-400/40" />`.
- Si no: burbuja gris con ícono `ImageIcon` de lucide como placeholder.

Se elimina el `BADGE_ICON_MAP` de este archivo.

### `src/routes/student.challenges.tsx`

- Se elimina la importación de `BadgeIconId` y `BADGE_ICON_MAP` local (con `Star, Flame, Target, Award, Medal, Crown`).
- Render de cada badge cuando `earned`:
  - Si `b.image`: `<img src={b.image} alt="" class="h-6 w-6 rounded-full object-cover" />` dentro de la burbuja amber.
  - Si no: se sigue mostrando `Lock` (como ahora cuando el badge está locked) — un badge sin imagen configurada no se puede "vestir" todavía.
- Cuando **no** está earned: se mantiene tal cual (`<Lock/>` gris). Sin cambios.
- Se limpian imports lucide huérfanos.

## `DATA_MODEL.md`

Actualizar la ficha de `BadgeDef` (sección 4) para reflejar el cambio de `icon: BadgeIconId` → `image: string (data URL, "" si no configurada)`, y borrar la fila del enum `BadgeIconId`. Nota corta: "Persistido como data URL en `localStorage`; máx. 1 MB por badge para no reventar el cupo del navegador."

## Notas técnicas

- No se agrega Lovable Cloud ni Storage: el resto del proyecto usa localStorage y este cambio se mantiene dentro del mismo patrón. Un data URL de 1 MB pesa ~1.33 MB en base64, así que con 8–15 badges seguimos muy debajo del típico límite de ~5 MB por origen.
- GIFs animados: los data URLs preservan la animación, así que el `<img>` seguirá reproduciendo el GIF sin código extra.
- No se toca el badge Lightning Bolt ni los Season badges (siguen con su ícono/estilo actual).

## Verificación

1. Typecheck limpio.
2. Admin > Challenges > tab **Badges** → editar un badge existente → subir un `.gif` → guardar → la card muestra el GIF animado en Admin.
3. Ir a Student > Challenges → el mismo badge (si el estudiante lo tiene earned) muestra el GIF; si aún no está earned, sigue el candado.
4. Intentar subir un archivo > 1 MB o un `.pdf` → aparece el `alert` correspondiente y no se guarda.
