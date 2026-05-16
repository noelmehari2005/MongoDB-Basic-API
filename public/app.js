const tableBody = document.querySelector('#products-body');
const form = document.querySelector('#product-form');
const message = document.querySelector('#message');

function ShowMessage(text) {
  message.textContent = text;
}

function AddProductRow(product) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><a href="/api/products/${product._id}">${product.name}</a></td>
    <td>$${Number(product.price).toFixed(2)}</td>
    <td>${product.quantity}</td>
    <td>${product.warehouse}</td>
  `;
  tableBody.appendChild(row);
}

async function LoadProducts() {
  tableBody.innerHTML = '';
  const response = await fetch('/api/products');
  const products = await response.json();
  products.forEach(AddProductRow);
  ShowMessage(`Loaded ${products.length} product(s).`);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const product = {
    name: formData.get('name'),
    price: Number(formData.get('price')),
    quantity: Number(formData.get('quantity')),
    warehouse: formData.get('warehouse')
  };

  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });

  if (!response.ok) {
    const error = await response.json();
    ShowMessage(error.error || 'Could not add product.');
    return;
  }

  form.reset();
  await LoadProducts();
});

LoadProducts().catch(error => ShowMessage(error.message));
