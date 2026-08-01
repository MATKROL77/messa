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
- **Despliegue completo**: se hace solo desde Cloudflare Workers Builds, que ya
  está conectado a este repositorio. Ver la sección siguiente.

### Cloudflare Workers Builds — ajustes del panel

El proyecto de Cloudflare se llama **`messa`**, y `wrangler.jsonc` ya declara
`"name": "messa"` para que coincida. Tres cosas tienen que estar bien o el
despliegue falla:

**1. Qué Worker está conectado a este repositorio.** Si la cuenta todavía
tiene conectado un Worker viejo (por ejemplo uno llamado `menuflow-app`, de
antes de que el proyecto se llamara MESSA) apuntando a este mismo repo, Workers
Builds va a rechazar cada build en el acto (falla en 0 segundos, sin llegar a
compilar) porque el nombre no coincide. Hay que desconectar ese Worker viejo
del repositorio y conectar `messa` en *Workers & Pages → messa → Settings →
Build → Source*, o renombrarlo si es el mismo proyecto.

**2. Los comandos de build.** En *Workers & Pages → messa → Settings →
Build*:

| Campo | Valor |
|---|---|
| Build command | `pnpm cf:build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |

El comando por defecto (`npx wrangler deploy`) **no** sirve: no genera
`.open-next/worker.js` y el despliegue falla por archivo inexistente.

**3. Las variables de entorno.** En *Settings → Variables and Secrets*, como
tipo **Secret** (no como texto plano):

| Variable | Para qué |
|---|---|
| `SESSION_SECRET` | Firma las sesiones y deriva los códigos QR de las mesas. Sin esto no se puede iniciar sesión ni generar QR. |
| `CREATOR_EMAIL` | Tu email de acceso. |
| `CREATOR_NOMBRE` | Nombre que se muestra en el panel. |
| `CREATOR_PASSWORD_HASH` | El hash bcrypt de tu contraseña (`node scripts/generar-hash.js "tu contraseña"`). **Sin escapar los `$`** — el escapado es sólo para archivos `.env`. |

Opcionales: `ADMIN_*`, `EDITOR_*`, `STAFF_*` para las otras cuentas, y
`MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` para cobrar de verdad con Mercado Pago.

También podés desplegar a mano con `pnpm cf:deploy`, o con el workflow
`.github/workflows/cloudflare.yml` cargando los secretos `CLOUDFLARE_API_TOKEN`
y `CLOUDFLARE_ACCOUNT_ID` en GitHub.

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

## 🔌 Conectar Supabase

### Paso pendiente: correr la migración de cuentas

**Esto lo tenés que hacer vos una sola vez, y son 30 segundos.** No lo puedo
hacer yo con la service role key: la API REST de Supabase (PostgREST) sólo lee
y escribe filas, no crea tablas. Crear tablas es DDL y necesita el SQL Editor o
la cadena de conexión de Postgres.

1. Entrá a tu proyecto en supabase.com → **SQL Editor** → **New query**
2. Pegá todo el contenido de **`supabase/migration_04_cuentas_y_rangos.sql`**
3. **Run**

Con eso quedan creadas tres tablas:

| Tabla | Para qué |
|---|---|
| `clientes` | Cuentas de comensales: email, hash de contraseña, puntos, rango |
| `usuarios_staff` | Cuentas del equipo que creás desde `/admin/usuarios`, sin redeploy |
| `movimientos_puntos` | Historial auditable de cada suma y resta de puntos |

Las tres tienen **RLS activo y ninguna policy**, así que la anon key del
navegador no las puede tocar: sólo el servidor, con la service role key.

**Mientras la migración no esté corrida, nada se rompe.** Registrarse o abrir el
padrón devuelve un 503 con el mensaje exacto de qué falta, y el login del equipo
con las cuentas de variables de entorno sigue funcionando igual.

### El resto de la base (pedidos, mesas, stock)

1. SQL Editor → pegá `supabase/schema.sql` → Run (si todavía no lo hiciste)
2. Copiá tus credenciales desde Project Settings → API
3. Cargalas como secrets: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`

Falta todavía migrar las acciones de `lib/store.ts` (pedidos, mesas, stock) de
localStorage a Supabase con Realtime. Hasta que eso pase, **un pedido hecho
desde un celular no aparece en la PC de la cocina**: cada dispositivo tiene su
propia copia. Las cuentas de clientes y del equipo sí son compartidas, porque
viven en la base desde el principio.

---

## 👤 Cuentas de comensales y puntos

La parte de afuera (clientes) y el backoffice (equipo) son dos puertas
separadas, con cookies distintas que no se pisan:

- **`/cuenta`** — el comensal se registra, ve sus puntos, su rango, las
  recompensas a las que llega y su historial de movimientos. Cookie `mf_cliente`,
  dura 30 días.
- **`/login`** — el equipo entra al backoffice. Cookie `mf_session`, dura 12 horas.

Los puntos se acreditan solos al cerrar la cuenta en la mesa: el navegador manda
el monto junto con el código del QR de esa mesa, y el servidor verifica el
código antes de sumar. Los rangos (Bronce → Plata → Oro → Platino) se recalculan
solos a partir del saldo; no se editan a mano.

> **Límite conocido:** como los pedidos todavía viven en el navegador, el
> servidor no puede verificar contra la base cuánto gastó realmente esa mesa.
> Por eso el monto está topeado y limitado en frecuencia. Cuando los pedidos
> pasen a Supabase, `/api/cuenta/puntos` tiene que leer el total del pedido y
> dejar de confiar en el monto que manda el cliente.

Desde **Administración → Fidelidad** ves el padrón completo de cuentas y podés
sumar o restar puntos a mano (para canjear una recompensa, por ejemplo).

---

## 🔑 Roles y accesos

| Rango | Puede hacer |
|---|---|
| **Creador** | Todo — tema/marca, fidelidad, equipo. Sólo existe en variables de entorno |
| **Dueño/Admin** | Gestión integral: carta, stock, pagos, finanzas, cierre, sucursales, equipo |
| **Gerente** | El turno completo: salón, pedidos, caja, finanzas y fidelidad. No toca identidad, sucursales ni equipo |
| **Editor** | Carta y stock únicamente |
| **Staff** | Operación de salón: mesas, pedidos y reservas |

Hay **dos formas** de tener una cuenta de equipo:

1. **Variables de entorno** (`CREATOR_*`, `ADMIN_*`, `GERENTE_*`, `EDITOR_*`,
   `STAFF_*`). Son la llave de emergencia: entran al panel aunque la base de
   datos esté caída. Cambiar una contraseña acá es
   `node scripts/generar-hash.js "nueva"` → actualizar la variable → redeploy.
2. **Administración → Usuarios → Nueva cuenta**. Se guardan en `usuarios_staff`,
   se crean y se borran en el momento, sin redeploy. Requiere la migración 04.
   El rango `creator` **no** es asignable desde acá, a propósito: si lo fuera,
   cualquiera con acceso al panel podría escalar a control total.

---

## ⚠️ Otras cosas a tener en cuenta antes de cobrar de verdad

1. **Facturación fiscal (AFIP)**: el sistema genera "eco-tickets" internos, no comprobantes fiscales válidos — eso requiere un integrador certificado por AFIP.
2. **Rate limiting del login**: hoy es en memoria por instancia del servidor — en un entorno serverless con múltiples instancias no es un límite global perfecto. Para eso hace falta KV o base de datos.
3. **Variables de entorno**: nunca subas tu `.env` real a git (ya está en `.gitignore`).

---

## 🗺️ Mapa de páginas

**Comensales:** `/` · `/vista` · `/cuenta` (login, puntos y rangos) · `/m/[codigo]` (destino del QR) · `/rfid/[tag]` · `/mesa/[id]` (requiere código)
**Staff (sin login):** `/dashboard` · `/cocina` · `/encargos` · `/reservas`
**Admin (login en `/login`):** `/admin` · `/admin/carta` · `/admin/mesas` (QR y RFID) · `/admin/stock` · `/admin/mesas` · `/admin/sucursales` · `/admin/pagos` · `/admin/finanzas` · `/admin/cierre` · `/admin/integraciones` · `/admin/fidelidad` (creador) · `/admin/usuarios` · `/admin/tema` (creador)

## 🛠 Stack técnico

Next.js 16 (App Router) · TypeScript · Zustand (cache local) · bcryptjs + cookies firmadas para auth · API routes con verificación real de Mercado Pago · `@opennextjs/cloudflare` + Wrangler para Cloudflare Workers/Pages.
