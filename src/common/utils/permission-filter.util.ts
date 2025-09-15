import { UserRole, Permission, DEFAULT_PERMISSIONS } from '../../user/entities/role.entity';

export class PermissionFilterUtil {
  /**
   * Verifica si un usuario tiene un permiso específico
   */
  static hasPermission(user: any, permission: Permission): boolean {
    if (!user) return false;
    
    // Super admin siempre tiene acceso
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Obtener permisos del usuario
    let userPermissions: Permission[] = [];
    
    if (user.role === UserRole.CUSTOM) {
      // Usuario custom usa sus permisos específicos
      userPermissions = user.permissions || [];
    } else {
      // Otros roles usan permisos por defecto
      userPermissions = DEFAULT_PERMISSIONS[user.role] || [];
    }

    return userPermissions.includes(permission);
  }

  /**
   * Filtra los campos sensibles de un producto según los permisos del usuario
   */
  static filterProductData(product: any, user: any): any {
    if (!product) return product;

    // Crear una copia del producto para no mutar el original
    const filteredProduct = { ...product };

    // Si el usuario no tiene permiso PRODUCTS_COSTS, eliminar el campo cost
    if (!this.hasPermission(user, Permission.PRODUCTS_VIEW_COSTS)) {
      delete filteredProduct.cost;
      
      // Si es un objeto de Mongoose, también eliminar del _doc
      if (filteredProduct._doc) {
        delete filteredProduct._doc.cost;
      }
    }

    return filteredProduct;
  }

  /**
   * Filtra una lista de productos según los permisos del usuario
   */
  static filterProductList(products: any[], user: any): any[] {
    if (!Array.isArray(products)) return products;
    
    return products.map(product => this.filterProductData(product, user));
  }

  /**
   * Filtra las estadísticas de ventas según los permisos del usuario
   */
  static filterSalesStats(stats: any, user: any): any {
    if (!stats) return stats;

    // Crear una copia de las estadísticas
    const filteredStats = { ...stats };

    // Si el usuario no tiene permiso SALES_STATS, eliminar estadísticas de ganancias
    if (!this.hasPermission(user, Permission.SALES_VIEW_STATS)) {
      delete filteredStats.totalProfit;
      delete filteredStats.averageProfit;
      delete filteredStats.profitByPeriod;
      delete filteredStats.costAnalysis;
      
      // Si es un objeto de Mongoose, también eliminar del _doc
      if (filteredStats._doc) {
        delete filteredStats._doc.totalProfit;
        delete filteredStats._doc.averageProfit;
        delete filteredStats._doc.profitByPeriod;
        delete filteredStats._doc.costAnalysis;
      }
    }

    return filteredStats;
  }
}