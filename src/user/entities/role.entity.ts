export enum UserRole {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
  CUSTOM = 'custom'
}

export enum Permission {
  // Productos
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_EDIT = 'products.edit',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_DELETE = 'products.delete',
  PRODUCTS_COSTS = 'products.costs',
  PRODUCTS_STOCK = 'products.stock',
  PRODUCTS_DISCOUNTS = 'products.discounts',
  
  // Ventas
  SALES_VIEW = 'sales.view',
  SALES_CREATE = 'sales.create',
  SALES_EDIT = 'sales.edit',
  SALES_DELETE = 'sales.delete',
  SALES_STATS = 'sales.stats',
  
  // Pedidos
  ORDERS_VIEW = 'orders.view',
  ORDERS_MANAGE = 'orders.manage',
  
  // Categorías
  CATEGORIES_VIEW = 'categories.view',
  CATEGORIES_MANAGE = 'categories.manage',
  
  // Tallas
  SIZES_VIEW = 'sizes.view',
  SIZES_MANAGE = 'sizes.manage',
  
  // Marcas
  BRANDS_VIEW = 'brands.view',
  BRANDS_MANAGE = 'brands.manage',
  
  // Tipos
  TYPES_VIEW = 'types.view',
  TYPES_MANAGE = 'types.manage',
  
  // Géneros
  GENDERS_VIEW = 'genders.view',
  GENDERS_MANAGE = 'genders.manage',
  
  // Colores
  COLORS_VIEW = 'colors.view',
  COLORS_MANAGE = 'colors.manage',
  
  // Usuarios
  USERS_VIEW = 'users.view',
  USERS_MANAGE = 'users.manage',
  
  // Configuración
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_MANAGE = 'settings.manage',
  
  // Dashboard
  DASHBOARD_VIEW = 'dashboard.view',
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