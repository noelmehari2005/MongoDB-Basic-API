const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://db:27017';
const dbName = process.env.DB_NAME || 'storeDB';
const collectionName = process.env.COLLECTION_NAME || 'products';

let client;
let collection;

async function ConnectToDatabase() {
  if (collection) {
    return collection;
  }

  client = new MongoClient(uri);

  await client.connect();

  const db = client.db(dbName);

  collection = db.collection(collectionName);

  await collection.createIndex(
    { title: 1 },
    {
      unique: true,
      partialFilterExpression: {
        title: { $exists: true }
      }
    }
  );

  await collection.createIndex({ author: 1 });

  return collection;
}

function ToObjectId(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

async function CloseDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    collection = undefined;
  }
}

module.exports = {
  ConnectToDatabase,
  CloseDatabase,
  ToObjectId
};