require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({}, { strict: false, collection: 'products' });
const Product = mongoose.model('Product', productSchema);

// Redondeo psicológico: terminar precios en 99, 999, 9999, etc.
function roundToPsychologicalPrice(price) {
  if (price <= 0) return price;

  let multiple;

  if (price >= 10000) {
    // Precios >= 10000 → redondear a miles y terminar en 999
    // Ejemplo: 75123 → 74999, 152345 → 151999
    multiple = 1000;
  } else if (price >= 1000) {
    // Precios >= 1000 → redondear a cientos y terminar en 99
    // Ejemplo: 1567 → 1499, 5234 → 4999
    multiple = 100;
  } else if (price >= 100) {
    // Precios >= 100 → redondear a decenas y terminar en 9
    // Ejemplo: 523 → 519, 876 → 869
    multiple = 10;
  } else {
    // Precios < 100 → redondear hacia abajo
    return Math.floor(price);
  }

  // Redondear hacia abajo al múltiplo y restar 1
  return Math.floor(price / multiple) * multiple - 1;
}

async function fixCashPrices() {
  try {
    console.log('🚀 Iniciando corrección de precios en efectivo...\n');

    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB:', MONGODB_URI.split('@')[1] || 'localhost');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente\n');

    // Obtener todos los productos con cashPrice
    const allProducts = await Product.find({ cashPrice: { $exists: true, $ne: null } });
    console.log(`📊 Total de productos con cashPrice: ${allProducts.length}\n`);

    console.log('🔄 Aplicando redondeo psicológico (precios terminan en 99, 999, etc.)...\n');

    let updated = 0;
    let unchanged = 0;

    for (const product of allProducts) {
      const oldPrice = product.cashPrice;
      const newPrice = roundToPsychologicalPrice(oldPrice);

      if (oldPrice !== newPrice) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { cashPrice: newPrice } }
        );

        console.log(`  ✓ ${product.name}: $${oldPrice.toLocaleString('es-AR')} → $${newPrice.toLocaleString('es-AR')}`);
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log(`\n✅ Migración completada exitosamente`);
    console.log(`📝 Productos actualizados: ${updated}`);
    console.log(`📝 Productos sin cambios: ${unchanged}`);

    // Mostrar ejemplos de precios finales
    console.log(`\n💡 Ejemplos de precios psicológicos aplicados:`);
    const samples = await Product.find({ cashPrice: { $exists: true, $ne: null } }).limit(5);
    samples.forEach(p => {
      console.log(`   • ${p.name}: $${p.cashPrice.toLocaleString('es-AR')}`);
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
    console.log('✨ Script completado\n');
    process.exit(0);
  }
}

fixCashPrices();
