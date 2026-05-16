const tableBody = document.querySelector('#products-body');
const form = document.querySelector('#product-form');
const message = document.querySelector('#message');

function ShowMessage(text) {
  message.textContent = text;
}

function AddProductRow(book) {
  const row = document.createElement('tr');

  row.innerHTML = `
    <td><a href="/api/products/${book._id}">${book.title}</a></td>
    <td>${book.author}</td>
    <td>$${Number(book.price).toFixed(2)}</td>
    <td>${book.year}</td>
  `;

  tableBody.appendChild(row);
}

async function LoadProducts() {
  tableBody.innerHTML = '';

  const response = await fetch('/api/products');
  const books = await response.json();

  books.forEach(AddProductRow);

  ShowMessage(`Loaded ${books.length} book(s).`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);

  const book = {
    title: formData.get('title'),
    author: formData.get('author'),
    price: Number(formData.get('price')),
    year: Number(formData.get('year'))
  };

  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book)
  });

  if (!response.ok) {
    const error = await response.json();
    ShowMessage(error.error || 'Could not add book.');
    return;
  }

  form.reset();
  await LoadProducts();
});

LoadProducts().catch(error => ShowMessage(error.message));