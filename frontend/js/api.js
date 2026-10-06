// Granito — capa de datos.
// MODO DEMO (por defecto): todo vive en localStorage del navegador, no hay backend.
// MODO REAL (más adelante): en la consola del navegador ejecuta
//   localStorage.setItem('granito_api_url','https://tu-backend/api')
// y las mismas pantallas hablarán con la API de Express/PostgreSQL.

const REAL_URL = localStorage.getItem('granito_api_url');
export const DEMO = !REAL_URL;
const DB_KEY = 'granito_demo_db_v1';
const COMMISSION_RATE = 0.08;

const token = () => localStorage.getItem('granito_token');
export const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));
export const loggedIn = () => Boolean(token());
export function logout() { localStorage.removeItem('granito_token'); location.href = 'index.html'; }
export function escape(s = '') { const e = document.createElement('div'); e.textContent = s; return e.innerHTML; }

/* ------------------------- MODO REAL ------------------------- */
async function realApi(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${REAL_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No pudimos completar la solicitud.');
  return data;
}

/* ------------------------- MODO DEMO ------------------------- */
const r2 = (n) => Math.round(n * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

function seed() {
  const orgs = [
    { id: 1, nombre: 'Salud para Todas', logo: '🩺' },
    { id: 2, nombre: 'Aula Abierta', logo: '📚' },
    { id: 3, nombre: 'Raíces Vivas', logo: '🌿' },
    { id: 4, nombre: 'Huellitas Seguras', logo: '🐾' },
    { id: 5, nombre: 'Red de Ayuda', logo: '🤝' },
  ];
  const c = (id, org, titulo, descripcion, categoria, meta, recaudado, desglose, fecha) => ({
    id, organizacion_id: org, organizacion: orgs[org - 1].nombre, verificada: true, imagen: orgs[org - 1].logo,
    titulo, descripcion, categoria, meta, recaudado, estado: 'activa', fecha_cierre: fecha, desglose_destino: desglose,
  });
  return {
    next: { user: 2, movement: 1, donation: 1 },
    campaigns: [
      c(1, 1, 'Botiquines para comunidades rurales', 'Llevemos insumos de primeros auxilios a clínicas comunitarias con recursos limitados.', 'Salud', 15000, 6300, '$10 = material de curación para una familia', '2027-02-15'),
      c(2, 2, 'Mochilas llenas de futuro', 'Ayuda a equipar a estudiantes con útiles escolares para iniciar el ciclo con todo lo necesario.', 'Educación', 20000, 9250, '$10 = dos cuadernos y lápices para un estudiante', '2027-01-30'),
      c(3, 3, 'Reforestemos nuestro barrio', 'Plantaremos árboles nativos y daremos seguimiento a su cuidado durante el primer año.', 'Medio ambiente', 12000, 4800, '$10 = una plántula nativa y su protección', '2027-03-20'),
      c(4, 4, 'Alimento y refugio para lomitos', 'Apoyemos con alimento, vacunas y espacios temporales seguros para perros rescatados.', 'Animales', 18000, 11300, '$10 = una ración de alimento para un lomito', '2027-02-28'),
      c(5, 5, 'Kits de emergencia familiar', 'Preparemos kits con agua, higiene y artículos básicos para familias tras una emergencia.', 'Emergencias', 25000, 7500, '$10 = artículos de higiene para un kit familiar', '2027-01-20'),
    ],
    // usuario de ejemplo con saldo para que la demo funcione de inmediato
    users: [{ id: 1, nombre: 'Persona Demo', correo: 'demo@granito.demo', password: 'demo12345', saldo: 100 }],
    donations: [
      { id: 0, usuario_id: 0, campana_id: 1, donante: 'Marisol G.', monto: 10, fecha: ago(12) },
      { id: 0, usuario_id: 0, campana_id: 1, donante: 'Anónimo', monto: 5, fecha: ago(45) },
      { id: 0, usuario_id: 0, campana_id: 2, donante: 'Luis R.', monto: 20, fecha: ago(30) },
      { id: 0, usuario_id: 0, campana_id: 3, donante: 'Anónimo', monto: 10, fecha: ago(70) },
      { id: 0, usuario_id: 0, campana_id: 4, donante: 'Daniela P.', monto: 5, fecha: ago(20) },
      { id: 0, usuario_id: 0, campana_id: 4, donante: 'Carlos M.', monto: 10, fecha: ago(95) },
      { id: 0, usuario_id: 0, campana_id: 5, donante: 'Anónimo', monto: 20, fecha: ago(150) },
    ],
    movements: [],
  };
}
const loadDb = () => { try { const d = JSON.parse(localStorage.getItem(DB_KEY)); if (d) return d; } catch {} const d = seed(); saveDb(d); return d; };
const saveDb = (d) => localStorage.setItem(DB_KEY, JSON.stringify(d));
export function resetDemo() { localStorage.removeItem(DB_KEY); localStorage.removeItem('granito_token'); localStorage.removeItem('granito_pending'); location.href = 'index.html'; }

function currentUser(db) {
  const t = token();
  const user = t && t.startsWith('demo-') ? db.users.find((u) => u.id === Number(t.slice(5))) : null;
  if (!user) throw new Error('Inicia sesión para continuar.');
  return user;
}
const publicUser = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, saldo: u.saldo });
const listItem = (c) => ({ id: c.id, titulo: c.titulo, categoria: c.categoria, imagen: c.imagen, meta: c.meta, recaudado: c.recaudado, organizacion: c.organizacion, verificada: c.verificada, estado: c.estado });

async function demoApi(path, options = {}) {
  await sleep(180 + Math.random() * 220); // para que se vean los estados de carga
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const [route, qs = ''] = path.split('?');
  const query = new URLSearchParams(qs);
  const db = loadDb();

  if (method === 'POST' && route === '/auth/registro') {
    const nombre = String(body.nombre || '').trim(), correo = String(body.correo || '').trim().toLowerCase(), password = String(body.password || '');
    if (!nombre || !/^\S+@\S+\.\S+$/.test(correo) || password.length < 8) throw new Error('Revisa tu nombre, correo y contraseña (mínimo 8 caracteres).');
    if (db.users.some((u) => u.correo === correo)) throw new Error('Ese correo ya está registrado.');
    const user = { id: db.next.user++, nombre, correo, password, saldo: 0 };
    db.users.push(user); saveDb(db);
    return { token: 'demo-' + user.id, usuario: publicUser(user) };
  }
  if (method === 'POST' && route === '/auth/login') {
    const user = db.users.find((u) => u.correo === String(body.correo || '').trim().toLowerCase());
    if (!user || user.password !== String(body.password || '')) throw new Error('Correo o contraseña incorrectos');
    return { token: 'demo-' + user.id, usuario: publicUser(user) };
  }
  if (method === 'GET' && route === '/campanas') {
    const cat = query.get('categoria') || '', q = (query.get('q') || '').trim().toLowerCase();
    return db.campaigns.filter((c) => c.estado === 'activa' && (!cat || c.categoria === cat) && (!q || c.titulo.toLowerCase().includes(q))).map(listItem);
  }
  const detail = route.match(/^\/campanas\/(\d+)$/);
  if (method === 'GET' && detail) {
    const c = db.campaigns.find((x) => x.id === Number(detail[1]));
    if (!c) throw new Error('Campaña no encontrada');
    const recientes = db.donations.filter((d) => d.campana_id === c.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5).map((d) => ({ donante: d.donante, monto: d.monto }));
    return { ...c, donaciones_recientes: recientes };
  }
  if (method === 'GET' && route === '/me') return publicUser(currentUser(db));
  if (method === 'POST' && route === '/monedero/recargar') {
    const user = currentUser(db), monto = Number(body.monto);
    if (![100, 200, 500].includes(monto)) throw new Error('Elige una recarga de $100, $200 o $500.');
    user.saldo = r2(user.saldo + monto); // en el modo real esto lo hace el webhook de Stripe
    db.movements.push({ id: db.next.movement++, usuario_id: user.id, tipo: 'recarga', monto, estado: 'completada', fecha: new Date().toISOString(), campana: null, organizacion: null });
    saveDb(db);
    return { url: `cuenta.html?recarga=exitosa&monto=${monto}` };
  }
  if (method === 'POST' && route === '/donaciones') {
    const user = currentUser(db), monto = Number(body.monto), c = db.campaigns.find((x) => x.id === Number(body.campana_id));
    if (![5, 10, 20].includes(monto) || !c) throw new Error('Datos de donación inválidos.');
    if (c.estado !== 'activa') throw new Error('Esta campaña está cerrada o pausada.');
    if (user.saldo < monto) throw new Error('Saldo insuficiente');
    const comision = r2(monto * COMMISSION_RATE), causa = r2(monto - comision);
    user.saldo = r2(user.saldo - monto);
    c.recaudado = r2(c.recaudado + causa);
    const donacion = { id: db.next.donation++, usuario_id: user.id, campana_id: c.id, donante: body.anonima ? 'Anónimo' : user.nombre, monto, comision, monto_causa: causa, fecha: new Date().toISOString() };
    db.donations.push(donacion);
    db.movements.push({ id: db.next.movement++, usuario_id: user.id, tipo: 'donacion', monto, estado: 'completada', fecha: donacion.fecha, campana: c.titulo, organizacion: c.organizacion });
    saveDb(db);
    return { donacion: { ...donacion, titulo: c.titulo }, saldo: user.saldo, campana: { recaudado: c.recaudado, meta: c.meta } };
  }
  if (method === 'GET' && route === '/movimientos') {
    const user = currentUser(db);
    return db.movements.filter((m) => m.usuario_id === user.id).sort((a, b) => b.id - a.id);
  }
  throw new Error('Ruta no disponible en el modo demo.');
}

export const api = (path, options) => (DEMO ? demoApi(path, options) : realApi(path, options));

/* ------------------------- Interfaz común ------------------------- */
export async function renderNav() {
  const host = document.querySelector('[data-nav]'); if (!host) return;
  let account = 'Iniciar sesión', action = 'login.html';
  if (loggedIn()) { try { const me = await api('/me'); account = `Mi cuenta · ${money(me.saldo)}`; action = 'cuenta.html'; } catch { localStorage.removeItem('granito_token'); } }
  host.innerHTML = `<div class="notice">Modo de prueba: no se realizan cargos reales${DEMO ? ' · Demo sin servidor, datos guardados solo en este navegador · <a href="#" id="reset-demo">Reiniciar demo</a>' : ''}</div><header class="header"><nav class="wrap nav"><a class="brand" href="index.html">🌾 Granito</a><div class="nav-links"><a href="index.html">Campañas</a><a class="balance" href="${action}">${account}</a>${loggedIn() ? '<button class="btn light" id="logout">Cerrar sesión</button>' : ''}</div></nav></header>`;
  document.querySelector('#logout')?.addEventListener('click', logout);
  document.querySelector('#reset-demo')?.addEventListener('click', (e) => { e.preventDefault(); if (confirm('¿Reiniciar la demo? Se borran tus cuentas y donaciones de prueba.')) resetDemo(); });
}

export async function donate(campaign, amount, button) {
  if (!loggedIn()) { localStorage.setItem('granito_pending', JSON.stringify({ campaign, amount })); location.href = 'login.html'; return; }
  button.disabled = true; const initial = button.textContent; button.textContent = 'Donando…';
  try {
    const result = await api('/donaciones', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ campana_id: campaign, monto: amount, anonima: false }) });
    window.dispatchEvent(new CustomEvent('donated', { detail: result }));
    return result;
  } finally { button.disabled = false; button.textContent = initial; }
}
