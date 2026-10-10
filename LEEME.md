# Reset

Botón de emergencia mental. Ansiedad → perspectiva → presente → siguiente acción, en ~20 segundos.

## Cómo funciona

1. **Respira.** Un círculo crece 4 s (inhala) y se encoge 6 s (exhala). Automático.
2. **¿Qué está pasando?** Trabajo · Dinero · Otra cosa. Un toque.
3. **Una frase + una pregunta.** Sí / No. Un toque.
4. **Actúa.** o **Suelta.** Un toque y terminas.

Tres toques. Cada vez que abres el icono empieza desde cero.

## Archivos

```
reset/
├── index.html            pantallas
├── styles.css            diseño (claro/oscuro automático)
├── app.js                lógica
├── mensajes.js           ← frases de RESET (no cambia en v2)
├── preguntas.js          v2: biblioteca y editor «Mis preguntas» (sin contenido personal)
├── sw.js                 hace que abra al instante y funcione sin internet
├── manifest.webmanifest  nombre e icono de la app
└── *.png                 iconos
```

Sin backend, sin cuentas, sin analítica. Lo único que guarda (en tu iPhone) es qué frases viste últimamente, para no repetirlas.

---

## Publicarlo (10 minutos, gratis)

Necesita estar en internet con HTTPS para poder instalarse. La opción más simple:

### Opción A — Netlify Drop (sin código, arrastrar y soltar)

1. En tu computadora, descomprime `reset.zip`. Te queda una carpeta llamada `reset`.
2. Entra a **app.netlify.com/drop**.
3. Crea una cuenta gratuita (con Google o email). Así el sitio no expira.
4. **Arrastra la carpeta `reset`** completa a la página.
5. En unos segundos te da una dirección tipo `https://algo-raro-123.netlify.app`.
6. Opcional: en *Site configuration → Change site name* ponle algo como `reset-hector` → `https://reset-hector.netlify.app`.

Para actualizar textos: edita `mensajes.js`, entra a tu sitio en Netlify → *Deploys* → arrastra la carpeta otra vez.

### Opción B — GitHub Pages

1. Crea un repositorio en github.com (puede llamarse `reset`).
2. *Add file → Upload files* → sube **el contenido** de la carpeta (no la carpeta en sí).
3. *Settings → Pages → Branch: main → Save*.
4. Tu dirección será `https://TU-USUARIO.github.io/reset/`.

Funciona igual en cualquier hosting estático (Cloudflare Pages, Vercel, tu propio servidor). Solo son archivos.

---

## Instalarlo en el iPhone

1. Abre la dirección en **Safari** (tiene que ser Safari).
2. Toca el botón **Compartir** (cuadro con flecha hacia arriba).
3. Baja y toca **Agregar a pantalla de inicio** / *Add to Home Screen*.
4. Si aparece la opción **Abrir como app web**, déjala activada. Nombre: `Reset`. Toca **Agregar**.
5. Listo: icono negro con un círculo naranja. Se abre a pantalla completa, sin barra de Safari, como app independiente.

Ábrelo una vez con internet. Después funciona sin conexión.

**Tip:** ponlo en tu Dock o en la primera pantalla, donde tu pulgar llega sin pensar.

---

## Detalles

- **Volver a usarlo:** al terminar verás "Listo." Desliza hacia arriba para salir. La próxima vez que lo abras, empieza de nuevo con la respiración. Si lo dejas a medias más de 1 minuto, también reinicia.
- **Vibración:** en iOS 18 o superior hay un toque háptico sutil al presionar botones. En versiones anteriores Safari no lo permite; todo lo demás funciona igual.
- **Cambiar textos:** abre `mensajes.js` en cualquier editor de texto. Cada tarjeta es `["Frase principal", "Frase secundaria"]`. Respeta comillas y comas. Vuelve a publicar; el cambio aparece la segunda vez que abras la app.
- **Probar en computadora:** en la carpeta, ejecuta `python3 -m http.server` y abre `http://localhost:8000`.

---

## RESET v2

- **Pantalla principal:** «¿Qué está pasando?» (camino rápido, igual que antes) + «Respirar y enfocar» + «Mis preguntas».
- **Respirar y enfocar:** respiración 4-2-4 → ámbito de la vida → preguntas → continuar a RESET o finalizar.
- **Mis preguntas:** las preguntas y categorías se escriben y editan en el propio iPhone. Se guardan solo en el dispositivo (no están en este repositorio, no están cifradas y no se sincronizan). Hay exportar/importar respaldo en JSON.
- **Actualizar:** sube los archivos nuevos y cambia `CACHE` en `sw.js` (y `ASSETS` si agregas archivos).
