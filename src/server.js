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

  if (query.title) {
    filter.title = { $regex: query.title, $options: 'i' };
  }

  if (query.author) {
    filter.author = { $regex: query.author, $options: 'i' };
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};

    if (query.minPrice) {
      filter.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  if (query.minYear || query.maxYear) {
    filter.year = {};

    if (query.minYear) {
      filter.year.$gte = Number(query.minYear);
    }

    if (query.maxYear) {
      filter.year.$lte = Number(query.maxYear);
    }
  }

  return filter;
}

function ValidateProduct(product) {
  if (!product.title || typeof product.title !== 'string') {
    return 'Book title is required.';
  }

  if (!product.author || typeof product.author !== 'string') {
    return 'Author is required.';
  }

  if (typeof product.price !== 'number' || Number.isNaN(product.price) || product.price < 0) {
    return 'Price must be a non-negative number.';
  }

  if (!Number.isInteger(product.year)) {
    return 'Year must be an integer.';
  }

  return null;
}

app.get('/api/health', async (request, response) => {
  const collection = await ConnectToDatabase();
  const count = await collection.countDocuments();

  response.json({
    status: 'ok',
    database: process.env.DB_NAME,
    books: count
  });
});

app.get('/api/products', async (request, response) => {
  const collection = await ConnectToDatabase();

  const filter = BuildProductQuery(request.query);

  const products = await collection
    .find(filter)
    .sort({ title: 1 })
    .toArray();

  response.json(products);
});

app.get('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);

  if (!id) {
    return response.status(400).json({
      error: 'Invalid product id.'
    });
  }

  const collection = await ConnectToDatabase();

  const product = await collection.findOne({ _id: id });

  if (!product) {
    return response.status(404).json({
      error: 'Book not found.'
    });
  }

  response.json(product);
});

app.post('/api/products', async (request, response) => {
  const product = {
    title: request.body.title,
    author: request.body.author,
    price: Number(request.body.price),
    year: Number(request.body.year)
  };

  const error = ValidateProduct(product);

  if (error) {
    return response.status(400).json({ error });
  }

  try {
    const collection = await ConnectToDatabase();

    const result = await collection.insertOne(product);

    response.status(201).json({
      ...product,
      _id: result.insertedId
    });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({
        error: 'A book with this title already exists.'
      });
    }

    throw error;
  }
});

app.put('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);

  if (!id) {
    return response.status(400).json({
      error: 'Invalid product id.'
    });
  }

  const product = {
    title: request.body.title,
    author: request.body.author,
    price: Number(request.body.price),
    year: Number(request.body.year)
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
    return response.status(404).json({
      error: 'Book not found.'
    });
  }

  response.json(result);
});

app.patch('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);

  if (!id) {
    return response.status(400).json({
      error: 'Invalid product id.'
    });
  }

  const updates = {};

  if (request.body.title !== undefined) {
    updates.title = request.body.title;
  }

  if (request.body.author !== undefined) {
    updates.author = request.body.author;
  }

  if (request.body.price !== undefined) {
    updates.price = Number(request.body.price);
  }

  if (request.body.year !== undefined) {
    updates.year = Number(request.body.year);
  }

  const collection = await ConnectToDatabase();

  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { returnDocument: 'after' }
  );

  if (!result) {
    return response.status(404).json({
      error: 'Book not found.'
    });
  }

  response.json(result);
});

app.delete('/api/products/:id', async (request, response) => {
  const id = ToObjectId(request.params.id);

  if (!id) {
    return response.status(400).json({
      error: 'Invalid product id.'
    });
  }

  const collection = await ConnectToDatabase();

  const result = await collection.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    return response.status(404).json({
      error: 'Book not found.'
    });
  }

  response.status(204).send();
});

app.use((error, request, response, next) => {
  console.error(error);

  response.status(500).json({
    error: 'Server error.'
  });
});

const server = app.listen(port, () => {
  console.log(`Books API running on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await CloseDatabase();
  server.close();
});