const { MongoClient } = require('mongodb');

async function cleanupAdjustmentSales() {
  const client = new MongoClient('mongodb+srv://Lucho:mision2017@db-trendsneakers.bday4jw.mongodb.net/ecommerce-test');
  
  try {
    await client.connect();
    const db = client.db('ecommerce-test');
    const collection = db.collection('sells');
    
    // Eliminar todas las ventas que empiecen con "AJUSTE:"
    const result = await collection.deleteMany({
      product_name: { $regex: /^AJUSTE:/ }
    });
    
    console.log(`Eliminadas ${result.deletedCount} ventas de ajuste basura`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

cleanupAdjustmentSales();