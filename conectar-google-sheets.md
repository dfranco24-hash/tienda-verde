# Conectar la app de Recepción con Google Sheets

Tu Google Sheet **es** la base de datos de la app: al abrir la app, los datos
(catálogo de materiales, proveedores y recepciones) se cargan en vivo desde
tu Sheet. Al registrar una recepción con el botón **"Guardar recepción"**, o
al cambiar el estado de pago, la app escribe directamente en el Sheet — no
hay nada quemado en el código ni pasos manuales de "subir/bajar".

Tiempo estimado: 10 minutos, una sola vez.

---

## Paso 1 — Crea el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva.
2. Ponle el nombre que quieras, por ejemplo "Base de datos — Recepción reciclaje".
3. No necesitas crear las pestañas "Materiales", "Proveedores" y "Recepciones" a mano — el script las crea solas la primera vez que la app escribe en ellas.

---

## Paso 2 — Pega el código del conector

1. En tu Sheet, ve a **Extensiones → Apps Script**.
2. Borra el contenido de ejemplo (`function myFunction() {...}`) que aparece.
3. Abre el archivo **`codigo-google-apps-script.gs`** que te compartí, copia todo su contenido y pégalo ahí.
4. Busca esta línea cerca del inicio:
   ```
   var TOKEN = "cambia-esta-clave-1234";
   ```
   Cámbiala por una palabra o frase secreta tuya (sin espacios es más fácil). **Anótala** — la vas a necesitar en el Paso 4.
5. Guarda el proyecto (ícono de disquete o `Ctrl+S`). Ponle un nombre si te lo pide, por ejemplo "Conector Recepción".

---

## Paso 3 — Publica el script como aplicación web

1. Arriba a la derecha, haz clic en **Implementar → Nueva implementación**.
2. En "Selecciona el tipo", haz clic en el ícono de engranaje ⚙️ y elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario

   *(Esto es necesario para que la app pueda conectarse sin que tengas que iniciar sesión de Google cada vez. La única protección es el TOKEN del Paso 2 — no compartas esa URL ni el token con nadie que no deba ver o modificar tus datos.)*
4. Haz clic en **Implementar**.
5. Google te va a pedir autorizar permisos (es tu propio script accediendo a tu propio Sheet) — acepta.
6. Copia la **URL de la aplicación web** que aparece — termina en `/exec`. Guárdala, es la que necesitas en el Paso 4.

---

## Paso 4 — Conecta la app

1. Abre `recepcion-material-reciclable.html` en un editor de texto (Bloc de notas, VS Code, etc. — no lo abras en el navegador todavía).
2. Cerca del inicio del bloque `<script type="text/babel">`, busca estas dos líneas:
   ```js
   const SHEETS_URL = "PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT";
   const SHEETS_TOKEN = "PEGA_AQUI_TU_TOKEN";
   ```
3. Reemplaza:
   - `SHEETS_URL` → la URL que copiaste en el Paso 3 (la que termina en `/exec`)
   - `SHEETS_TOKEN` → la clave secreta que pusiste en el Paso 2
4. Guarda el archivo y ábrelo en el navegador.

Si tu Google Sheet está vacío (recién creado), la app te va a ofrecer un botón
**"Cargar catálogo y datos históricos"** — eso sube de una sola vez el
catálogo de materiales y las 238 recepciones reales que ya tenías registradas,
para no perder ese historial al pasar a Sheets. Si prefieres partir de cero,
usa "Empezar en blanco".

Desde ese momento:
- Al abrir la app, siempre carga los datos actuales de tu Sheet.
- **"Guardar recepción"** agrega la fila directamente en la pestaña **Recepciones** (y crea el proveedor en **Proveedores** si es nuevo).
- Tocar el estado ("Pendiente"/"Pagado") de una recepción actualiza esa misma fila en el Sheet.
- El botón **🔄** junto al historial vuelve a cargar los datos por si alguien editó el Sheet directamente (por ejemplo, para cambiar precios en la pestaña **Materiales**).

---

## Cómo funciona (para que sepas qué esperar)

- Cada guardado es inmediato: si no hay internet o el Apps Script no responde, la app te avisa con un error y **no** guarda el registro — inténtalo de nuevo cuando tengas conexión.
- La URL + el token le dan a cualquiera que los tenga acceso de lectura y escritura a tu Sheet a través del script — trátalos como una contraseña. Como quedan escritos en el archivo HTML, no compartas ese archivo con quien no deba tener ese acceso.
- Puedes editar precios o agregar materiales directamente en la pestaña **Materiales** del Sheet (columnas: `id`, `nombre`, `rate`, `color`, `precioPendiente`) y luego tocar 🔄 en la app para verlos reflejados.
- Google Apps Script tiene un límite gratuito de ejecuciones al día (normalmente de sobra para uso de una bodega), y a veces tarda 1–2 segundos en responder — es normal.
- El botón **💾 Copia de seguridad** dentro de la app descarga una foto de solo lectura de lo que hay ahora mismo en tu Sheet (para guardar aparte); no sirve para restaurar datos — eso se hace editando el Sheet directamente.

## Si algo falla

- **"Token inválido"** → revisa que el `SHEETS_TOKEN` del HTML sea exactamente igual al `TOKEN` del script (mayúsculas/minúsculas incluidas).
- **"Falta conectar Google Sheets" al abrir la app** → todavía no reemplazaste `SHEETS_URL`/`SHEETS_TOKEN` en el HTML (Paso 4).
- **No responde / error de red** → confirma que la URL termine en `/exec` (no en `/dev`), y que en el Paso 3 hayas elegido "Cualquier usuario".
- **Cambiaste el código del script después de publicarlo** → tienes que hacer **Implementar → Gestionar implementaciones → ✏️ Editar → Nueva versión** para que los cambios se apliquen a la URL ya publicada.
