require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', productSchema);

async function fixCashPricesEndingIn01() {
  try {
    console.log('🚀 Iniciando corrección de precios en efectivo terminados en 01...\n');

    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB:', MONGODB_URI.split('@')[1] || 'localhost');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente\n');

    // Obtener todos los productos con cashPrice
    const allProducts = await Product.find({ cashPrice: { $exists: true, $ne: null } });
    console.log(`📊 Total de productos con cashPrice: ${allProducts.length}\n`);

    // Filtrar productos con cashPrice que termina en 01
    const productsEndingIn01 = allProducts.filter(p => {
      const cashPriceStr = String(Math.floor(p.cashPrice));
      return cashPriceStr.endsWith('01');
    });

    console.log(`🔍 Productos con cashPrice terminando en 01: ${productsEndingIn01.length}\n`);

    if (productsEndingIn01.length === 0) {
      console.log('✨ ¡Perfecto! No hay precios en efectivo terminando en 01\n');
    } else {
      console.log('🔄 Corrigiendo precios en efectivo (01 → 00)...\n');

      let updated = 0;

      for (const product of productsEndingIn01) {
        const oldPrice = product.cashPrice;
        // Restar 1 para que termine en 00 en lugar de 01
        const newPrice = oldPrice - 1;

        await Product.updateOne(
          { _id: product._id },
          { $set: { cashPrice: newPrice } }
        );

        console.log(`  ✓ ${product.name}: $${oldPrice.toLocaleString('es-AR')} → $${newPrice.toLocaleString('es-AR')}`);
        updated++;
      }

      console.log(`\n✅ Corrección completada exitosamente`);
      console.log(`📝 Productos actualizados: ${updated}`);
    }

    // Mostrar estadísticas finales
    const finalProducts = await Product.find({ cashPrice: { $exists: true, $ne: null } });
    const finalEndingIn01 = finalProducts.filter(p => String(Math.floor(p.cashPrice)).endsWith('01'));

    console.log(`\n📊 Estadísticas finales:`);
    console.log(`   Total productos con cashPrice: ${finalProducts.length}`);
    console.log(`   Terminando en 01: ${finalEndingIn01.length}`);
    console.log(`   Corregidos: ${productsEndingIn01.length}`);

    // Mostrar ejemplos de precios finales
    console.log(`\n💡 Ejemplos de precios en efectivo corregidos:`);
    const samples = await Product.find({ cashPrice: { $exists: true, $ne: null } }).limit(8);
    samples.forEach(p => {
      console.log(`   • ${p.name}: $${p.cashPrice.toLocaleString('es-AR')}`);
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

fixCashPricesEndingIn01();
