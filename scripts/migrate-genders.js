/**
 * Script de migración para limpiar el campo genders en productos
 *
 * Este script actualiza todos los productos existentes para setear
 * el campo genders a un array vacío [], eliminando los nombres
 * de géneros que se guardaban incorrectamente.
 *
 * A partir de ahora, genders almacenará ObjectIds de Gender en lugar de strings.
 *
 * Uso:
 * node scripts/migrate-genders.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrateGenders() {
  try {
    console.log('🚀 Iniciando migración de genders...');
    console.log(`📡 Conectando a MongoDB: ${process.env.MONGODB_URI}`);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Contar productos totales
    const totalProducts = await productsCollection.countDocuments();
    console.log(`\n📊 Total de productos en la base de datos: ${totalProducts}`);

    // Contar productos con genders no vacío
    const productsWithGenders = await productsCollection.countDocuments({
      genders: { $exists: true, $ne: [] }
    });
    console.log(`🔍 Productos con genders no vacío: ${productsWithGenders}`);

    if (productsWithGenders === 0) {
      console.log('✨ No hay productos que migrar. Todos ya tienen genders: []');
      await mongoose.connection.close();
      return;
    }

    // Actualizar todos los productos para setear genders: []
    console.log('\n🔄 Actualizando productos...');
    const result = await productsCollection.updateMany(
      {}, // Actualizar TODOS los productos
      { $set: { genders: [] } }
    );

    console.log(`\n✅ Migración completada exitosamente`);
    console.log(`📝 Productos actualizados: ${result.modifiedCount}`);
    console.log(`📝 Productos que coincidieron: ${result.matchedCount}`);

    // Verificar resultado
    const remainingWithGenders = await productsCollection.countDocuments({
      genders: { $exists: true, $ne: [] }
    });

    if (remainingWithGenders === 0) {
      console.log('\n🎉 ¡Perfecto! Todos los productos ahora tienen genders: []');
    } else {
      console.log(`\n⚠️  Advertencia: ${remainingWithGenders} productos todavía tienen genders no vacío`);
    }

    await mongoose.connection.close();
    console.log('\n👋 Desconectado de MongoDB');
    console.log('✨ Script completado');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar migración
migrateGenders();
