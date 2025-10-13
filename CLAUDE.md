📋 Claude Code Session Summary - Ecommerce Admin System

  🏗️ Arquitectura del Proyecto

  Stack Tecnológico:

  - Frontend: Next.js 15.3.4 + TypeScript + TanStack Query + Tailwind CSS
  - Backend: NestJS + MongoDB/Mongoose + Cloudinary
  - Validación: Zod (frontend) + class-validator (backend)
  - UI Components: shadcn/ui + Custom components

  Configuración de Puertos:

  - Backend: Puerto 3000
  - Frontend: Puerto 3001
  - Producción API: https://api.ecommerce-test.alfastoreargentina.link/api

  Estructura de Directorios:

  ├── backend-ecommerce-test/src/
  │   ├── product/ (entities, DTOs, controller, service)
  │   ├── category/
  │   └── size/
  ├── frontend-ecommerce-test/src/
  │   ├── components/admin/{product,category,size}/
  │   ├── lib/{products,categories,sizes,api}.ts
  │   ├── types/index.ts
  │   └── app/admin/{productos,categorias,talles}/

  🎯 Funcionalidades Implementadas

  1. Gestión de Productos:

  - ✅ CRUD completo con validación
  - ✅ Upload múltiple de imágenes (Cloudinary)
  - ✅ Gestión de stock por talles dinámicos
  - ✅ Campo género obligatorio (hombre/mujer/unisex)
  - ✅ Filtros avanzados (categoría, marca, modelo, nombre, género)
  - ✅ Carousel de imágenes con navegación
  - ✅ Modal de creación y edición completos

  2. Sistema de Filtros:

  - ✅ Búsqueda por texto con backend regex
  - ✅ Filtros por categoría, marca, modelo, género
  - ✅ Responsive: colapsable en mobile (<640px)
  - ✅ Paginación integrada
  - ✅ Estado "filtros activos" visual

  3. Gestión de Categorías con Subcategorías (Enero 2025):

  - ✅ CRUD completo
  - ✅ Sistema jerárquico con parent_id
  - ✅ Modal de creación/edición
  - ✅ Confirmación de eliminación
  - ✅ Integración con filtros de productos
  - ✅ Menú jerárquico en tienda pública con expandir/colapsar
  - ✅ "Ver todo" muestra productos de padre + subcategorías

  4. Gestión de Tallas con Herencia (Enero 2025):

  - ✅ Solo se crean en categorías padre (sin parent_id)
  - ✅ Subcategorías heredan tallas automáticamente
  - ✅ Validación backend rechaza tallas en subcategorías (Error 400)
  - ✅ Herencia automática en findAllByCategory()
  - ✅ Vinculados por categoría padre
  - ✅ Gestión de stock por talle
  - ✅ Actualización dinámica en edición de productos
  - ✅ Protección 409 Conflict si tiene productos asignados

  5. Sistema de Ventas Completo:

  - ✅ Modal de registrar venta con sistema de carrito
  - ✅ Múltiples productos por venta con transaction_id
  - ✅ Validación de stock en tiempo real
  - ✅ Métodos de pago (efectivo, transferencia, QR, tarjeta)
  - ✅ Métricas dinámicas (total ventas, ingresos, ganancias)
  - ✅ Filtros de fecha con subtítulos informativos
  - ✅ Agrupación visual de productos vendidos juntos

  6. Sistema de Intercambios/Cambios Individual:

  - ✅ Modal avanzado de cambio de productos individuales
  - ✅ Cálculo automático de diferencias de precio
  - ✅ Gestión de métodos de pago para diferencias
  - ✅ Visualización de producto original vs nuevo
  - ✅ Estados de cambio (anulada_por_cambio, nueva_por_cambio)
  - ✅ Fondos diferenciados (verde para nuevas, gris para anuladas)
  - ✅ Layout móvil con dos imágenes pequeñas para cambios

  7. ⭐ Sistema de Cambio Masivo (CRÍTICO PARA FINANZAS):

  - ✅ Cambio múltiple de productos dentro de una transacción
  - ✅ Manejo financiero perfecto por día (FUNDAMENTAL)
  - ✅ Anulación de ganancias en día original (costo = precio)
  - ✅ Registro de productos nuevos en día del cambio
  - ✅ Diferencias de precio manejadas correctamente
  - ✅ Agrupación visual inteligente (productos cambiados no se agrupan)
  - ✅ Estados: cambiado, anulada_por_cambio, nueva_por_cambio, diferencia_cambio
  - ✅ Información bidireccional (producto original ↔ producto nuevo)
  - ✅ Stock actualizado correctamente en ambas direcciones

  💰 SISTEMA FINANCIERO - REGLAS CRÍTICAS

  ⚠️ ATENCIÓN: Las finanzas son el corazón del sistema. Cualquier modificación debe mantener estas reglas:

  Principios Fundamentales:

  1. INTEGRIDAD POR DÍA:
     - Cada día debe mantener su total de ventas original
     - Las ganancias se pueden anular, pero nunca los ingresos totales
     - Los cambios NUNCA modifican el total del día original

  2. FLUJO DE CAMBIOS:
     - Día Original: Se anula SOLO la ganancia del producto cambiado (costo = precio)
     - Día del Cambio: Se registra el producto nuevo con precio y ganancia reales
     - Diferencia de Precio: Solo se cobra/acredita la diferencia al cliente

  3. EJEMPLO PRÁCTICO:
     - Lunes: Venta de 2 camperas M ($20,000 total, $4,000 ganancia)
     - Martes: Cliente cambia 1 campera M por 1 campera L (mismo precio)
     - Resultado:
       * Lunes queda: $20,000 total, $2,000 ganancia (1 campera anulada)
       * Martes: $0 total, $2,000 ganancia (solo producto nuevo)

  4. CAMBIO CON DIFERENCIA:
     - Miércoles: Venta 1 campera ($10,000 total, $2,000 ganancia)
     - Jueves: Cambio campera por zapatilla ($20,000)
     - Resultado:
       * Miércoles: $10,000 total, $0 ganancia (campera anulada)
       * Jueves: $10,000 total, $5,000 ganancia (diferencia pagada + ganancia zapatilla)

  Estados de Productos:

  - 'normal': Venta regular sin cambios
  - 'anulada_por_cambio': Producto original (ganancia = 0, mantiene precio)
  - 'nueva_por_cambio': Producto nuevo del cambio
  - 'cambiado': Producto modificado en cambio 1:1 (mismo precio)
  - 'diferencia_cambio': Registro de diferencia de precio pagada

  Stock Management:

  - SIEMPRE devolver stock del producto original
  - SIEMPRE reducir stock del producto nuevo
  - Validar disponibilidad antes de permitir cambio
  - Actualizar en transacciones atómicas

  Sistema de Créditos Cliente:

  - Creación automática cuando diferencia de precio es negativa
  - Vinculación con documento/teléfono del cliente
  - Estados: active, used, expired
  - Uso FIFO (primeros créditos creados se usan primero)
  - Parcial: si crédito > monto a usar, se divide el crédito
  - Historial completo por cliente

  Agrupación Visual (Frontend):

  - Productos normales: Se agrupan por nombre-talle (ej: "Campera M x2")
  - Productos cambiados/anulados: Se muestran individualmente
  - Transacciones múltiples: Bordes púrpura, badge "Venta Múltiple"
  - Estados visuales:
    * 🟠 Naranja: Productos cambiados
    * 🔴 Rojo: Productos anulados (ganancia = 0)
    * 🟢 Verde: Productos nuevos del cambio
    * ⚪ Blanco: Productos normales

  🔧 Componentes Clave

  Frontend - Componentes Principales:

  // Product Management
  /components/admin/product/
  ├── product-list.tsx           // Lista con filtros y tabla
  ├── product-filters.tsx        // Filtros responsivos
  ├── create-product-dialog.tsx  // Modal crear producto
  └── edit-product-dialog.tsx    // Modal editar producto

  // Category Management  
  /components/admin/category/
  ├── category-list.tsx          // Lista con acciones
  ├── create-category-dialog.tsx // Modal crear
  ├── edit-category-dialog.tsx   // Modal editar
  └── delete-category-dialog.tsx // Confirmación eliminar

  // Sales Management
  /app/admin/ventas/page.tsx     // Sistema completo de ventas
  ├── RegisterSaleDialog         // Modal carrito de ventas
  ├── ExchangeDialog            // Modal cambios individuales
  ├── MassiveExchangeDialog     // Modal cambios masivos (CRÍTICO)
  ├── SaleMetricCard            // Tarjetas de métricas
  └── ImageModal                // Modal visualización imágenes

  // User Management
  /app/admin/usuarios/page.tsx    // Gestión completa de usuarios
  ├── UserModal                   // Modal crear/editar usuario
  ├── PermissionAssignment        // Componente asignación de permisos
  └── DeleteConfirmDialog         // Confirmación eliminar usuario

  Backend - Endpoints Principales:

  // Products
  GET    /product/search/filtered  // Filtros avanzados
  POST   /product                  // Crear con imágenes
  PATCH  /product/:id              // Actualizar
  DELETE /product/:id              // Eliminar
  GET    /product/filters/:categoryId // Opciones filtros

  // Categories & Sizes
  GET/POST/PATCH/DELETE /category
  GET/POST/PATCH/DELETE /size

  // Sales & Exchanges
  GET    /sell                     // Obtener ventas con filtros de fecha
  POST   /sell/register            // Registrar nueva venta con transaction_id
  GET    /sell/stats               // Métricas de ventas por día
  POST   /exchange                 // Crear intercambio/cambio individual
  POST   /exchange/massive         // Crear cambio masivo (CRÍTICO FINANZAS)
  GET    /exchange                 // Obtener intercambios
  GET    /exchange/stats           // Estadísticas de cambios

  // Client Credits (para diferencias negativas)
  GET    /client-credit            // Obtener créditos activos
  POST   /client-credit            // Crear crédito cliente
  GET    /client-credit/active/:document // Créditos activos por documento

  // User Management (Enero 2025)
  GET    /user/tenant-users        // Obtener usuarios del tenant
  POST   /user/tenant-users        // Crear usuario del tenant
  PATCH  /user/tenant-users/:id    // Actualizar usuario
  DELETE /user/tenant-users/:id    // Eliminar usuario
  POST   /user/tenant-users/:id/reset-password // Reset password por admin
  
  // Authentication Tenant-Specific
  POST   /auth/tenant/login        // Login con formato user@tenant
  POST   /auth/tenant/setup-password // Configurar password primera vez
  POST   /auth/tenant/request-reset  // Solicitar reset con 6 dígitos
  POST   /auth/tenant/reset-password // Cambiar password con código

  🎨 Características de UI/UX

  Design System:

  - Colores: Verde corporativo (#16a34a), Naranja para cambios (#ea580c), Azul para selecciones (#2563eb)
  - Responsive: Mobile-first con breakpoints sm/md/lg
  - Icons: Lucide React
  - Estados: Loading, error, empty states
  - Fondos diferenciados: Verde claro (nuevas), Gris (anuladas), Blanco (normales)

  Mobile Optimization:

  - Filtros colapsables con toggle
  - Layout de ventas reorganizado en filas
  - Imágenes dobles para cambios (12x12 mobile, 8x8 desktop)
  - Tarjetas de métricas compactas
  - Touch-friendly interactions
  - Dropdowns personalizados con imágenes

  🔗 Tipos TypeScript Principales

  interface Product {
    _id: string
    name: string
    code: string
    category_id?: string
    model_name?: string
    brand_name?: string
    cost: number
    price: number
    discount: number
    active: boolean
    gender: 'hombre' | 'mujer' | 'unisex'
    images: ProductImage[]
    stock: ProductStock[]
  }

  interface ProductFilters {
    categoryId?: string
    brandName?: string
    modelName?: string
    name?: string
    gender?: 'hombre' | 'mujer' | 'unisex'
    page?: number
    limit?: number
  }

  interface Sale {
    _id: string
    dateSell_id: { _id: string, name: string, date: string }
    product_name: string
    size_name: string
    price: number
    cost: number
    images: any[]
    method_payment: string
    exchange_type: 'normal' | 'anulada_por_cambio' | 'nueva_por_cambio' | 'cambiado' | 'diferencia_cambio'
    related_exchange_id?: string
    transaction_id?: string  // Para agrupar ventas múltiples
    exchange_count?: number  // Contador de intercambios
    original_product_info?: Array<{ 
      name: string, 
      size_name: string, 
      price: number, 
      cost: number,
      images: any[] 
    }>
    new_product_info?: Array<{ 
      name: string, 
      size_name: string, 
      price: number, 
      images: any[] 
    }>
    createdAt: string
  }

  interface CreateExchangeDto {
    original_sell_id: string
    new_product_id: string
    new_size_id: string
    payment_method_difference?: string
    notes?: string
    credit_action?: 'create_credit' | 'additional_product' | 'cash_return'
    client_document?: string
    client_name?: string
  }

  interface CreateMassiveExchangeDto {
    original_sales: Array<{ sale_id: string }>
    new_products: Array<{
      product_id: string
      product_name: string
      size_id: string
      size_name: string
      method_payment?: string
    }>
    notes?: string
    credit_action?: 'create_credit' | 'additional_product' | 'cash_return'
    client_document?: string
    client_name?: string
    payment_method_difference?: string
  }

  🐛 Problemas Resueltos

  Issues Técnicos:

  - ✅ Error hydration en Select components → Uso de select nativo
  - ✅ Keys duplicadas en listas → Fallback con index
  - ✅ useEffect infinito → Optimización de dependencias
  - ✅ IDs inconsistentes → Mapeo correcto _id ↔ size_id
  - ✅ Filtros que se resetean → State management mejorado
  - ✅ Build errors con componentes complejos → Reescritura y simplificación
  - ✅ Performance lenta en ventas → Cache optimizado (5min staleTime)
  - ✅ Input de cantidad problemático → Validación mejorada y UX intuitiva

  UX Improvements:

  - ✅ Loading states elegantes
  - ✅ Mensajes de error informativos
  - ✅ Confirmaciones para acciones destructivas
  - ✅ Auto-close modales en success
  - ✅ Tarjetas de métricas compactas
  - ✅ Subtítulos de fecha dinámicos
  - ✅ Layout móvil optimizado para cambios
  - ✅ Dropdowns con imágenes de productos
  - ✅ Sistema de carrito intuitivo

  🚀 Estado Actual

  Completamente Funcional:

  - Sistema de productos con stock por talles
  - Filtros avanzados responsivos
  - CRUD completo categorías y talles
  - Upload y gestión de imágenes
  - Sistema de ventas completo con carrito y transaction_id
  - Sistema de intercambios/cambios individuales
  - ⭐ Sistema de cambios masivos con finanzas perfectas
  - Sistema de créditos para diferencias negativas
  - Métricas en tiempo real con filtros de fecha
  - Layout móvil optimizado
  - Validaciones robustas frontend/backend
  - Agrupación visual inteligente de productos

  8. 🔐 Sistema de Usuarios y Permisos (COMPLETO):

  - ✅ Sistema multi-tenant con usuarios por tienda
  - ✅ Tres roles principales: ADMIN, VENDEDOR, CUSTOM
  - ✅ Permisos granulares por módulo (productos, ventas, etc.)
  - ✅ Login con formato username@tenant.com (ej: jose@mitienda.com)
  - ✅ Primera vez login: configuración de contraseña
  - ✅ Recuperación de contraseña con código de 6 dígitos por email
  - ✅ Gestión completa de usuarios desde el admin
  - ✅ Vendedores: pueden registrar ventas pero NO ver costos ni modificar stock
  - ✅ Asignación dinámica de permisos para roles personalizados

  Próximas Mejoras Potenciales:

  - Reportes y analytics avanzados
  - Sistema de inventario automático
  - Notificaciones push
  - Tests automatizados
  - Dashboard ejecutivo

  🏗️ SISTEMA DE CATEGORÍAS JERÁRQUICAS Y HERENCIA DE TALLAS (Enero 2025)

  **Arquitectura Implementada:**

  ```typescript
  // Estructura de Categoría
  {
    _id: string,
    name: string,           // "ZAPATILLAS", "REMERAS"
    parent_id?: string,     // null = padre, string = subcategoría
    tenantId: string
  }

  // Size vinculado solo a categoría padre
  {
    _id: string,
    name: string,           // "M", "L", "42"
    category_id: string,    // SOLO referencia a categoría PADRE
    tenantId: string
  }
  ```

  **Ejemplo de Jerarquía:**
  ```
  ZAPATILLAS (padre) → Tallas: 38, 39, 40, 41, 42, 43, 44, 45
  ├── Zapatillas G5 → Hereda: 38-45
  ├── Zapatillas Running → Hereda: 38-45
  └── Zapatillas Casual → Hereda: 38-45
  ```

  **Backend - Validación en size.service.ts:**

  ```typescript
  // ✅ CREAR: Solo permite categorías padre
  async create(tenantId, createSizeDto) {
    const category = await this.categoryModel.findOne({
      _id: createSizeDto.category_id,
      tenantId
    });

    if (category.parent_id) {
      throw new BadRequestException({
        message: 'Solo se pueden crear tallas en categorías padre. Las subcategorías heredan las tallas de su categoría padre.',
        error: 'SUBCATEGORY_CANNOT_HAVE_SIZES',
        statusCode: 400
      });
    }
    // ... continuar creación
  }

  // ✅ CONSULTAR: Herencia automática
  async findAllByCategory(tenantId, categoryId) {
    const category = await this.categoryModel.findOne({
      _id: categoryId,
      tenantId
    });

    // Si tiene parent_id, buscar tallas del padre
    const searchCategoryId = category.parent_id || categoryId;

    return await this.sizeModel.find({
      category_id: searchCategoryId,
      tenantId
    });
  }
  ```

  **Backend - Productos por categoría en public.service.ts:**

  ```typescript
  // Incluir subcategorías al filtrar por categoría padre
  if (filters.category) {
    const subcategories = await this.categoryModel
      .find({ parent_id: filters.category, tenantId })
      .select('_id')
      .lean();

    if (subcategories.length > 0) {
      const categoryIds = [
        filters.category,
        ...subcategories.map(sub => sub._id.toString())
      ];
      query.category_id = { $in: categoryIds };
    } else {
      query.category_id = filters.category;
    }
  }
  ```

  **Frontend - Menú jerárquico en store-header.tsx:**
  - Expandir/colapsar con ChevronDown
  - "Ver todo" muestra productos de padre + subcategorías
  - Subcategorías individuales filtran solo sus productos

  **Beneficios:**
  - 🎯 Tallas creadas una sola vez en categoría padre
  - 🔄 Herencia automática sin duplicación
  - 🔒 Validación robusta impide errores
  - 💡 UX clara: subcategorías = variaciones de estilo, NO de tallas

  🔑 Comandos Importantes

  # Backend (puerto 3000)
  cd backend-ecommerce-test
  npm run start:dev

  # Frontend (puerto 3001)
  cd frontend-ecommerce-test
  npm run dev

  # Variables de entorno
  NEXT_PUBLIC_API_URL=http://localhost:3000/api
  NEXT_PUBLIC_ADMIN_PASSWORD=testadmin

  ---
  Última actualización: Sistema de categorías jerárquicas con herencia de tallas implementado.
  Estado: Producción ready con finanzas bulletproof + herencia automática 🚀✨💰

  🎯 Funcionalidades Principales Completadas:

  ✅ Gestión completa de productos, categorías jerárquicas y tallas con herencia
  ✅ Sistema de categorías padre/hijo con herencia automática de tallas
  ✅ Validación backend: solo tallas en categorías padre (Error 400)
  ✅ Menú jerárquico en tienda pública con expandir/colapsar
  ✅ Sistema de ventas con carrito multi-producto y agrupación
  ✅ Sistema de intercambios/cambios individuales y masivos
  ✅ Sistema financiero perfecto que mantiene integridad por día
  ✅ Sistema de créditos para diferencias negativas
  ✅ Métricas en tiempo real con filtros de fecha
  ✅ UI/UX optimizada con estados visuales claros
  ✅ Validaciones robustas y manejo de errores
  ✅ Stock management atómico y preciso

  ⚠️ CRÍTICO: El sistema financiero es perfecto. Mantener las reglas de integridad por día.

## 🔄 Cambios Recientes (Enero 2025)

### Sistema de Usuarios y Permisos (Enero 2025)
- ✅ **Backend completo**:
  - AuthTenantService para autenticación multi-tenant
  - UserManagementService para CRUD de usuarios
  - Sistema de permisos granulares con guards
  - Login con formato jose@mitienda.com
  - Primera vez login con setup de contraseña
  - Recuperación con código de 6 dígitos
  - Emails HTML con templates Handlebars

- ✅ **Frontend completo**:
  - Página de gestión de usuarios en /admin/usuarios
  - Modal de creación/edición con roles y permisos
  - Asignación de permisos personalizados
  - Búsqueda y filtrado de usuarios
  - Estados activo/inactivo
  - Confirmación de eliminación

- ✅ **Roles implementados**:
  - ADMIN: Acceso total al sistema
  - VENDEDOR: Puede registrar ventas, NO ve costos ni modifica stock
  - CUSTOM: Permisos personalizados asignables

### Última sesión de mejoras
- ✅ Filtro de estado activo/inactivo agregado en productos
- ✅ Scroll infinito con paginación de 20 productos
- ✅ Modal de edición con visualización de imágenes
- ✅ Campo de color agregado en edición de productos
- ✅ Estado del producto como toggle switch elegante
- ✅ Botones de Ventas y Usuarios habilitados en sidebar

## 📋 Historial de Cambios (Enero 2025)

### Correcciones de TypeScript
- ✅ Reemplazadas referencias de strings literales ('super_admin', 'store_owner') con enums UserRole
- ✅ Corregido auth.service.ts líneas 97-117: comparaciones de roles usando UserRole.ADMIN

### Mejoras en UI/UX

#### Vista de Colores
- ✅ Rediseñada completamente para igualar el diseño de marcas
- ✅ Estructura con Card, CardHeader, CardContent
- ✅ ColorList componente con tabla ordenada
- ✅ Modal CreateColorDialog con diseño consistente

#### Gestión de Productos
- ✅ Implementado soporte multi-género (array en lugar de campo único)
- ✅ Checkboxes para selección múltiple de géneros
- ✅ Backend actualizado para manejar array de géneros
- ✅ Filtros de productos actualizados para búsqueda por género

#### Layout de Productos con Sidebar
- ✅ Nuevo diseño con filtros en sidebar izquierdo
- ✅ Optimización de espacio (sidebar reducido de w-80 a w-64)
- ✅ Componente ProductListWithSidebar responsivo
- ✅ Filtros colapsables en móvil

### Correcciones de Funcionalidad

#### Productos Activos por Defecto
- ✅ FORZADO: Todos los productos nuevos se crean con active: true
- ✅ Backend product.service.ts línea 87: active siempre true
- ✅ Frontend envía active pero backend lo sobrescribe por seguridad

#### Modales con Click Outside
- ✅ Implementado cierre de modales al hacer click fuera
- ✅ dialog.tsx actualizado con onClick en overlay
- ✅ stopPropagation en DialogContent para evitar cierre accidental

#### Botón de Usuarios Deshabilitado
- ✅ Agregada propiedad disabled al NavItem interface
- ✅ Botón de Usuarios marcado como disabled: true
- ✅ Renderizado condicional: muestra div gris con cursor-not-allowed
- ✅ Opacity 50% y sin funcionalidad de click

### Dependencias Instaladas
- ✅ @heroicons/react: Para iconos en página de usuarios

### Componentes Creados/Actualizados
- ✅ DeleteProductDialog: Modal de confirmación para eliminar productos
- ✅ ColorList: Lista de colores con diseño de tabla
- ✅ ProductListWithSidebar: Nueva vista con filtros laterales
- ✅ ProductTableInfinite: Tabla con scroll infinito y paginación automática

## 📜 Mejoras de UX Recientes (Enero 2025)

### Paginación con Scroll Infinito
- ✅ Implementado en la lista de productos
- ✅ Carga automática de 20 productos por página
- ✅ Indicador "Cargando más productos..." al scrollear
- ✅ Solo el área de la tabla tiene scroll (filtros y header fijos)
- ✅ Intersection Observer para detección automática

### Modal de Edición de Productos Mejorado
- ✅ **Visualización de imágenes integrada**:
  - Carrusel de imágenes en el lado izquierdo
  - Miniaturas clickeables para navegación rápida
  - Indicador de imagen actual (1 de 3, etc.)
  - Botones de navegación prev/next
- ✅ **Layout optimizado 3 columnas**:
  - Columna 1: Imágenes del producto con carrusel
  - Columnas 2-3: Formulario de edición completo
- ✅ **Gestión de stock mejorada**:
  - Muestra cantidad actual en cada talle
  - Click en la fila activa/desactiva edición
  - Badge gris con cantidad cuando no es editable
  - Input editable cuando está seleccionado
  - Preserva cantidades existentes al activar checkbox
- ✅ **Campos actualizados**:
  - Campo de Color agregado con todos los colores disponibles
  - Estado del Producto como toggle switch con fondo gris
  - Todos los campos con diseño consistente
  - Orden optimizado: Color (izq) | Estado (der)

### Optimización de Tabla de Productos
- ✅ Solo muestra datos críticos en la tabla principal
- ✅ Información combinada (marca/tipo como subtítulo)
- ✅ Modal de visualización con TODOS los detalles
- ✅ Indicadores visuales de stock y márgenes
- ✅ Tooltips en botones de acción