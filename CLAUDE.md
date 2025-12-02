# Backend E-commerce - NestJS

## Regla Critica
**NUNCA iniciar el servidor** (`npm run start:dev`) a menos que el usuario lo solicite.

## Stack
- NestJS + MongoDB/Mongoose + TypeScript
- Cloudinary (imagenes), Nodemailer (emails)
- JWT auth con guards por roles/permisos
- Puerto: 3000

## Deploy
```bash
npm run build && git add . && git commit -m "cambios" && git push
```

## Sistema de Precios
```typescript
{
  cost: number,                    // Costo del producto
  cashPrice: number,               // Precio efectivo (INPUT)
  listPricePercentage: number,     // % recargo (default 25)
  price: number,                   // Precio lista (CALCULADO)
}
// Ganancia = cashPrice - cost (SIEMPRE)
```

## Sistema Financiero - Reglas Criticas

### Principios Fundamentales
1. **Integridad por dia**: Cada dia mantiene su total original
2. **Cambios NO modifican** el total del dia original
3. **Ganancias se anulan** pero ingresos totales NO

### Estados de Ventas
| Estado | Descripcion |
|--------|-------------|
| `normal` | Venta regular |
| `anulada_por_cambio` | Producto original (ganancia = 0, mantiene precio) |
| `nueva_por_cambio` | Producto nuevo del cambio |
| `cambiado` | Producto en cambio 1:1 |
| `diferencia_cambio` | Diferencia de precio pagada |

### Stock en Cambios
- SIEMPRE devolver stock del producto original
- SIEMPRE reducir stock del producto nuevo
- Validar disponibilidad antes de permitir cambio

## Endpoints Principales

### Productos
```
GET    /product/search/filtered  # Filtros avanzados
POST   /product                  # Crear con imagenes
PATCH  /product/:id              # Actualizar
DELETE /product/:id              # Eliminar
```

### Ventas y Cambios
```
GET    /sell                     # Obtener ventas con filtros
POST   /sell/register            # Registrar venta con transaction_id
GET    /sell/stats               # Metricas por dia
POST   /exchange                 # Cambio individual
POST   /exchange/massive         # Cambio masivo (CRITICO FINANZAS)
```

### Usuarios
```
GET    /user/tenant-users        # Usuarios del tenant
POST   /user/tenant-users        # Crear usuario
PATCH  /user/tenant-users/:id    # Actualizar
DELETE /user/tenant-users/:id    # Eliminar
POST   /user/tenant-users/:id/reset-password
```

### Auth Multi-Tenant
```
POST   /auth/tenant/login        # Login user@tenant
POST   /auth/tenant/setup-password
POST   /auth/tenant/request-reset
POST   /auth/tenant/reset-password
```

### Categorias y Talles
```
GET/POST/PATCH/DELETE /category
GET/POST/PATCH/DELETE /size
GET /size/category/:categoryId   # Hereda del padre si es subcategoria
```

## Categorias Jerarquicas

### Estructura
```typescript
// Categoria
{ _id, name, parent_id?, tenantId }

// Size solo en categorias padre
{ _id, name, category_id, tenantId }
```

### Validacion en size.service.ts
```typescript
// Solo permite crear tallas en categorias padre
if (category.parent_id) {
  throw new BadRequestException('SUBCATEGORY_CANNOT_HAVE_SIZES')
}

// Subcategorias heredan tallas del padre
const searchCategoryId = category.parent_id || categoryId
```

## Roles y Permisos
| Rol | Acceso |
|-----|--------|
| ADMIN | Todo |
| VENDEDOR | Ventas. Sin: costos, ganancias, CRUD |
| CUSTOM | 62 permisos granulares |

## Estructura
```
src/
  product/     # CRUD, filtros, imagenes
  category/    # Jerarquico con parent_id
  size/        # Herencia de tallas
  sell/        # Ventas con transaction_id
  exchange/    # Cambios individual/masivo
  user/        # Gestion usuarios tenant
  auth/        # JWT, 2FA, multi-tenant
  client-credit/ # Creditos por diferencias negativas
```

## Notas Importantes
- Ventas guardan datos **desnormalizados** (category_name, color_name, etc.)
- Imagenes: optimizadas 800px, 80% JPEG antes de Cloudinary
- Timezone: America/Argentina/Buenos_Aires
- Proteccion 409 Conflict para entidades con productos

## Version: 2.22.0
