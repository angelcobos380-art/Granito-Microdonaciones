import { api, money, renderNav, escape, DEMO } from './api.js';
await renderNav();
const status = document.querySelector('#status'), history = document.querySelector('#history');

async function load() {
  try {
    const [me, moves] = await Promise.all([api('/me'), api('/movimientos')]);
    document.querySelector('#balance').textContent = money(me.saldo);
    history.innerHTML = moves.length ? moves.map((m) => `<article class="movement"><div><b>${m.tipo === 'recarga' ? 'Recarga de monedero' : `Donación · ${escape(m.campana || 'Campaña')}`}</b><div class="small">${new Date(m.fecha).toLocaleString('es-MX')} · Folio #${m.id}</div>${m.tipo === 'donacion' ? `<div class="small">${escape(m.organizacion || '')}</div>` : ''}</div><div><b>${m.tipo === 'recarga' ? '+' : '-'}${money(m.monto)}</b><div class="small">${m.estado}</div></div><small>Comprobante de prueba sin validez fiscal</small></article>`).join('') : '<p class="empty">Todavía no tienes movimientos.</p>';
  } catch (e) { status.className = 'status error'; status.textContent = e.message; }
}

// Pago simulado (solo demo): imita la pantalla de Checkout con la tarjeta de prueba.
function fakeCheckout(amount) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-back';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Pago de prueba"><p class="eyebrow">Pago de prueba</p><h2>Recargar ${money(amount)}</h2><label>Tarjeta</label><input value="4242 4242 4242 4242" readonly><div class="two"><div><label>Vence</label><input value="12 / 30" readonly></div><div><label>CVC</label><input value="123" readonly></div></div><p class="small">Simulación: no se realiza ningún cargo real.</p><div class="amounts"><button class="btn alt" id="pay">Pagar ${money(amount)}</button><button class="btn light" id="cancel">Cancelar</button></div></div>`;
    document.body.appendChild(wrap);
    const done = (ok) => { wrap.remove(); resolve(ok); };
    wrap.querySelector('#pay').onclick = () => done(true);
    wrap.querySelector('#cancel').onclick = () => done(false);
  });
}

document.querySelectorAll('.recharge').forEach((b) => b.onclick = async () => {
  b.disabled = true;
  try {
    const amount = +b.dataset.amount;
    if (DEMO && !(await fakeCheckout(amount))) { status.className = 'status error'; status.textContent = 'La recarga fue cancelada; tu saldo no cambió.'; return; }
    const r = await api('/monedero/recargar', { method: 'POST', body: JSON.stringify({ monto: amount }) });
    if (DEMO) { status.className = 'status success'; status.textContent = `¡Listo! Se agregaron ${money(amount)} a tu monedero (recarga de prueba).`; renderNav(); load(); }
    else location.href = r.url;
  } catch (e) { status.className = 'status error'; status.textContent = e.message; }
  finally { b.disabled = false; }
});

const s = new URLSearchParams(location.search).get('recarga');
if (s === 'exitosa' && !DEMO) { status.className = 'status success'; status.textContent = 'Pago enviado. Tu saldo se actualizará al confirmarse el webhook de Stripe.'; }
if (s === 'cancelada') { status.className = 'status error'; status.textContent = 'La recarga fue cancelada; tu saldo no cambió.'; }
load();
