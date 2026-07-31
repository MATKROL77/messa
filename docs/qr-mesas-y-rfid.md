# Acceso a la mesa: QR, códigos y RFID/NFC

Cómo entra un comensal a su mesa en MESSA, y por qué ya no alcanza con escribir
`/mesa/m2` en la barra de direcciones.

## El problema que resuelve

Antes, las mesas vivían en direcciones correlativas (`/mesa/m1`, `/mesa/m2`, …).
Cualquiera sentado en la mesa 3 podía cambiar el número y entrar a la cuenta de
la mesa 4: verla, sumarle platos o marcarla como pagada. Agregar `?staff=true`
daba además el modo del personal, sin ninguna credencial.

## Cómo funciona ahora

Cada mesa tiene un **código alfanumérico** de ocho caracteres con el formato
`XXXX-XXXX` (por ejemplo `NEFQ-C6NP`).

- El código **no se guarda**: se **deriva** en el servidor con HMAC-SHA256 a
  partir del id de la mesa y de su versión de código, usando una clave que sólo
  existe como variable de entorno (`MESSA_CODIGO_SEED`, o `SESSION_SECRET` si no
  la definís). El navegador nunca ve esa clave, así que no puede calcular el
  código de otra mesa.
- El alfabeto excluye los caracteres que se confunden al leerlos o dictarlos
  (`0/O`, `1/I/L`, `5/S`, `8/B`), porque el código también se puede tipear a
  mano si el QR está rayado.
- El espacio de códigos es de 27⁸ ≈ 2,8 · 10¹¹ combinaciones, y
  `/api/mesa/acceso` limita los intentos por minuto.

### Los tres caminos de entrada

| Camino | Dirección | Cuándo se usa |
|---|---|---|
| QR sobre la mesa | `/m/XXXX-XXXX` | El habitual. No expone el id interno. |
| Tag NFC pegado a la mesa | la misma que el QR | Apoyar el teléfono, sin escanear. |
| Lector RFID USB del atril | `/rfid/<UID>` | Tarjetas que sólo emiten un identificador. |

Sin código válido, la mesa muestra la pantalla de acceso: se puede escribir el
código impreso o pasar a la carta en modo vista (`/vista`).

El **modo staff** (`?staff=true`) ahora exige una sesión real del panel,
verificada contra `/api/auth/me`.

## Uso diario (Administración → Mesas y códigos QR)

1. **Imprimir hoja de QR** genera una hoja con una tarjeta por mesa: QR, número
   y código en texto. Se recorta y se pega en cada mesa.
2. **PNG** descarga el QR de una mesa suelta, para diseñarle una tarjeta propia.
3. **RFID** vincula el identificador de una tarjeta con la mesa. Los lectores USB
   se comportan como un teclado: con el campo enfocado, apoyás la tarjeta y el
   identificador se escribe solo. Ahí mismo se muestra la dirección para grabar
   en un tag NFC.
4. **Nuevo código** cambia el código de esa mesa y, con él, su QR.

## Límite conocido

Regenerar un código cambia el QR que se imprime, **pero el anterior sigue siendo
válido** hasta que MESSA tenga base de datos. El motivo: la versión vigente de
cada código sólo existe en el navegador del dueño, y el teléfono de un comensal
que llega por primera vez no tiene forma de conocerla; exigirla dejaría a todo el
mundo afuera. Lo que sí está garantizado desde ahora es lo importante: **el
código de una mesa no abre ninguna otra, y sin código no se entra**.

Para revocar de verdad un código filtrado hay dos caminos:

- Conectar Supabase (ver `LEEME.md`), que da un lugar compartido donde guardar la
  versión vigente.
- O, como solución inmediata, cambiar `MESSA_CODIGO_SEED` y redesplegar: eso
  invalida **todos** los códigos a la vez y obliga a reimprimir la hoja completa.
