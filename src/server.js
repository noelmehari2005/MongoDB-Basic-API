const express = require('express');
const path = require('path');
require('dotenv').config();

const { ConnectToDatabase, ToObjectId, CloseDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function BuildProductQuery(query) {
  const filter = {};

  if (query.warehouse) {
    filter.warehouse = query.warehouse.toUpperCase();
  }

  if (query.name) {
    filter.name = { $regex: query.name, $options: 'i' };
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.minQuantity || query.maxQuantity) {
    filter.quantity = {};
    if (query.minQuantity) filter.quantity.$gte = Number(query.minQuantity);
    if (query.maxQuantity) filter.quantity.$lte = Number(query.maxQuantity);
  }

  return filter;
}

function ValidateProduct(product) {
  if (!product.name || typeof product.name !== 'string') {
    return 'Product name is required.';
  }
  if (typeof product.price !== 'number' || product.price < 0) {
    return 'Product price must be a non-negative number.';
  }
  if (!Number.isInteger(product.quantity) || product.quantity < 0) {
    return 'Product quantity must be a non-negative integer.';
  }
  if (!product.warehouse || typeof product.warehouse !== 'string') {
    return 'Product warehouse is required.';
  }
  return null;
}

app.get('/api/health', async (request, response) => {
  const collection = await ConnectToDatabase();
  const count = await collection.countDocuments();
  response.json({ status: 'ok', database: process.env.DB_NAME, products: count });
});

app.get('/api/products', async (request, response) => {
  const collection = await ConnectToDatabase();
  const filter = BuildProductQuery(request.query);
  const products = await collection.find(filter).sort({ name: 1 }).toArray();
  response.json(products);
});

app.get('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid product id.' });
  }

  const collection = await ConnectToDatabase();
  const product = await collection.findOne({ _id: id });

  if (!product) {
    return response.status(404).json({ error: 'Product not found.' });
  }

  response.json(product);
});

app.post('/api/products', async (request, response) => {
  const product = {
    name: request.body.name,
    price: Number(request.body.price),
    quantity: Number(request.body.quantity),
    warehouse: String(request.body.warehouse || '').toUpperCase()
  };

  const error = ValidateProduct(product);
  if (error) {
    return response.status(400).json({ error });
  }

  try {
    const collection = await ConnectToDatabase();
    const result = await collection.insertOne(product);
    response.status(201).json({ ...product, _id: result.insertedId });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ error: 'A product with this name already exists.' });
    }
    throw error;
  }
});

app.put('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid product id.' });
  }

  const product = {
    name: request.body.name,
    price: Number(request.body.price),
    quantity: Number(request.body.quantity),
    warehouse: String(request.body.warehouse || '').toUpperCase()
  };

  const error = ValidateProduct(product);
  if (error) {
    return response.status(400).json({ error });
  }

  const collection = await ConnectToDatabase();
  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set: product },
    { returnDocument: 'after' }
  );

  if (!result) {
    return response.status(404).json({ error: 'Product not found.' });
  }

  response.json(result);
});

app.patch('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid product id.' });
  }

  const updates = {};
  if (request.body.name !== undefined) updates.name = request.body.name;
  if (request.body.price !== undefined) updates.price = Number(request.body.price);
  if (request.body.quantity !== undefined) updates.quantity = Number(request.body.quantity);
  if (request.body.warehouse !== undefined) updates.warehouse = String(request.body.warehouse).toUpperCase();
  if (request.body.status !== undefined) updates.status = request.body.status;
  if (request.body.reorderNeeded !== undefined) updates.reorderNeeded = Boolean(request.body.reorderNeeded);

  const collection = await ConnectToDatabase();
  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { returnDocument: 'after' }
  );

  if (!result) {
    return response.status(404).json({ error: 'Product not found.' });
  }

  response.json(result);
});

app.delete('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);
  if (!id) {
    return response.status(400).json({ error: 'Invalid product id.' });
  }

  const collection = await ConnectToDatabase();
  const result = await collection.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    return response.status(404).json({ error: 'Product not found.' });
  }

  response.status(204).send();
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'Server error.' });
});

const server = app.listen(port, () => {
  console.log(`Products API running on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await CloseDatabase();
  server.close();
});
