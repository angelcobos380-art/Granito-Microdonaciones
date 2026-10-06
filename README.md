# Granito — MVP de microdonaciones

Prototipo funcional para demo: registro, campañas ficticias, monedero con Stripe Checkout en modo prueba, donaciones atómicas y comprobantes simples.

## Requisitos

- Node.js 18+ y PostgreSQL 14+
- Una cuenta de Stripe en modo de prueba

## Inicio local

1. Crea una base PostgreSQL y ejecuta, en orden, `db/schema.sql` y `db/seed.sql`.
2. Copia `.env.example` a `backend/.env` y completa las variables. Para desarrollo define `FRONTEND_URL=http://localhost:5500`.
3. Instala y arranca la API:

```bash
cd backend
npm install
npm run dev
```

4. Sirve `frontend` con un servidor estático en el puerto 5500, por ejemplo:

```bash
npx serve frontend -l 5500
```

Abre `http://localhost:5500`. Registra una cuenta para probar el flujo. Las cinco organizaciones y campañas son ficticias y están etiquetadas como demo.

## Stripe de prueba

- Configura `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en `backend/.env`.
- En otra terminal: `stripe listen --forward-to localhost:3000/api/stripe/webhook` y usa el secreto que imprime.
- Para Checkout usa la tarjeta `4242 4242 4242 4242`, cualquier fecha futura, CVC y código postal.
- El saldo se acredita exclusivamente tras el evento `checkout.session.completed` firmado. El regreso a la página no acredita pagos.

## Despliegue

- Backend: Render, con `npm start`, las variables del `.env.example` y `FRONTEND_URL` apuntando al sitio final.
- Frontend: Netlify o Vercel como sitio estático. Antes de desplegar, reemplaza la URL local de `frontend/js/api.js` por `https://tu-backend/api`.
- En Stripe, registra `https://tu-backend/api/stripe/webhook` como endpoint de webhook.

No subas archivos `.env` ni llaves de Stripe. Antes de una demo en Render gratuito, abre `/api/health` para calentar el servicio.
