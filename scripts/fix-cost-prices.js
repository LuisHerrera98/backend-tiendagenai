require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', productSchema);

async function fixCostPrices() {
  try {
    console.log('🚀 Iniciando corrección de precios de costo...\n');

    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB:', MONGODB_URI.split('@')[1] || 'localhost');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente\n');

    // Obtener todos los productos con cost
    const allProducts = await Product.find({ cost: { $exists: true, $ne: null } });
    console.log(`📊 Total de productos con cost: ${allProducts.length}\n`);

    // Filtrar productos con cost que termina en 01
    const productsEndingIn01 = allProducts.filter(p => {
      const costStr = String(p.cost);
      return costStr.endsWith('01');
    });

    console.log(`🔍 Productos con cost terminando en 01: ${productsEndingIn01.length}\n`);

    if (productsEndingIn01.length === 0) {
      console.log('✨ ¡Perfecto! No hay precios de costo terminando en 01\n');
    } else {
      console.log('🔄 Corrigiendo precios de costo (01 → 00)...\n');

      let updated = 0;

      for (const product of productsEndingIn01) {
        const oldCost = product.cost;
        // Restar 1 para que termine en 00 en lugar de 01
        const newCost = oldCost - 1;

        await Product.updateOne(
          { _id: product._id },
          { $set: { cost: newCost } }
        );

        console.log(`  ✓ ${product.name}: $${oldCost.toLocaleString('es-AR')} → $${newCost.toLocaleString('es-AR')}`);
        updated++;
      }

      console.log(`\n✅ Corrección completada exitosamente`);
      console.log(`📝 Productos actualizados: ${updated}`);
    }

    // Mostrar estadísticas finales
    const finalProducts = await Product.find({ cost: { $exists: true, $ne: null } });
    const finalEndingIn01 = finalProducts.filter(p => String(p.cost).endsWith('01'));

    console.log(`\n📊 Estadísticas finales:`);
    console.log(`   Total productos: ${finalProducts.length}`);
    console.log(`   Terminando en 01: ${finalEndingIn01.length}`);
    console.log(`   Corregidos: ${finalProducts.length - finalEndingIn01.length}`);

    // Mostrar ejemplos de costos finales
    console.log(`\n💡 Ejemplos de precios de costo corregidos:`);
    const samples = await Product.find({ cost: { $exists: true, $ne: null } }).limit(5);
    samples.forEach(p => {
      console.log(`   • ${p.name}: $${p.cost.toLocaleString('es-AR')}`);
    });

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
    console.log('✨ Script completado\n');
    process.exit(0);
  }
}

fixCostPrices();
