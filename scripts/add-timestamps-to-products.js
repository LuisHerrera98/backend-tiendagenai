/**
 * Script de migración: Agregar createdAt y updatedAt a productos existentes
 *
 * Este script:
 * 1. Conecta a MongoDB
 * 2. Encuentra todos los productos sin createdAt
 * 3. Les asigna timestamps ESCALONADOS (1 segundo de diferencia)
 * 4. Muestra estadísticas del proceso
 *
 * Uso: node scripts/add-timestamps-to-products.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Fecha base para productos existentes: 14 de enero 2025, medianoche
let BASE_DATE = new Date('2025-01-14T00:00:00.000Z');

async function migrateProducts() {
  try {
    console.log('🚀 Iniciando migración de timestamps para productos...\n');

    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('❌ MONGODB_URI no está definida en .env');
    }

    console.log(`📡 Conectando a MongoDB: ${mongoUri.replace(/\/\/.*:.*@/, '//***:***@')}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB exitosamente\n');

    // Obtener la colección de productos
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Contar productos totales
    const totalProducts = await productsCollection.countDocuments({});
    console.log(`📊 Total de productos en la base de datos: ${totalProducts}`);

    // Contar productos sin createdAt
    const productsWithoutTimestamps = await productsCollection.countDocuments({
      createdAt: { $exists: false }
    });
    console.log(`🔍 Productos sin timestamps: ${productsWithoutTimestamps}`);

    if (productsWithoutTimestamps === 0) {
      console.log('\n✨ Todos los productos ya tienen timestamps. No hay nada que migrar.\n');
      await mongoose.disconnect();
      console.log('👋 Desconectado de MongoDB');
      console.log('✨ Script completado');
      return;
    }

    console.log(`\n🔄 Actualizando ${productsWithoutTimestamps} productos...`);
    console.log(`📅 Fecha base: ${BASE_DATE.toISOString()}`);
    console.log(`⏱️  Incremento: 1 segundo por producto\n`);

    // Obtener productos sin timestamps
    const productsToUpdate = await productsCollection
      .find({ createdAt: { $exists: false } })
      .sort({ _id: 1 }) // Ordenar por _id para mantener consistencia
      .toArray();

    let updatedCount = 0;
    let currentDate = new Date(BASE_DATE);

    // Actualizar cada producto con timestamp escalonado
    for (const product of productsToUpdate) {
      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            createdAt: currentDate,
            updatedAt: currentDate
          }
        }
      );

      updatedCount++;
      // Incrementar 1 segundo para el siguiente producto
      currentDate = new Date(currentDate.getTime() + 1000);

      // Mostrar progreso cada 50 productos
      if (updatedCount % 50 === 0) {
        console.log(`   ⏳ Procesados: ${updatedCount}/${productsWithoutTimestamps}`);
      }
    }

    console.log('\n✅ Migración completada exitosamente');
    console.log(`📝 Productos actualizados: ${updatedCount}`);
    console.log(`📅 Rango de fechas: ${BASE_DATE.toISOString()} → ${currentDate.toISOString()}`);

    // Verificar resultado
    const remainingWithoutTimestamps = await productsCollection.countDocuments({
      createdAt: { $exists: false }
    });

    if (remainingWithoutTimestamps === 0) {
      console.log('\n🎉 ¡Perfecto! Todos los productos ahora tienen timestamps');
    } else {
      console.log(`\n⚠️  Atención: Aún quedan ${remainingWithoutTimestamps} productos sin timestamps`);
    }

    // Mostrar ejemplos de productos migrados (primero y último)
    const firstProduct = await productsCollection.findOne({
      createdAt: { $gte: BASE_DATE }
    }, { sort: { createdAt: 1 } });

    const lastProduct = await productsCollection.findOne({
      createdAt: { $gte: BASE_DATE }
    }, { sort: { createdAt: -1 } });

    if (firstProduct && lastProduct) {
      console.log('\n📄 Ejemplos de productos migrados:');
      console.log('\n   Primer producto:');
      console.log(`   - Nombre: ${firstProduct.name}`);
      console.log(`   - Code: ${firstProduct.code}`);
      console.log(`   - createdAt: ${firstProduct.createdAt.toISOString()}`);

      console.log('\n   Último producto:');
      console.log(`   - Nombre: ${lastProduct.name}`);
      console.log(`   - Code: ${lastProduct.code}`);
      console.log(`   - createdAt: ${lastProduct.createdAt.toISOString()}`);
    }

    // Desconectar
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
    console.log('✨ Script completado con éxito');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar migración
migrateProducts();
