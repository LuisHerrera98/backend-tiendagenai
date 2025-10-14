/**
 * Script de migración: pack/PAQUETE/UNIDAD → unit
 *
 * Este script actualiza todos los productos con stockType = 'pack'
 * y convierte todos los valores a 'unit' en minúscula:
 * - stockType: 'pack' → 'unit'
 * - stock.size_id: 'pack' → 'unit'
 * - stock.size_name: 'PAQUETE'/'UNIDAD' → 'unit'
 *
 * IMPORTANTE: Ejecutar UNA SOLA VEZ
 *
 * Uso:
 *   node migrate-paquete-to-unidad.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

async function migrate() {
  console.log('🔄 Iniciando migración: pack/PAQUETE/UNIDAD → unit');
  console.log('📦 Conectando a MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Buscar todos los productos con stockType = 'pack'
    const filter = {
      stockType: 'pack'
    };

    console.log('\n🔍 Buscando productos con stockType = "pack"...');
    const count = await productsCollection.countDocuments(filter);
    console.log(`📊 Productos encontrados: ${count}`);

    if (count === 0) {
      console.log('✅ No hay productos para migrar. Todo está actualizado.');
      return;
    }

    // Actualizar stockType y stock array
    console.log('\n🔧 Actualizando productos...');
    const result = await productsCollection.updateMany(
      filter,
      [
        {
          $set: {
            stockType: 'unit',
            stock: {
              $map: {
                input: '$stock',
                as: 'item',
                in: {
                  size_id: 'unit',
                  size_name: 'unit',
                  quantity: '$$item.quantity',
                  available: '$$item.available'
                }
              }
            }
          }
        }
      ]
    );

    console.log('\n✅ Migración completada:');
    console.log(`   - Productos encontrados: ${result.matchedCount}`);
    console.log(`   - Productos actualizados: ${result.modifiedCount}`);

    // Verificar que no queden productos con 'pack'
    const remaining = await productsCollection.countDocuments(filter);
    if (remaining === 0) {
      console.log('\n🎉 ¡Migración exitosa! No quedan productos con stockType "pack"');

      // Mostrar ejemplo de un producto migrado
      const sample = await productsCollection.findOne({ stockType: 'unit' });
      if (sample && sample.stock && sample.stock.length > 0) {
        console.log('\n📋 Ejemplo de producto migrado:');
        console.log(`   - stockType: ${sample.stockType}`);
        console.log(`   - stock[0].size_id: ${sample.stock[0].size_id}`);
        console.log(`   - stock[0].size_name: ${sample.stock[0].size_name}`);
      }
    } else {
      console.log(`\n⚠️  Atención: Aún quedan ${remaining} productos con stockType "pack"`);
    }

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

// Ejecutar la migración
migrate()
  .then(() => {
    console.log('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado con errores:', error);
    process.exit(1);
  });
