# MESSA — Sistema Premium de Gestión de Restaurante

Creado por **Matías Colimodio** — matiascolimodio@gmail.com

---

## 🚀 Correr localmente

```bash
cd messa
npm install
cp .env.example .env        # completá al menos SESSION_SECRET y las 3 cuentas (ver abajo)
npm run build
npm start
```

## 🔑 Primer login — generá tus contraseñas reales

Ya **no existen contraseñas de demo en el código**. Antes de entrar a `/login`:

```bash
# 1. Generá un secreto de sesión
openssl rand -hex 32
# → pegalo en .env como SESSION_SECRET

# 2. Generá el hash de cada contraseña que quieras usar
node scripts/generar-hash.js "TuContraseñaDeCreador"
node scripts/generar-hash.js "TuContraseñaDeAdmin"
node scripts/generar-hash.js "TuContraseñaDeEditor"
```

Completá en tu `.env` (ver `.env.example` para la lista completa):
```
SESSION_SECRET=...
CREATOR_EMAIL=matiascolimodio@gmail.com
CREATOR_PASSWORD_HASH=<hash generado>
ADMIN_EMAIL=admin@tu-restaurante.com
ADMIN_PASSWORD_HASH=<hash generado>
EDITOR_EMAIL=editor@tu-restaurante.com
EDITOR_PASSWORD_HASH=<hash generado>
```

Reiniciá el servidor y ya podés entrar a `/login` con esas credenciales reales — se verifican con bcrypt del lado del servidor, nunca en el navegador.

---

## 🔐 Acceso a la mesa por QR, código y RFID/NFC

Cada mesa tiene un **código alfanumérico** (`XXXX-XXXX`) que viaja dentro de su
QR. Sin ese código la mesa no abre: escribir `/mesa/m2` a mano ahora muestra una
pantalla de acceso, y `?staff=true` exige sesión real del panel.

El código lo **deriva el servidor** con HMAC-SHA256 a partir del id de la mesa y
una clave que sólo vive en variables de entorno, así que el navegador no puede
calcular el de la mesa de al lado.

Todo se administra en **Administración → Mesas y códigos QR**: hoja imprimible
con un QR por mesa, descarga PNG individual, vinculación de tarjetas RFID/NFC,
alta y baja de mesas, y regeneración de códigos.

Detalle completo y límites conocidos: [docs/qr-mesas-y-rfid.md](./docs/qr-mesas-y-rfid.md).

---

## 🌐 Dónde se publica

| | Vista previa (GitHub Pages) | Despliegue completo (Cloudflare) |
|---|---|---|
| Carta, modo vista, mesa, panel | ✅ | ✅ |
| Login real con bcrypt | ❌ (entra en modo demo, con aviso) | ✅ |
| Cobro con Mercado Pago | ❌ | ✅ |
| Códigos de mesa firmados en el servidor | ❌ (semilla pública de demo) | ✅ |

- **Vista previa**: se publica sola en cada push con
  `.github/workflows/pages.yml`, pero **antes hay que activar Pages una vez a
  mano**: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
  El token de Actions no tiene permiso para crear el sitio por su cuenta, así
  que ese click sólo lo puede dar quien administra el repositorio. Una vez
  hecho, el sitio queda en `https://matkrol77.github.io/messa/` y se actualiza
  con cada push (si el último intento falló, volvé a ejecutarlo desde la pestaña
  Actions).
- **Despliegue completo**: `pnpm cf:deploy`, o el workflow
  `.github/workflows/cloudflare.yml` cargando los secretos
  `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

---

## ⚠️ Los hash de bcrypt en el archivo `.env`

Un hash de bcrypt empieza con `$2b$12$…`, y Next.js **expande variables** dentro
de los archivos `.env`: `$2b` y `$12` se reemplazan por vacío y el hash queda
roto. El login falla con "Email o contraseña incorrectos" aunque la contraseña
sea la correcta.

Escapá cada `$` con una barra invertida al pegarlo en `.env`:

```
CREATOR_PASSWORD_HASH=\$2b\$12\$K1x...
```

`node scripts/generar-hash.js "tu contraseña"` ya imprime las dos versiones: la
escapada para `.env` y la original para `wrangler secret put`, donde no hace
falta escapar nada.

---

## ☁️ Deploy en Cloudflare

```bash
npx wrangler login
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CREATOR_EMAIL
npx wrangler secret put CREATOR_PASSWORD_HASH
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put EDITOR_EMAIL
npx wrangler secret put EDITOR_PASSWORD_HASH
# opcionales:
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_WEBHOOK_SECRET

npm run cf:deploy
```

`npm run cf:preview` para probarlo local con el runtime real de Cloudflare antes de publicar.

---

## ✅ Qué se resolvió en esta vuelta (los 7 puntos de seguridad/arquitectura)

**1. Login movido a verificación server-side real**
Las contraseñas ya no viven en el store de Zustand ni en localStorage. `/api/auth/login` compara con **bcrypt** contra hashes guardados en variables de entorno del servidor (`.env.example`), y devuelve una cookie firmada (HMAC-SHA256, `httpOnly`, `secure`) — no un JWT de terceros, pero sí verificado y firmado del lado del servidor, imposible de falsificar sin conocer `SESSION_SECRET`. El `MASTER_PASSWORD` hardcodeado desapareció completamente del código fuente. `/admin/layout.tsx` ahora valida la sesión llamando a `/api/auth/me` en cada carga, no confiando en nada guardado en el navegador.
*Límite honesto: crear nuevos editores en tiempo de ejecución sigue necesitando una base de datos (las variables de entorno son estáticas) — ver sección Supabase abajo.*

**2 y 3. Mercado Pago real, verificado en dos capas**
- El botón "Pagar con Mercado Pago" llama a `/api/mercadopago/crear-preferencia`, que lee el Access Token **solo del servidor** (`MP_ACCESS_TOKEN`) y devuelve el `init_point` real — el cliente hace `window.location.href` a Mercado Pago de verdad, ya no hay `setTimeout` simulando nada (el simulador solo aparece si no configuraste el token, claramente marcado como "demo").
- Cuando MP redirige de vuelta, `/api/mercadopago/verificar-pago` vuelve a consultar el pago **contra la API real de Mercado Pago** antes de que el cliente pueda marcar la mesa como pagada. El cliente nunca decide por sí solo.
- El webhook (`/api/webhook/mercadopago`) ahora valida la firma `x-signature` (HMAC con `MP_WEBHOOK_SECRET`) y vuelve a consultar el pago real antes de confiar en el aviso — la verificación está completa y correcta.
*Límite honesto: sin una base de datos compartida, el webhook no tiene dónde escribir "esta mesa ya está paga" para que lo vea el navegador del comensal — por eso el flujo usa la verificación al volver del checkout como mecanismo principal. El webhook queda listo y correcto para el día que conectes Supabase.*

**4. Imágenes comprimidas antes de guardar**
`ImageUploader` ahora redimensiona (máx. 1000px de lado) y reencodea a JPEG en el navegador antes de guardar, reduciendo bastante el peso. Sigue guardándose como base64 en localStorage (no hay Storage real conectado todavía) — ver sección Supabase para el paso siguiente.

**5. Supabase — schema listo, conexión pendiente de tus credenciales**
No pude conectarlo de verdad porque necesito un proyecto de Supabase con sus credenciales, que solo vos podés crear. Lo que sí dejé listo:
- `supabase/schema.sql` — todas las tablas (mesas, pedidos, platos, insumos, reservas, gastos, etc.) con Realtime habilitado, para correr con un solo click en el SQL Editor de Supabase.
- `lib/supabase.ts` — cliente ya armado, seguro (no rompe nada si faltan las variables).
- **Para que yo (u otra sesión) lo termine de conectar**, necesito que me pases: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` de tu proyecto (Supabase Dashboard → Project Settings → API). Con eso reemplazo cada acción de `lib/store.ts` por una llamada a Supabase + suscripción realtime, y ahí sí el celular y la PC van a ver lo mismo al instante.

**6. Access Token de Mercado Pago fuera del cliente**
Ya no es un campo del formulario en `/admin/pagos` ni vive en el store persistido — se lee exclusivamente de `process.env.MP_ACCESS_TOKEN` dentro de las API routes. La Public Key sí se mantiene editable ahí porque no es secreta por diseño.

**7. Honestidad en /admin/integraciones y la pestaña POS**
Ambas pantallas ahora dejan explícito, con una advertencia visible, que lo que existe es el **endpoint técnico** (`/api/webhook/delivery`, `/api/webhook/pedido`) — funciona y recibe datos — pero "conectado" en la UI es solo configuración guardada localmente, no una integración real con la API de PedidosYa/Rappi/Uber Eats/tu POS, y sin base de datos, hoy un pedido entrante quedaría solo en el log del servidor, no en tu pantalla de Cocina.

---

## 🔌 Conectar Supabase (el paso que falta para que todo sea 100% real)

1. Creá un proyecto gratis en supabase.com
2. Andá a SQL Editor → pegá el contenido de `supabase/schema.sql` → Run
3. Copiá tus credenciales desde Project Settings → API
4. Agregalas a tu `.env` / variables de entorno de tu hosting
5. Pasame esas 3 credenciales (o hacelo vos siguiendo los comentarios en `lib/store.ts`) y migro cada acción del store para que lea/escriba en Supabase con Realtime en vez de localStorage — ahí sí un pedido hecho desde el celular aparece al instante en el Dashboard de la PC, sin excepciones.

---

## 🔑 Roles y accesos

| Rol | Puede hacer |
|---|---|
| **Creador** | Todo — tema/marca, fidelidad, y es quien coordina el cambio de contraseñas de las otras cuentas |
| **Dueño/Admin** | Carta, stock, pagos, finanzas, cierre, sucursales |
| **Editor** | Carta y stock únicamente |

Cambiar una contraseña: `node scripts/generar-hash.js "nueva"` → actualizar la variable de entorno → redeploy. Ver detalle en `/admin/usuarios` dentro de la app.

---

## ⚠️ Otras cosas a tener en cuenta antes de cobrar de verdad

1. **Facturación fiscal (AFIP)**: el sistema genera "eco-tickets" internos, no comprobantes fiscales válidos — eso requiere un integrador certificado por AFIP.
2. **Rate limiting del login**: hoy es en memoria por instancia del servidor — en un entorno serverless con múltiples instancias no es un límite global perfecto. Para eso hace falta KV o base de datos.
3. **Variables de entorno**: nunca subas tu `.env` real a git (ya está en `.gitignore`).

---

## 🗺️ Mapa de páginas

**Comensales:** `/` · `/vista` · `/m/[codigo]` (destino del QR) · `/rfid/[tag]` · `/mesa/[id]` (requiere código)
**Staff (sin login):** `/dashboard` · `/cocina` · `/encargos` · `/reservas`
**Admin (login en `/login`):** `/admin` · `/admin/carta` · `/admin/mesas` (QR y RFID) · `/admin/stock` · `/admin/mesas` · `/admin/sucursales` · `/admin/pagos` · `/admin/finanzas` · `/admin/cierre` · `/admin/integraciones` · `/admin/fidelidad` (creador) · `/admin/usuarios` · `/admin/tema` (creador)

## 🛠 Stack técnico

Next.js 16 (App Router) · TypeScript · Zustand (cache local) · bcryptjs + cookies firmadas para auth · API routes con verificación real de Mercado Pago · `@opennextjs/cloudflare` + Wrangler para Cloudflare Workers/Pages.
