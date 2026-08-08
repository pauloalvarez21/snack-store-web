# 🛍️ Snack Store — Web

Frontend del sistema de venta de comestibles en línea. Aplicación **Angular 22** que consume la API [`snack-store-api`](https://github.com/pauloalvarez21/snack-store-api) (NestJS + PostgreSQL en Neon).

## ✨ Funcionalidades

- **Catálogo de productos** (público): búsqueda por nombre o SKU con debounce, filtro por categorías (con subcategorías), paginación y estados de carga / vacío / error.
- **Autenticación JWT**: registro de clientes (rol `CUSTOMER`) e inicio de sesión, con token persistido en `localStorage` e interceptor que lo adjunta a las peticiones. El registro incluye un tooltip que explica el seguimiento de compras y el soporte de reclamaciones con número de pedido.
- **Carrito** del lado del cliente: drawer animado, cantidades y persistencia en `localStorage`.
- **Checkout**: resumen del pedido, datos de entrega y confirmación. El pedido es **simulado** hasta que el backend exponga `POST /api/orders`.
- **Modo mock**: si el backend no está disponible, se puede activar `useMockData: true` para usar datos de ejemplo en memoria (26 productos / 13 categorías).
- **Modo oscuro**: sigue el tema del sistema por defecto, con un botón 🌙/☀️ en el header para alternar claro/oscuro (preferencia guardada en `localStorage`).

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 22 (standalone components, signals, control flow) |
| RxJS | Observables y operadores |
| Estilos | SCSS con design tokens (variables CSS) |
| Tests | Vitest (unitario) |
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

`src/environments/environment.development.ts` define `apiUrl` (backend) y `useMockData` (mock sin backend).

## 🧪 Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo (HMR) en `:4200` |
| `npm run build` | Build de producción a `dist/` |
| `npm test` | Tests unitarios (Vitest) |
| `npm run watch` | Build en modo watch |

## 📁 Estructura

```
src/
  app/
    core/        modelos, servicios, interceptores (JWT y mock), guard, datos mock
    features/
      catalog/   página de catálogo + tarjeta de producto
      auth/      login / registro
      checkout/  resumen y confirmación de pedido
      cart/      drawer del carrito
  environments/  environment.ts y environment.development.ts
openapi.json     contrato de la API (raíz del proyecto)
```

## 🔐 Notas del contrato API

- Respuestas paginadas: `{ data, total, page, limit, totalPages }`.
- Token de sesión: `access_token` (login y registro autentican).
- Endpoints públicos: `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`, `GET /api/categories/:id`.
- Resto de operaciones de productos/categorías requieren rol `ADMIN`.

## 🌿 Flujo de trabajo git

```
main  (producción, estable)
  └─ develop  (integración)
       └─ feature/*  (trabajo diario, se integra vía PR a develop)
```

## 📄 Licencia

Proyecto privado.
