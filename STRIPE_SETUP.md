# Stripe Setup (Cremas Tita Shop)

## 1) Variables de entorno
Copia `.env.example` a `.env` y pon tu clave:
- `STRIPE_SECRET_KEY`
- `ALLOWED_ORIGIN` (tu dominio frontend)

## 2) Ejecutar backend local
```powershell
$env:STRIPE_SECRET_KEY='sk_test_xxx'; $env:ALLOWED_ORIGIN='http://localhost:5500'; node stripe-server.js
```

## 3) Publicar
Tu frontend puede estar en GitHub Pages, pero este backend debe ir en Render/Railway/Vercel/Fly.

Configura allí:
- `STRIPE_SECRET_KEY`
- `ALLOWED_ORIGIN=https://TUUSUARIO.github.io`

## 4) Apple Pay en Stripe
En Stripe Dashboard:
- Payments -> Payment method domains
- Registra tu dominio de producción (y de pruebas si aplica)

## 5) Webhooks (recomendado)
Cuando tengas backend productivo, agrega webhook:
- Evento: `checkout.session.completed`
- URL: `https://TU_BACKEND/webhook`

Con eso confirmas pedidos en servidor de forma segura.
