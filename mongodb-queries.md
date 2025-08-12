# MongoDB Queries para actualizar stockType

## 1. Ver productos con stockType='unit'
```javascript
db.products.find({ stockType: 'unit' })
```

## 2. Actualizar stockType de 'unit' a 'pack'
```javascript
db.products.updateMany(
  { stockType: 'unit' },
  { 
    $set: { 
      stockType: 'pack',
      updatedAt: new Date()
    } 
  }
)
```

## 3. Actualizar el stock interno de los productos
```javascript
db.products.updateMany(
  { 
    stockType: 'pack',
    'stock.size_id': 'unit'
  },
  { 
    $set: { 
      'stock.$[elem].size_id': 'pack',
      'stock.$[elem].size_name': 'PAQUETE'
    } 
  },
  {
    arrayFilters: [{ 'elem.size_id': 'unit' }]
  }
)
```

## 4. Verificar que se actualizaron correctamente
```javascript
db.products.find({ stockType: 'pack' })
```

## 5. Contar productos por tipo de stock
```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$stockType",
      count: { $sum: 1 }
    }
  }
])
```

## Ejecutar todo de una vez:
Si quieres ejecutar todo junto, puedes usar esta query en MongoDB Compass o en la consola de MongoDB:

```javascript
// Paso 1: Actualizar stockType
db.products.updateMany(
  { stockType: 'unit' },
  { 
    $set: { 
      stockType: 'pack',
      updatedAt: new Date()
    } 
  }
);

// Paso 2: Actualizar stock interno
db.products.updateMany(
  { 
    stockType: 'pack',
    'stock.size_id': 'unit'
  },
  { 
    $set: { 
      'stock.$[elem].size_id': 'pack',
      'stock.$[elem].size_name': 'PAQUETE'
    } 
  },
  {
    arrayFilters: [{ 'elem.size_id': 'unit' }]
  }
);

// Paso 3: Ver resumen
db.products.aggregate([
  {
    $group: {
      _id: "$stockType",
      count: { $sum: 1 }
    }
  }
]);
```