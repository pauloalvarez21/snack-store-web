# 🛍️ Snack Store — Web

Frontend del sistema de venta de comestibles en línea. Aplicación **Angular 22** que consume la API [`snack-store-api`](https://github.com/pauloalvarez21/snack-store-api) (NestJS + PostgreSQL en Neon).

## ✨ Funcionalidades

- **Catálogo de productos** (público): búsqueda por nombre o SKU con debounce, filtro por categorías (con subcategorías), paginación y estados de carga / vacío / error.
- **Autenticación con tokens (access + refresh)**: registro de clientes (rol `CUSTOMER`) e inicio de sesión. `login`/`register` devuelven un `access_token` JWT y un `refresh_token` opaco. El access token se guarda en `localStorage`; el refresh token se envía como **cookie httpOnly** (`withCredentials: true`). El interceptor adjunta el token como `Bearer` y, ante un **401**, renueva la sesión automáticamente (`POST /api/auth/refresh`, con rotación de tokens) y reintenta la petición original una sola vez; los 401 concurrentes comparten un único refresh. Si el refresh falla, se cierra la sesión y se redirige a `/auth`. El logout revoca los tokens en el servidor y limpia la cookie. El registro incluye un tooltip que explica el seguimiento de compras y el soporte de reclamaciones con número de pedido. **Rate limiting**: el backend devuelve `429` al superar 10 intentos/min en login/register; la UI muestra un mensaje de espera.  - **Mi perfil** (`/perfil`): ver y editar nombre, apellido y teléfono (`PATCH /api/users/me`, el header se actualiza al instante) y cambiar la contraseña (`POST /api/users/me/change-password`), con validaciones de solo-espacios, coincidencia de contraseñas y **contraseña fuerte** (mín. 8 caracteres, mayúscula, minúscula y número).
- **Carrito** respaldado por el API (`/api/carts/me`): drawer animado con cantidades sincronizadas con el servidor. Requiere sesión: al agregar sin login se redirige a `/auth`.
- **Mis pedidos** (`/mis-pedidos`): historial de compras del cliente (`GET /api/orders/me`) con filtro por estado, detalle expandible (productos, dirección y pago), línea de seguimiento del pedido, botón **🔄 Comprar de nuevo** (re-agrega al carrito los productos de un pedido anterior con sus cantidades, saltando los que ya no existan) y botón para cancelar pedidos aún no procesados (`PENDING`/`PAID` → `CANCELLED`).
- **Mis direcciones** (`/direcciones`): libreta de direcciones independiente para usuarios autenticados — listar, agregar, editar, eliminar y marcar la principal. El checkout también permite elegir/crear direcciones al momento de comprar.
- **Checkout**: resumen del pedido, **libreta de direcciones** (`/api/addresses`: elegir, agregar, editar y eliminar direcciones de envío), selección de método de pago (**Nequi**, **Daviplata** o **contra entrega**) y creación **real** del pedido con `POST /api/orders` (envía el `addressId`). Al pagar con Nequi/Daviplata el pedido incluye el número de billetera del comercio (`payment.walletNumber`) para consignar; estos y el contra entrega quedan `PENDING` hasta que el `ADMIN` confirma el cobro (pedido → `PAID`) o se entrega el pedido.
- **Panel de administración** (`/admin`, solo `ADMIN`): gestión completa de la tienda desde la web con cuatro pestañas — **Productos** (crear/editar/eliminar, activar/desactivar, subir imagen con `POST /api/uploads/images` y búsqueda por nombre/SKU), **Categorías** (CRUD con subcategorías vía `parentId`), **Inventario** (`/api/inventory`: fijar stock/mínimo/vencimiento y ajustar por delta) y **Usuarios** (`/api/users`: listado paginado con búsqueda por email/nombre, filtro por rol y cambio de rol vía `PATCH /api/users/:id/role`; el rol del usuario con la sesión activa queda bloqueado para evitar auto-descensos).
- **Panel de pedidos (repartidor/admin)**: para roles `ADMIN`/`DELIVERY` en `/pedidos`. Lista de pedidos con filtro por estado y detalle expandible (productos, dirección y pago), botones **🚚 Marcar en camino** (`PREPARING → OUT_FOR_DELIVERY`) y **✅ Confirmar entrega** (`POST /api/orders/:id/deliver`, cobra el contra entrega), más el reporte **Mis entregas** (`/api/orders/deliveries/me`) con resumen de entregas y montos. El rol `ADMIN` además puede **💳 Confirmar pago** (`PENDING → PAID`), **👨‍🍳 Marcar en preparación** (`PAID → PREPARING`) y **✕ Cancelar pedidos** — así el ciclo completo (crear → pagar → preparar → repartir → entregar) se gestiona desde la web.
- **Modo oscuro**: sigue el tema del sistema por defecto, con un botón 🌙/☀️ en el header para alternar claro/oscuro (preferencia guardada en `localStorage`).

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 22 (standalone components, signals, control flow) |
| RxJS | Observables y operadores |
| Estilos | SCSS con design tokens (variables CSS) |
| Tests | Vitest + `@vitest/coverage-v8` (unitarios con `HttpTestingController`, ~88% de statements) |
| API | `snack-store-api` en `http://localhost:3000` (cookies httpOnly + CORS configurable) |

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

`src/environments/environment.development.ts` define `apiUrl` (backend). El backend requiere `CORS_ORIGINS` en su `.env` incluyendo el dominio del frontend (por defecto `http://localhost:4200`).

## 🧪 Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo (HMR) en `:4200` |
| `npm run build` | Build de producción a `dist/` |
| `npm test` | Tests unitarios (Vitest, modo watch) |
| `npx ng test --watch=false --coverage` | Tests + reporte de cobertura a `coverage/` |
| `npm run watch` | Build en modo watch |

> 💡 Los tests usan `HttpTestingController` (peticiones HTTP simuladas) y aserciones por DOM, sin necesidad de backend. El reporte de cobertura se genera en `coverage/snack-store-web/` y cubre servicios, interceptores, utilidades, el shell de la app y todas las páginas y componentes compartidos.

## 📁 Estructura

```
src/
  app/
    core/        modelos, servicios, interceptor de tokens (Bearer + refresh) y guards
    features/
      catalog/    página de catálogo + tarjeta de producto
      auth/       login / registro
      checkout/   resumen y confirmación de pedido
      addresses/  libreta de direcciones
      my-orders/  historial y seguimiento de pedidos del cliente
      orders/     panel de pedidos (repartidor/admin)
      cart/       drawer del carrito
      profile/    perfil del usuario (datos personales y contraseña)
      admin/      panel de administración (productos, categorías, inventario, usuarios)
    shared/order/    componentes reutilizables de pedidos (tarjeta, badge de estado,
                     paginación, skeleton y filtros)
    shared/address/  formulario de dirección compartido (libreta y checkout)
  environments/  environment.ts y environment.development.ts
openapi.json     contrato de la API (raíz del proyecto)
```

## 🔐 Notas del contrato API

- Respuestas paginadas: `{ data, total, page, limit, totalPages }`.
- Sesión por tokens: `login`/`register` devuelven `access_token` (JWT) y `refresh_token` (opaco). El access token se almacena en `localStorage`; el refresh token se envía como cookie httpOnly (`withCredentials: true`). El interceptor lo renueva automáticamente con `POST /api/auth/refresh` (rotación: también entrega un refresh nuevo) ante un 401 y reintenta la petición una vez. `POST /api/auth/logout` revoca ambos y limpia la cookie. Rate limiting: `429` al superar 10 req/min en login/register.
- Endpoints públicos: `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`, `GET /api/categories/:id`.
- Carrito (`/api/carts/me`), checkout (`POST /api/orders`), perfil (`/api/auth/profile`) y `GET/PATCH /api/users/me`, `POST /api/users/me/change-password` requieren sesión JWT.
- `GET /api/users`, `GET /api/users/:id` y `PATCH /api/users/:id/role` requieren rol `ADMIN`.
- Resto de operaciones de productos/categorías requieren rol `ADMIN`.

## 🌿 Flujo de trabajo git

```
main  (producción, estable)
  └─ develop  (integración)
       └─ feature/*  (trabajo diario, se integra vía PR a develop)
```

## 📄 Licencia

Proyecto privado.
