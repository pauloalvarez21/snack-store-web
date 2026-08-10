# 🛍️ Snack Store — Web

Frontend del sistema de venta de comestibles en línea. Aplicación **Angular 22** que consume la API [`snack-store-api`](https://github.com/pauloalvarez21/snack-store-api) (NestJS + PostgreSQL en Neon).

## ✨ Funcionalidades

- **Catálogo de productos** (público): búsqueda por nombre o SKU con debounce, filtro por categorías (con subcategorías), paginación y estados de carga / vacío / error.
- **Autenticación JWT**: registro de clientes (rol `CUSTOMER`) e inicio de sesión, con token persistido en `localStorage` e interceptor que lo adjunta a las peticiones. El registro incluye un tooltip que explica el seguimiento de compras y el soporte de reclamaciones con número de pedido.
- **Carrito** respaldado por el API (`/api/carts/me`): drawer animado con cantidades sincronizadas con el servidor. Requiere sesión: al agregar sin login se redirige a `/auth`.
- **Mis pedidos** (`/mis-pedidos`): historial de compras del cliente (`GET /api/orders/me`) con filtro por estado, detalle expandible (productos, dirección y pago), línea de seguimiento del pedido, botón **🔄 Comprar de nuevo** (re-agrega al carrito los productos de un pedido anterior con sus cantidades, saltando los que ya no existan) y botón para cancelar pedidos aún no procesados (`PENDING`/`PAID` → `CANCELLED`).
- **Mis direcciones** (`/direcciones`): libreta de direcciones independiente para usuarios autenticados — listar, agregar, editar, eliminar y marcar la principal. El checkout también permite elegir/crear direcciones al momento de comprar.
- **Checkout**: resumen del pedido, **libreta de direcciones** (`/api/addresses`: elegir, agregar, editar y eliminar direcciones de envío), selección de método de pago (tarjeta, transferencia o contra entrega) y creación **real** del pedido con `POST /api/orders` (envía el `addressId`). Las tarjetas se cobran al instante (pedido `PAID`); transferencia y contra entrega quedan `PENDING`.
- **Panel de administración** (`/admin`, solo `ADMIN`): gestión completa de la tienda desde la web con tres pestañas — **Productos** (crear/editar/eliminar, activar/desactivar, subir imagen con `POST /api/uploads/images` y búsqueda por nombre/SKU), **Categorías** (CRUD con subcategorías vía `parentId`) e **Inventario** (`/api/inventory`: fijar stock/mínimo/vencimiento y ajustar por delta).
- **Panel de pedidos (repartidor/admin)**: para roles `ADMIN`/`DELIVERY` en `/pedidos`. Lista de pedidos con filtro por estado y detalle expandible (productos, dirección y pago), botones **🚚 Marcar en camino** (`PREPARING → OUT_FOR_DELIVERY`) y **✅ Confirmar entrega** (`POST /api/orders/:id/deliver`, cobra el contra entrega), más el reporte **Mis entregas** (`/api/orders/deliveries/me`) con resumen de entregas y montos. El rol `ADMIN` además puede **💳 Confirmar pago** (`PENDING → PAID`), **👨‍🍳 Marcar en preparación** (`PAID → PREPARING`) y **✕ Cancelar pedidos** — así el ciclo completo (crear → pagar → preparar → repartir → entregar) se gestiona desde la web.
- **Modo oscuro**: sigue el tema del sistema por defecto, con un botón 🌙/☀️ en el header para alternar claro/oscuro (preferencia guardada en `localStorage`).

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 22 (standalone components, signals, control flow) |
| RxJS | Observables y operadores |
| Estilos | SCSS con design tokens (variables CSS) |
| Tests | Vitest + `@vitest/coverage-v8` (unitarios con `HttpTestingController`) |
| API | `snack-store-api` en `http://localhost:3000` |

## 🚀 Puesta en marcha

### Requisitos

- Node.js 20+ y npm
- Backend corriendo en `http://localhost:3000` (ver `snack-store-api`): requiere `.env` con `DATABASE_URL` y `JWT_SECRET`, aplicar `schema.sql` y, opcionalmente, sembrar datos con `node --env-file=.env scripts/seed.mjs`.

### Instalación y desarrollo

```bash
npm install
npm start        # servidor de desarrollo en http://localhost:4200
```

### Configuración

`src/environments/environment.development.ts` define `apiUrl` (backend).

## 🧪 Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo (HMR) en `:4200` |
| `npm run build` | Build de producción a `dist/` |
| `npm test` | Tests unitarios (Vitest, modo watch) |
| `npx ng test --watch=false --coverage` | Tests + reporte de cobertura a `coverage/` |
| `npm run watch` | Build en modo watch |

> 💡 Los tests usan `HttpTestingController` (peticiones HTTP simuladas) y aserciones por DOM, sin necesidad de backend. El reporte de cobertura se genera en `coverage/snack-store-web/`.

## 📁 Estructura

```
src/
  app/
    core/        modelos, servicios, interceptor JWT y guards
    features/
      catalog/    página de catálogo + tarjeta de producto
      auth/       login / registro
      checkout/   resumen y confirmación de pedido
      addresses/  libreta de direcciones
      my-orders/  historial y seguimiento de pedidos del cliente
      orders/     panel de pedidos (repartidor/admin)
      cart/       drawer del carrito
      admin/      panel de administración (productos, categorías, inventario)
    shared/order/    componentes reutilizables de pedidos (tarjeta, badge de estado,
                     paginación, skeleton y filtros)
    shared/address/  formulario de dirección compartido (libreta y checkout)
  environments/  environment.ts y environment.development.ts
openapi.json     contrato de la API (raíz del proyecto)
```

## 🔐 Notas del contrato API

- Respuestas paginadas: `{ data, total, page, limit, totalPages }`.
- Token de sesión: `access_token` (login y registro autentican).
- Endpoints públicos: `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`, `GET /api/categories/:id`.
- Carrito (`/api/carts/me`), checkout (`POST /api/orders`) y perfil (`/api/auth/profile`) requieren sesión JWT.
- Resto de operaciones de productos/categorías requieren rol `ADMIN`.

## 🌿 Flujo de trabajo git

```
main  (producción, estable)
  └─ develop  (integración)
       └─ feature/*  (trabajo diario, se integra vía PR a develop)
```

## 📄 Licencia

Proyecto privado.
