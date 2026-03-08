const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Body demasiado grande'));
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

async function createStripeCheckoutSession(payload) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Falta STRIPE_SECRET_KEY en variables de entorno.');
  }

  const cart = Array.isArray(payload.cart) ? payload.cart : [];
  const customer = payload.customer || {};
  const successUrl = payload.successUrl;
  const cancelUrl = payload.cancelUrl;

  if (!successUrl || !cancelUrl) {
    throw new Error('successUrl/cancelUrl son obligatorias.');
  }

  if (!cart.length) {
    throw new Error('El carrito esta vacio.');
  }

  const form = new URLSearchParams();
  form.append('mode', 'payment');
  form.append('success_url', successUrl);
  form.append('cancel_url', cancelUrl);
  form.append('customer_creation', 'if_required');
  form.append('payment_method_types[0]', 'card');

  cart.forEach((item, i) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unitAmount = toCents(item.price);
    const name = String(item.name || `Producto ${i + 1}`).slice(0, 120);

    if (!unitAmount) return;

    form.append(`line_items[${i}][quantity]`, String(qty));
    form.append(`line_items[${i}][price_data][currency]`, 'eur');
    form.append(`line_items[${i}][price_data][unit_amount]`, String(unitAmount));
    form.append(`line_items[${i}][price_data][product_data][name]`, name);
  });

  form.append('metadata[cliente_nombre]', String(customer.nombre || ''));
  form.append('metadata[cliente_telefono]', String(customer.telefono || ''));
  form.append('metadata[cliente_direccion]', String(customer.direccion || ''));
  form.append('metadata[cliente_notas]', String(customer.notas || ''));

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Error de Stripe';
    throw new Error(msg);
  }

  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && req.url === '/create-checkout-session') {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const session = await createStripeCheckoutSession(payload);
      return sendJson(res, 200, { id: session.id, url: session.url });
    } catch (err) {
      return sendJson(res, 400, { error: err.message || 'No se pudo crear la sesion' });
    }
  }

  return sendJson(res, 404, { error: 'Ruta no encontrada' });
});

server.listen(PORT, () => {
  console.log(`Stripe server escuchando en http://localhost:${PORT}`);
});
