export enum UserRole {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
  CUSTOM = 'CUSTOM'
}

export enum Permission {
  // Productos
  PRODUCTS_VIEW = 'products_view',
  PRODUCTS_EDIT = 'products_edit',
  PRODUCTS_CREATE = 'products_create',
  PRODUCTS_DELETE = 'products_delete',
  PRODUCTS_VIEW_COSTS = 'products_view_costs',
  PRODUCTS_MANAGE_STOCK = 'products_manage_stock',
  PRODUCTS_MANAGE_DISCOUNTS = 'products_manage_discounts',
  
  // Ventas
  SALES_VIEW = 'sales_view',
  SALES_CREATE = 'sales_create',
  SALES_EDIT = 'sales_edit',
  SALES_DELETE = 'sales_delete',
  SALES_VIEW_STATS = 'sales_view_stats',
  
  // Pedidos
  ORDERS_VIEW = 'orders_view',
  ORDERS_MANAGE = 'orders_manage',
  
  // Categorías
  CATEGORIES_VIEW = 'categories_view',
  CATEGORIES_MANAGE = 'categories_manage',
  
  // Tallas
  SIZES_VIEW = 'sizes_view',
  SIZES_MANAGE = 'sizes_manage',
  
  // Marcas
  BRANDS_VIEW = 'brands_view',
  BRANDS_MANAGE = 'brands_manage',
  
  // Tipos
  TYPES_VIEW = 'types_view',
  TYPES_MANAGE = 'types_manage',
  
  // Géneros
  GENDERS_VIEW = 'genders_view',
  GENDERS_MANAGE = 'genders_manage',
  
  // Colores
  COLORS_VIEW = 'colors_view',
  COLORS_MANAGE = 'colors_manage',
  
  // Usuarios
  USERS_VIEW = 'users_view',
  USERS_MANAGE = 'users_manage',
  
  // Configuración
  SETTINGS_VIEW = 'settings_view',
  SETTINGS_MANAGE = 'settings_manage',
  
  // Dashboard
  DASHBOARD_VIEW = 'dashboard_view',
}

// Permisos por defecto para cada rol
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission), // Todos los permisos
  
  [UserRole.VENDEDOR]: [
    Permission.PRODUCTS_VIEW,
    Permission.SALES_VIEW,
    Permission.SALES_CREATE,
    Permission.ORDERS_VIEW,
    Permission.CATEGORIES_VIEW,
    Permission.SIZES_VIEW,
    Permission.BRANDS_VIEW,
    Permission.TYPES_VIEW,
    Permission.GENDERS_VIEW,
    Permission.COLORS_VIEW,
    Permission.DASHBOARD_VIEW,
  ],
  
  [UserRole.CUSTOM]: [] // Sin permisos por defecto, se asignan manualmente
}