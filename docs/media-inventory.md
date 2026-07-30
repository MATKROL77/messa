# Inventario de media — MESSA

Auditoría actualizada el 30 de julio de 2026. La carta contiene **20 productos aprobados** y no conserva referencias remotas de Unsplash. Todas las cards y detalles usan el sistema de assets recortados con fondo transparente, `object-fit: contain`, sombra independiente y fallback normalizado mediante `DishMedia`.

| Producto | Tipo de asset | Resolución | Peso | Ubicación | Estado | Observaciones |
| --- | --- | ---: | ---: | --- | --- | --- |
| Burrata con tomates cherry | Plato cenital recortado | 230×230 | 279,0 KB | `public/images/menu/dishes/burrata-con-tomates-cherry/card-v2.webp` | Integrado | Plato negro, transparencia real. |
| Tagliatelle al funghi | Plato cenital recortado | 230×230 | 402,5 KB | `public/images/menu/dishes/tagliatelle-al-funghi/card-topdown-v2.webp` | Integrado | Reemplaza la fotografía rectangular retirada. |
| Ojo de bife 400g | Plato cenital recortado | 230×230 | 369,3 KB | `public/images/menu/dishes/ojo-de-bife-400g/card-topdown-v2.webp` | Integrado | Reemplaza la fotografía rectangular retirada. |
| Salmón a la plancha | Plato cenital recortado | 230×230 | 230,2 KB | `public/images/menu/dishes/salmon-a-la-plancha/card-topdown-v2.webp` | Integrado | Plato negro, transparencia real. |
| Risotto de mariscos | Plato cenital recortado | 230×230 | 317,0 KB | `public/images/menu/dishes/risotto-de-mariscos/card-topdown-v2.webp` | Integrado | Plato negro, transparencia real. |
| Volcán de chocolate | Plato cenital recortado | 230×230 | 211,4 KB | `public/images/menu/dishes/volcan-de-chocolate/card-topdown-v2.webp` | Integrado | Plato negro, transparencia real. |
| Tiramisú della casa | Plato cenital recortado | 230×230 | 283,5 KB | `public/images/menu/dishes/tiramisu-della-casa/card-topdown-v2.webp` | Integrado | Plato negro, transparencia real. |
| Flan con dulce de leche y crema | Plato cenital recortado | 230×230 | 116,5 KB | `public/images/menu/dishes/flan-con-dulce-de-leche-y-crema/card-topdown-v1.webp` | Integrado | Nuevo producto aprobado. |
| Sushi selección de piezas | Bandeja cenital recortada | 230×230 | 130,6 KB | `public/images/menu/dishes/sushi-seleccion-de-piezas/card-topdown-v1.webp` | Integrado | Nuevo producto aprobado. |
| Chardonnay Reserva | Bebida recortada / servicio | 256×256 | 86,3 KB | `public/images/menu/beverages/chardonnay-reserva/card-pour-v1.webp` | Integrado | Botella y copa sin manos ni fondo. |
| Malbec Reserva 2021 | Bebida recortada / servicio | 256×256 | 57,0 KB | `public/images/menu/beverages/malbec-reserva-2021/card-pour-v1.webp` | Integrado | Botella y copa sin manos ni fondo. |
| Cabernet Sauvignon Gran Reserva | Bebida recortada / servicio | 256×256 | 83,0 KB | `public/images/menu/beverages/cabernet-sauvignon-gran-reserva/card-pour-v1.webp` | Integrado | Botella y copa sin manos ni fondo. |
| Sauvignon Blanc | Bebida recortada / servicio | 256×256 | 84,3 KB | `public/images/menu/beverages/sauvignon-blanc/card-pour-v1.webp` | Integrado | Botella y copa sin manos ni fondo. |
| Agua AQA (500ml) | Bebida recortada / servicio | 230×230 | 81,0 KB | `public/images/menu/beverages/agua-aqa-500ml/card-pour-v1.webp` | Integrado | Botella y vaso sin fondo. |
| Limonada de la casa | Jarra recortada | 256×256 | 178,9 KB | `public/images/menu/beverages/limonada-de-la-casa/card-pour-v1.webp` | Integrado | Jarra sin fondo. |
| Jugo de naranja exprimido | Jarra recortada | 256×256 | 121,1 KB | `public/images/menu/beverages/jugo-de-naranja-exprimido/card-pour-v1.webp` | Integrado | Jarra sin fondo. |
| Espresso | Café recortado | 230×230 | 66,3 KB | `public/images/menu/coffees/espresso/card-cutout-v1.webp` | Integrado | Taza y plato negro sin fondo. |
| Americano | Café recortado | 230×230 | 61,1 KB | `public/images/menu/coffees/americano/card-cutout-v1.webp` | Integrado | Taza y plato negro sin fondo. |
| Cortado | Café recortado | 230×230 | 56,4 KB | `public/images/menu/coffees/cortado/card-cutout-v1.webp` | Integrado | Vaso y plato negro sin fondo. |
| Latte | Café recortado | 230×230 | 77,5 KB | `public/images/menu/coffees/latte/card-cutout-v1.webp` | Integrado | Taza y plato negro sin fondo. |

## Integración

- Prioridad de card: `imagen_recorte_url` → `imagen_card_url` → `imagen_url`.
- Prioridad de detalle: `imagen_detalle_url` → `imagen_hero_url` → recorte → card → fallback.
- La carta pública, la carta QR de mesa y el administrador comparten los mismos assets versionados.
- Los cinco assets rectangulares antiguos de Tagliatelle y Ojo de bife fueron retirados del árbol de `public`; pueden recuperarse desde el historial del repositorio si fuera necesario.
