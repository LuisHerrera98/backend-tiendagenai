// Script para corregir el índice único del código de producto
// Elimina el índice único global de 'code' y mantiene solo el índice compuesto (tenantId, code)

const { MongoClient } = require('mongodb');

async function fixProductCodeIndex() {
  // Usa la misma URI de tu archivo .env
  const uri = process.env.MONGODB_URI || 'mongodb://admin:GenaiForBusinessMongoSecure2025@54.94.243.68:27017/tiendagenai?authSource=admin';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado a MongoDB');

    const database = client.db('tiendagenai');
    const collection = database.collection('products');

    // Listar índices existentes
    const indexes = await collection.indexes();
    console.log('\nÍndices actuales:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Buscar y eliminar cualquier índice solo de 'code' (único o no)
    const codeIndex = indexes.find(idx => 
      idx.key.code === 1 && 
      Object.keys(idx.key).length === 1
    );

    if (codeIndex) {
      console.log(`\nEliminando índice de 'code' (${codeIndex.unique ? 'único' : 'no único'}): ${codeIndex.name}`);
      await collection.dropIndex(codeIndex.name);
      console.log('Índice eliminado exitosamente');
    } else {
      console.log('\nNo se encontró índice individual de "code". Todo está bien.');
    }

    // Verificar que el índice compuesto existe
    const compoundIndex = indexes.find(idx => 
      idx.key.tenantId === 1 && 
      idx.key.code === 1 &&
      idx.unique === true
    );

    if (!compoundIndex) {
      console.log('\nCreando índice compuesto (tenantId, code) único...');
      await collection.createIndex(
        { tenantId: 1, code: 1 }, 
        { unique: true }
      );
      console.log('Índice compuesto creado exitosamente');
    } else {
      console.log('\nÍndice compuesto (tenantId, code) ya existe. Perfecto!');
    }

    // Verificar índices finales
    const finalIndexes = await collection.indexes();
    console.log('\nÍndices finales:');
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}${index.unique ? ' (único)' : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConexión cerrada');
  }
}

// Ejecutar el script
fixProductCodeIndex().catch(console.error);