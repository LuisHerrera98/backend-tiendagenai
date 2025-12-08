/**
 * Script de migración: Actualizar sistema de precios de todos los productos
 *
 * Este script:
 * 1. Elimina el campo obsoleto `listPricePercentage`
 * 2. Calcula los nuevos campos de porcentajes (ENTEROS):
 *    - profitPercentage: 122% (ganancia sobre costo para precio lista)
 *    - cashDiscountPercentage: 25% (descuento para efectivo)
 *    - transferDiscountPercentage: 25% (descuento para transferencia)
 * 3. Recalcula los precios con redondeo psicológico (modo por defecto):
 *    - price (lista): redondeado al múltiplo de 500 más cercano y -1 (precio psicológico)
 *    - cashPrice: redondeado hacia abajo al múltiplo de 500 y -1 (precio psicológico)
 *    - transferPrice: redondeado hacia abajo al múltiplo de 500 y -1 (precio psicológico)
 *
 * NOTA: Este script usa el modo 'psychological' de redondeo.
 * Cada tenant puede configurar su modo preferido en settings.priceRoundingMode:
 *   - 'psychological': Múltiplo de $500 - 1 (ej: $159.999) - DEFAULT
 *   - 'rounded': Múltiplo de $500 (ej: $160.000)
 *   - 'exact': Sin redondear (números exactos)
 *
 * Uso: node scripts/migrate-prices.js [--dry-run] [--tenant=TENANT_ID]
 *
 * Opciones:
 *   --dry-run    Solo muestra los cambios sin aplicarlos
 *   --tenant=ID  Solo migrar productos de un tenant específico
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI ='mongodb://admin:GenaiFB2025!@54.94.243.68:27017/tiendagenai?authSource=admin';

// Configuración de porcentajes (ENTEROS, sin decimales)
const CONFIG = {
  profitPercentage: 122,              // % ganancia sobre costo (entero)
  cashDiscountPercentage: 25,          // % descuento efectivo
  transferDiscountPercentage: 25,      // % descuento transferencia
};

// Funciones de redondeo psicológico
// Precio lista: redondear al múltiplo de 500 más cercano y restar 1
function roundNearest500Psychological(value) {
  const rounded = Math.round(value / 500) * 500;
  return rounded > 0 ? rounded - 1 : 0;
}

// Precio efectivo/transferencia: redondear hacia ABAJO al múltiplo de 500 y restar 1
function roundDown500Psychological(value) {
  const rounded = Math.floor(value / 500) * 500;
  return rounded > 0 ? rounded - 1 : 0;
}

// Calcular precios desde costo
function calculatePrices(cost) {
  // Precio lista = costo × (1 + profitPercentage/100)
  const rawPrice = cost * (1 + CONFIG.profitPercentage / 100);
  const price = roundNearest500Psychological(rawPrice);

  // Precio efectivo = precio lista × (1 - cashDiscountPercentage/100)
  // Nota: usamos el precio redondeado + 1 para el cálculo del descuento
  const priceForDiscount = price + 1; // Agregar el 1 que restamos para calcular correctamente
  const rawCashPrice = priceForDiscount * (1 - CONFIG.cashDiscountPercentage / 100);
  const cashPrice = roundDown500Psychological(rawCashPrice);

  // Precio transferencia = precio lista × (1 - transferDiscountPercentage/100)
  const rawTransferPrice = priceForDiscount * (1 - CONFIG.transferDiscountPercentage / 100);
  const transferPrice = roundDown500Psychological(rawTransferPrice);

  return { price, cashPrice, transferPrice };
}

async function migrate() {
  // Parsear argumentos
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tenantArg = args.find(arg => arg.startsWith('--tenant='));
  const tenantId = tenantArg ? tenantArg.split('=')[1] : null;

  console.log('🚀 Iniciando migración de precios...\n');
  console.log('📋 Configuración:');
  console.log(`   - Porcentaje de ganancia: ${CONFIG.profitPercentage}%`);
  console.log(`   - Descuento efectivo: ${CONFIG.cashDiscountPercentage}%`);
  console.log(`   - Descuento transferencia: ${CONFIG.transferDiscountPercentage}%`);
  console.log(`   - Modo: ${dryRun ? 'DRY RUN (solo visualización)' : 'REAL (aplicar cambios)'}`);
  if (tenantId) {
    console.log(`   - Tenant: ${tenantId}`);
  }
  console.log('');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Filtro base
    const filter = {};
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    // Contar productos
    const totalCount = await productsCollection.countDocuments(filter);
    console.log(`📊 Total de productos a procesar: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('✅ No hay productos para migrar.');
      return;
    }

    // Obtener todos los productos
    const products = await productsCollection.find(filter).toArray();

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('📝 Procesando productos...\n');
    console.log('─'.repeat(100));

    for (const product of products) {
      try {
        const cost = product.cost;

        if (!cost || cost <= 0) {
          console.log(`⚠️  [${product.code}] ${product.name} - Sin costo válido, saltando...`);
          skippedCount++;
          continue;
        }

        // Calcular nuevos precios
        const { price, cashPrice, transferPrice } = calculatePrices(cost);

        // Mostrar cambios
        const oldPrice = product.price || 0;
        const oldCashPrice = product.cashPrice || 0;
        const oldTransferPrice = product.transferPrice || 0;

        const priceChanged = price !== oldPrice;
        const cashPriceChanged = cashPrice !== oldCashPrice;
        const transferPriceChanged = transferPrice !== oldTransferPrice;
        const hasListPricePercentage = product.listPricePercentage !== undefined;

        if (priceChanged || cashPriceChanged || transferPriceChanged || hasListPricePercentage) {
          console.log(`\n📦 [${product.code}] ${product.name}`);
          console.log(`   Costo: $${cost.toLocaleString('es-AR')}`);

          if (priceChanged) {
            console.log(`   Precio Lista: $${oldPrice.toLocaleString('es-AR')} → $${price.toLocaleString('es-AR')}`);
          }
          if (cashPriceChanged) {
            console.log(`   Precio Efectivo: $${oldCashPrice.toLocaleString('es-AR')} → $${cashPrice.toLocaleString('es-AR')}`);
          }
          if (transferPriceChanged) {
            console.log(`   Precio Transfer: $${oldTransferPrice.toLocaleString('es-AR')} → $${transferPrice.toLocaleString('es-AR')}`);
          }
          if (hasListPricePercentage) {
            console.log(`   ❌ Eliminando listPricePercentage: ${product.listPricePercentage}`);
          }

          if (!dryRun) {
            // Aplicar cambios
            await productsCollection.updateOne(
              { _id: product._id },
              {
                $set: {
                  price,
                  cashPrice,
                  transferPrice,
                  profitPercentage: CONFIG.profitPercentage,
                  cashDiscountPercentage: CONFIG.cashDiscountPercentage,
                  transferDiscountPercentage: CONFIG.transferDiscountPercentage,
                  updatedAt: new Date(),
                },
                $unset: {
                  listPricePercentage: '',
                },
              }
            );
            console.log(`   ✅ Actualizado`);
          } else {
            console.log(`   🔍 (dry-run - no se aplicaron cambios)`);
          }

          updatedCount++;
        } else {
          // Producto ya tiene los precios correctos, solo actualizar porcentajes si faltan
          const needsPercentageUpdate =
            product.profitPercentage !== CONFIG.profitPercentage ||
            product.cashDiscountPercentage !== CONFIG.cashDiscountPercentage ||
            product.transferDiscountPercentage !== CONFIG.transferDiscountPercentage;

          if (needsPercentageUpdate && !dryRun) {
            await productsCollection.updateOne(
              { _id: product._id },
              {
                $set: {
                  profitPercentage: CONFIG.profitPercentage,
                  cashDiscountPercentage: CONFIG.cashDiscountPercentage,
                  transferDiscountPercentage: CONFIG.transferDiscountPercentage,
                  updatedAt: new Date(),
                },
                $unset: {
                  listPricePercentage: '',
                },
              }
            );
          }
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error procesando [${product.code}] ${product.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '─'.repeat(100));
    console.log('\n📊 Resumen:');
    console.log(`   ✅ Productos actualizados: ${updatedCount}`);
    console.log(`   ⏭️  Productos sin cambios: ${skippedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);

    if (dryRun) {
      console.log('\n⚠️  MODO DRY RUN: No se aplicaron cambios.');
      console.log('   Para aplicar los cambios, ejecuta sin --dry-run');
    } else {
      console.log('\n✅ Migración completada exitosamente!');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

migrate();
