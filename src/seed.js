const { ConnectToDatabase, CloseDatabase } = require('./db');
const products = require('./products');

async function Seed() {
  const collection = await ConnectToDatabase();
  await collection.deleteMany({});
  const result = await collection.insertMany(products);
  console.log(`Inserted ${result.insertedCount} products.`);
}

Seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(CloseDatabase);
