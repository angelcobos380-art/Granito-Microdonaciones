require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const pool = require('./src/db/pool');
const auth = require('./src/middleware/auth');

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const PORT = Number(process.env.PORT || 3000);
const commissionRate = Number(process.env.COMMISSION_RATE || 0.08);
const money = (value) => Number(Number(value).toFixed(2));
const emailOk = (email) => /^\S+@\S+\.\S+$/.test(String(email));

// Stripe necesita el cuerpo sin interpretar para comprobar la firma.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Stripe no está configurado' });
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return res.status(400).send(`Firma de webhook inválida: ${error.message}`); }
  if (event.type !== 'checkout.session.completed') return res.json({ received: true });
  const session = event.data.object;
  const movementId = Number(session.metadata?.movimiento_id);
  const userId = Number(session.metadata?.usuario_id);
  const amount = money((session.amount_total || 0) / 100);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM movimientos_monedero WHERE id_pago_pasarela = $1 FOR UPDATE', [session.id]);
    if (existing.rowCount) { await client.query('COMMIT'); return res.json({ received: true, duplicate: true }); }
    const pending = await client.query("SELECT * FROM movimientos_monedero WHERE id = $1 AND usuario_id = $2 AND estado = 'pendiente' FOR UPDATE", [movementId, userId]);
    if (!pending.rowCount || money(pending.rows[0].monto) !== amount) throw new Error('Movimiento de recarga inválido');
    const user = await client.query('SELECT saldo FROM usuarios WHERE id = $1 FOR UPDATE', [userId]);
    if (!user.rowCount) throw new Error('Usuario no encontrado');
    const newBalance = money(Number(user.rows[0].saldo) + amount);
    await client.query('UPDATE usuarios SET saldo = $1 WHERE id = $2', [newBalance, userId]);
    await client.query("UPDATE movimientos_monedero SET estado = 'completada', saldo_resultante = $1, id_pago_pasarela = $2 WHERE id = $3", [newBalance, session.id, movementId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); console.error('Webhook:', error.message); return res.status(400).json({ error: 'No se pudo acreditar la recarga' }); }
  finally { client.release(); }
  res.json({ received: true });
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5500' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/registro', async (req, res) => {
  const { nombre, correo, password } = req.body || {};
  if (!nombre?.trim() || !emailOk(correo) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Revisa tu nombre, correo y contraseña (mínimo 8 caracteres).' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO usuarios (nombre, correo, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, correo, saldo', [nombre.trim(), correo.trim().toLowerCase(), hash]);
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, nombre: user.nombre }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.status(201).json({ token, usuario: user });
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado.' }); res.status(500).json({ error: 'No pudimos crear tu cuenta.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { correo, password } = req.body || {};
  try {
    const result = await pool.query('SELECT id, nombre, correo, password_hash, saldo FROM usuarios WHERE correo = $1', [String(correo || '').trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    const token = jwt.sign({ id: user.id, nombre: user.nombre }, process.env.JWT_SECRET, { expiresIn: '2h' });
    delete user.password_hash; res.json({ token, usuario: user });
  } catch { res.status(500).json({ error: 'No pudimos iniciar sesión.' }); }
});

app.get('/api/campanas', async (req, res) => {
  const category = String(req.query.categoria || '').trim(); const q = String(req.query.q || '').trim();
  try {
    const result = await pool.query(`SELECT c.*, o.nombre AS organizacion, o.logo, o.verificada, o.es_ficticia FROM campanas c JOIN organizaciones o ON o.id=c.organizacion_id WHERE c.estado='activa' AND ($1='' OR c.categoria=$1) AND ($2='' OR c.titulo ILIKE '%' || $2 || '%') ORDER BY c.id`, [category, q]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'No pudimos cargar las campañas.' }); }
});

app.get('/api/campanas/:id', async (req, res) => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: 'Campaña inválida' });
  try {
    const campaign = await pool.query(`SELECT c.*, o.nombre AS organizacion, o.logo, o.verificada, o.es_ficticia FROM campanas c JOIN organizaciones o ON o.id=c.organizacion_id WHERE c.id=$1`, [id]);
    if (!campaign.rowCount) return res.status(404).json({ error: 'Campaña no encontrada' });
    const donations = await pool.query(`SELECT d.monto, d.fecha, CASE WHEN d.anonima THEN 'Anónimo' ELSE u.nombre END AS donante FROM donaciones d JOIN usuarios u ON u.id=d.usuario_id WHERE d.campana_id=$1 ORDER BY d.fecha DESC LIMIT 10`, [id]);
    res.json({ ...campaign.rows[0], donaciones_recientes: donations.rows });
  } catch { res.status(500).json({ error: 'No pudimos cargar la campaña.' }); }
});

app.get('/api/me', auth, async (req, res) => {
  const result = await pool.query('SELECT id, nombre, correo, saldo FROM usuarios WHERE id=$1', [req.usuario.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' }); res.json(result.rows[0]);
});

app.post('/api/monedero/recargar', auth, async (req, res) => {
  const amount = Number(req.body?.monto);
  if (![100, 200, 500].includes(amount)) return res.status(400).json({ error: 'Elige una recarga de $100, $200 o $500.' });
  if (!stripe) return res.status(503).json({ error: 'Stripe no está configurado. Agrega STRIPE_SECRET_KEY.' });
  try {
    const movement = await pool.query("INSERT INTO movimientos_monedero (usuario_id,tipo,monto,estado) VALUES ($1,'recarga',$2,'pendiente') RETURNING id", [req.usuario.id, amount]);
    const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'], line_items: [{ price_data: { currency: 'mxn', product_data: { name: `Recarga de monedero Granito ($${amount})` }, unit_amount: amount * 100 }, quantity: 1 }], metadata: { movimiento_id: String(movement.rows[0].id), usuario_id: String(req.usuario.id) }, success_url: `${process.env.FRONTEND_URL}/cuenta.html?recarga=exitosa`, cancel_url: `${process.env.FRONTEND_URL}/cuenta.html?recarga=cancelada` });
    res.json({ url: session.url });
  } catch (error) { console.error(error.message); res.status(500).json({ error: 'No pudimos iniciar el pago.' }); }
});

app.post('/api/donaciones', auth, async (req, res) => {
  const campaignId = Number(req.body?.campana_id), amount = Number(req.body?.monto), anonymous = Boolean(req.body?.anonima);
  const key = String(req.get('Idempotency-Key') || '');
  if (!Number.isInteger(campaignId) || ![5, 10, 20].includes(amount) || key.length < 8 || key.length > 255) return res.status(400).json({ error: 'Datos de donación inválidos.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const duplicate = await client.query('SELECT d.*, c.titulo FROM donaciones d JOIN campanas c ON c.id=d.campana_id WHERE d.clave_idempotencia=$1', [key]);
    if (duplicate.rowCount) { await client.query('COMMIT'); return res.json({ donacion: duplicate.rows[0], repetida: true }); }
    const user = await client.query('SELECT saldo FROM usuarios WHERE id=$1 FOR UPDATE', [req.usuario.id]);
    const campaign = await client.query('SELECT id, titulo, recaudado, meta, estado FROM campanas WHERE id=$1 FOR UPDATE', [campaignId]);
    if (!campaign.rowCount) throw Object.assign(new Error('Campaña no encontrada'), { status: 404 });
    if (campaign.rows[0].estado !== 'activa') throw Object.assign(new Error('Esta campaña está cerrada o pausada.'), { status: 400 });
    if (!user.rowCount || Number(user.rows[0].saldo) < amount) throw Object.assign(new Error('Saldo insuficiente'), { status: 400 });
    const balance = money(Number(user.rows[0].saldo) - amount), commission = money(amount * commissionRate), causeAmount = money(amount - commission);
    await client.query('UPDATE usuarios SET saldo=$1 WHERE id=$2', [balance, req.usuario.id]);
    const donation = await client.query('INSERT INTO donaciones (usuario_id,campana_id,monto,comision,monto_causa,anonima,clave_idempotencia) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [req.usuario.id, campaignId, amount, commission, causeAmount, anonymous, key]);
    const updated = await client.query('UPDATE campanas SET recaudado=recaudado+$1 WHERE id=$2 RETURNING recaudado, meta', [causeAmount, campaignId]);
    await client.query("INSERT INTO movimientos_monedero (usuario_id,tipo,monto,saldo_resultante,estado) VALUES ($1,'donacion',$2,$3,'completada')", [req.usuario.id, amount, balance]);
    await client.query('COMMIT');
    res.status(201).json({ donacion: { ...donation.rows[0], titulo: campaign.rows[0].titulo }, saldo: balance, campana: updated.rows[0] });
  } catch (error) { await client.query('ROLLBACK'); res.status(error.status || 500).json({ error: error.status ? error.message : 'No pudimos procesar la donación.' }); }
  finally { client.release(); }
});

app.get('/api/movimientos', auth, async (req, res) => {
  try { const result = await pool.query(`SELECT m.*, d.id AS donacion_id, c.titulo AS campana, o.nombre AS organizacion FROM movimientos_monedero m LEFT JOIN donaciones d ON d.usuario_id=m.usuario_id AND d.monto=m.monto AND m.tipo='donacion' AND d.fecha BETWEEN m.fecha - INTERVAL '2 seconds' AND m.fecha + INTERVAL '2 seconds' LEFT JOIN campanas c ON c.id=d.campana_id LEFT JOIN organizaciones o ON o.id=c.organizacion_id WHERE m.usuario_id=$1 ORDER BY m.fecha DESC`, [req.usuario.id]); res.json(result.rows); }
  catch { res.status(500).json({ error: 'No pudimos cargar tus movimientos.' }); }
});

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Ocurrió un error inesperado.' }); });
app.listen(PORT, () => console.log(`Granito API en http://localhost:${PORT}`));
