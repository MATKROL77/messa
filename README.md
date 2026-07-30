# MESSA

Sistema integral para la operación de restaurantes: carta digital, pedidos,
cocina, salón, inventario, reservas, caja, administración y experiencia de mesa.

## Desarrollo local

Requiere Node.js 20 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

Copiá `.env.example` a `.env.local` y completá las variables requeridas. Los
archivos con secretos están excluidos de Git.

## Validación

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm cf:build
```

## Cloudflare

MESSA usa OpenNext para generar un Worker compatible con Cloudflare:

```bash
pnpm cf:preview
pnpm cf:deploy
```

La configuración del Worker está en `wrangler.jsonc` y publica el proyecto con
el nombre técnico `messa`.

## Documentación operativa

La configuración de cuentas, Supabase y funcionamiento del sistema está
detallada en [LEEME.md](./LEEME.md).
