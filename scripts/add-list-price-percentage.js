/**
 * Script de migración: Agregar listPricePercentage a todos los productos
 *
 * Uso: node scripts/add-list-price-percentage.js
 *
 * Este script:
 * 1. Conecta a MongoDB
 * 2. Actualiza todos los productos que no tienen listPricePercentage
 * 3. Les asigna el valor por defecto de 25%
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
const DEFAULT_PERCENTAGE = 25;

async function migrate() {
  console.log('🚀 Iniciando migración: Agregar listPricePercentage a productos...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Contar productos sin el campo
    const countWithout = await productsCollection.countDocuments({
      listPricePercentage: { $exists: false }
    });

    const countTotal = await productsCollection.countDocuments({});

    console.log(`📊 Productos totales: ${countTotal}`);
    console.log(`📊 Productos sin listPricePercentage: ${countWithout}\n`);

    if (countWithout === 0) {
      console.log('✅ Todos los productos ya tienen listPricePercentage. No hay nada que migrar.');
      return;
    }

    // Actualizar todos los productos que no tienen el campo
    const result = await productsCollection.updateMany(
      { listPricePercentage: { $exists: false } },
      { $set: { listPricePercentage: DEFAULT_PERCENTAGE } }
    );

    console.log(`✅ Migración completada!`);
    console.log(`   - Productos actualizados: ${result.modifiedCount}`);
    console.log(`   - Porcentaje asignado: ${DEFAULT_PERCENTAGE}%\n`);

    // Verificar
    const countAfter = await productsCollection.countDocuments({
      listPricePercentage: { $exists: true }
    });
    console.log(`📊 Productos con listPricePercentage después de migración: ${countAfter}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

migrate();
