# Granito — Instrucciones para Codex (MVP mínimo para demo)

Plataforma web de microdonaciones. Objetivo: un prototipo funcional y desplegable para una demostración, **no** un producto de producción. Prioriza que el flujo principal funcione de punta a punta; ignora todo lo demás.

Repositorio: https://github.com/angelcobos380-art/Granito-Microdonaciones.git
Equipo: Angel Marco, Rey Emiliano, Fabricio Raul, Eduardo Daniel.

## Flujo que DEBE funcionar (criterio de éxito)

1. Una persona se registra e inicia sesión.
2. Ve la lista de campañas (mínimo 5, de organizaciones ficticias) con barra de avance.
3. Recarga su monedero con Stripe en **modo de prueba** (tarjeta `4242 4242 4242 4242`).
4. Dona $10 con un clic a una campaña.
5. La barra de avance y el saldo se actualizan sin recargar la página.
6. Ve su movimiento en "Mi cuenta" con un comprobante simple.

Si algo no ayuda a este flujo, no lo construyas.

## Stack (obligatorio)

- **Frontend:** HTML5, CSS3 y JavaScript puro (sin frameworks), mobile-first desde 360 px, usando `fetch`.
- **Backend:** Node.js + Express, API REST en JSON. Paquetes: `express`, `pg`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`, `stripe`.
- **Base de datos:** PostgreSQL (plan gratuito, p. ej. Neon o Supabase). Consultas siempre parametrizadas.
- **Pagos:** Stripe Checkout + webhook, solo modo de prueba.
- **Hosting:** frontend en Netlify o Vercel; backend en Render.

## Estructura de carpetas

```
/frontend   index.html, campana.html, login.html, cuenta.html, css/, js/
/backend    src/{routes,controllers,db}, server.js, package.json
/db         schema.sql, seed.sql
README.md   pasos para instalar y ejecutar
.env.example   (nunca subir .env; agregarlo a .gitignore)
```

## Variables de entorno (`.env.example`)

```
DATABASE_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:5500
COMMISSION_RATE=0.08
PORT=3000
```

## Fase 1 — Base de datos (`/db/schema.sql`)

Tablas (con llaves foráneas y restricciones):

- `usuarios`: id, nombre, correo UNIQUE, password_hash, rol ('donante'|'admin') default 'donante', saldo NUMERIC(10,2) default 0 **CHECK (saldo >= 0)**, fecha_registro.
- `organizaciones`: id, nombre, descripcion, logo, verificada BOOLEAN, es_ficticia BOOLEAN default true.
- `campanas`: id, organizacion_id FK, titulo, descripcion, categoria, imagen, meta NUMERIC **CHECK (meta > 0)**, recaudado NUMERIC default 0, estado ('activa'|'pausada'|'cerrada'), fecha_cierre, desglose_destino (texto o JSON; ej. "$10 = un kit escolar").
- `donaciones`: id, usuario_id FK, campana_id FK, monto **CHECK (monto > 0)**, comision, monto_causa, anonima BOOLEAN, clave_idempotencia UNIQUE, fecha.
- `movimientos_monedero`: id, usuario_id FK, tipo ('recarga'|'donacion'), monto, saldo_resultante, estado ('pendiente'|'completada'|'fallida'), id_pago_pasarela UNIQUE (nullable), fecha.

`/db/seed.sql`: 5 organizaciones y 5 campañas ficticias (categorías: Salud, Educación, Medio ambiente, Animales, Emergencias), marcadas "Organización ficticia — demo", con meta, avance inicial y desglose de fondos. Incluir un usuario admin. **El panel de administración NO se construye**: las campañas se cargan con este script.

## Fase 2 — Backend

Endpoints mínimos:

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Valida nombre, correo, contraseña (≥ 8). Hash con bcrypt. Crea saldo $0.00. |
| POST | `/api/auth/login` | Devuelve JWT de 2 h. Error genérico: "Correo o contraseña incorrectos". |
| GET | `/api/campanas?categoria=&q=` | Lista pública de campañas activas con su organización. |
| GET | `/api/campanas/:id` | Detalle, desglose de fondos y donaciones recientes (nombre o "Anónimo"). |
| GET | `/api/me` | Usuario autenticado y saldo. |
| POST | `/api/monedero/recargar` | Auth. Monto de 100 a 500. Crea sesión de Stripe Checkout y devuelve la URL. Registra movimiento 'pendiente'. |
| POST | `/api/stripe/webhook` | Verifica la firma, acredita el saldo (ver reglas). |
| POST | `/api/donaciones` | Auth. Body: `campana_id`, `monto` (5, 10 o 20), `anonima`. Header `Idempotency-Key`. |
| GET | `/api/movimientos` | Auth. Solo los del usuario, del más reciente al más antiguo. |

### Reglas críticas (no omitir)

- **Webhook:** usar `express.raw({type: 'application/json'})` solo en esa ruta para verificar la firma con `STRIPE_WEBHOOK_SECRET`. Acreditar saldo **solo** al recibir `checkout.session.completed` válido, nunca por la redirección del navegador. `id_pago_pasarela` es UNIQUE para no acreditar dos veces. Pago cancelado: el saldo no cambia.
- **Donación atómica** en una sola transacción SQL (`BEGIN`/`COMMIT`, `ROLLBACK` si falla algo): validar campaña activa y saldo suficiente → descontar saldo (con `SELECT ... FOR UPDATE` sobre el usuario) → insertar donación → sumar `recaudado` a la campaña → registrar movimiento. El saldo nunca es negativo.
- **Comisión:** `comision = monto * COMMISSION_RATE` (8 %), `monto_causa = monto - comision`. Ejemplo: $10 → $9.20 causa, $0.80 Granito. Guardar ambos valores.
- **Idempotencia:** si llega la misma `Idempotency-Key`, devolver la donación ya registrada sin cobrar de nuevo.
- Saldo insuficiente → 400 con "Saldo insuficiente". Campaña cerrada o pausada → error claro.
- Contraseñas solo como hash. Llaves solo en variables de entorno. CORS restringido a `FRONTEND_URL`. Validar toda entrada en el servidor.
- Nunca recibir ni guardar datos de tarjeta (Stripe los captura).

## Fase 3 — Frontend

Estilo: fondo crema (`#f7f1e3`), verde oscuro (`#1f3a2b`), acento naranja (`#e8782a`); títulos en tipografía serif, texto en sans-serif. Mensajes en español (México), moneda `$1,234.50`.

Pantallas mínimas:

1. **Inicio (`index.html`):** tarjetas de campañas (imagen, título, organización con sello "Organización verificada", categoría, meta, recaudado, barra de progreso), filtro por categoría, buscador por título y botones **$5 / $10 / $20** en cada tarjeta. Sin resultados: "No encontramos campañas con ese filtro". Error de servidor: botón "Reintentar".
2. **Detalle (`campana.html`):** información completa, sección "¿En qué se usará?", donaciones recientes y los mismos botones de monto.
3. **Registro / Login (`login.html`):** errores junto al campo. Si el visitante pulsa un monto sin sesión, enviarlo a iniciar sesión y recordar campaña y monto.
4. **Mi cuenta (`cuenta.html`):** saldo, botón "Recargar" ($100, $200, $500) e historial con comprobante (folio, fecha, campaña, organización, monto, "Comprobante de prueba sin validez fiscal").

Comportamiento obligatorio:

- Aviso visible en todas las pantallas: **"Modo de prueba: no se realizan cargos reales"** y saldo del usuario si hay sesión.
- Al donar: deshabilitar el botón mientras procesa, enviar `Idempotency-Key` (UUID), mostrar confirmación (monto, campaña, saldo restante) y actualizar barra y saldo **sin recargar**.
- Guardar el JWT en `localStorage`; "Cerrar sesión" lo elimina.
- Estados de carga, éxito y error en cada acción.

## Fase 4 — Despliegue y demo

1. Subir base de datos, ejecutar `schema.sql` y `seed.sql`.
2. Desplegar backend en Render (variables de entorno configuradas) y frontend en Netlify/Vercel.
3. Configurar en Stripe (modo prueba) el webhook apuntando a `https://<backend>/api/stripe/webhook`.
4. En local, usar Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. Escribir el `README.md` con instalación, variables y cómo ejecutar.
6. Antes de la demo, enviar una petición de calentamiento al backend (en plan gratuito se "duerme").

## Fuera de alcance (NO construir)

Cobros reales, panel de administración, portal de organizaciones, CFDI, verificación legal real, reembolsos, apps móviles, frameworks de frontend.

## Orden de trabajo sugerido para Codex

Haz commits pequeños por fase y verifica el flujo completo antes de pasar a la siguiente:

1. `schema.sql` + `seed.sql` y conexión a la base.
2. Auth (registro/login/JWT).
3. Listado y detalle de campañas.
4. Donación atómica con idempotencia (probar con saldo cargado manualmente por SQL).
5. Recarga con Stripe y webhook.
6. Frontend completo conectado a la API.
7. Despliegue y README.
