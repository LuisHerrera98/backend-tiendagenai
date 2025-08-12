// Script para actualizar productos existentes de stockType 'unit' a 'pack'
// Ejecutar con: node update-stocktype-to-pack.js

const { MongoClient } = require('mongodb');

// IMPORTANTE: Actualiza esta URL con tu conexión de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:GenaiForBusinessMongoSecure2025@54.94.243.68:27017/tiendagenai?authSource=admin';

async function updateStockType() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');
    
    const db = client.db();
    const collection = db.collection('products');
    
    // Primero, contar cuántos productos tienen stockType='unit'
    const countBefore = await collection.countDocuments({ stockType: 'unit' });
    console.log(`📊 Productos con stockType='unit': ${countBefore}`);
    
    if (countBefore > 0) {
      // Actualizar todos los productos de 'unit' a 'pack'
      const result = await collection.updateMany(
        { stockType: 'unit' },
        { 
          $set: { 
            stockType: 'pack',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`✅ Productos actualizados: ${result.modifiedCount}`);
      
      // También actualizar el stock de estos productos
      const stockResult = await collection.updateMany(
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
      
      console.log(`✅ Stock actualizado en ${stockResult.modifiedCount} productos`);
    } else {
      console.log('ℹ️ No hay productos con stockType="unit" para actualizar');
    }
    
    // Verificar el resultado
    const countAfter = await collection.countDocuments({ stockType: 'pack' });
    console.log(`📊 Total de productos con stockType='pack': ${countAfter}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔒 Conexión cerrada');
  }
}

// Ejecutar el script
updateStockType();