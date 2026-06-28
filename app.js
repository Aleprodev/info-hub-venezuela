/**
 * app.js — Venezuela InfoSismo · Terremoto 2026
 * Lógica principal: USGS API, renderizado de secciones, online/offline
 */

'use strict';

// ─── CONSTANTES ─────────────────────────────────────────────────────────────

const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query?' +
  'format=geojson' +
  '&starttime=7daysago' +
  '&endtime=now' +
  '&minlatitude=0&maxlatitude=15' +
  '&minlongitude=-75&maxlongitude=-55' +
  '&minmagnitude=4' +
  '&orderby=time' +
  '&limit=20';

const LOCALIZADOS_API  = 'https://localizadosvenezuela.com/api/v1/localizados?q=';
const LOCALIZADOS_BASE = 'https://localizadosvenezuela.com/localizados';

const LS_KEY_SISMOS    = 'vzla_sismos_cache';
const LS_KEY_TIMESTAMP = 'vzla_sismos_ts';
const LS_KEY_ZONA      = 'vzla_zona';
const DATA_URL         = './data.json';

const FETCH_TIMEOUT_MS     = 8000;
const URL_CHECK_TIMEOUT_MS = 5000;
const SEARCH_DEBOUNCE_MS   = 350;
const COPY_FEEDBACK_MS     = 1300;
const TOAST_DURATION_MS    = 1800;
const MAX_SISMOS_LIST      = 10;
const MAX_LOCALIZADOS      = 20;

// ─── ESTADO ─────────────────────────────────────────────────────────────────

const state = {
  online: navigator.onLine,
  sismos: null,
  sismosFromCache: false,
  data: null,
  zona: localStorage.getItem(LS_KEY_ZONA) || 'all',
};

// ─── FILTRO POR ZONA ──────────────────────────────────────────────────────────

/**
 * Determina si un item es relevante para la zona seleccionada.
 * Los recursos "nacionales" (o sin estado) siempre se muestran.
 */
function matchesZone(item) {
  if (state.zona === 'all') return true;
  if (!item.estado || item.estado === 'nacional') return true;
  return item.estado === state.zona;
}

// ─── UTILIDADES ─────────────────────────────────────────────────────────────

function magColor(mag) {
  if (mag >= 7.0) return 'text-red-400 font-black';
  if (mag >= 6.0) return 'text-orange-400 font-black';
  if (mag >= 5.0) return 'text-amber-400 font-bold';
  if (mag >= 4.0) return 'text-yellow-400 font-semibold';
  return 'text-slate-300';
}

function magBadgeBg(mag) {
  if (mag >= 7.0) return 'bg-red-950 border-red-700 text-red-300';
  if (mag >= 6.0) return 'bg-orange-950 border-orange-700 text-orange-300';
  if (mag >= 5.0) return 'bg-amber-950 border-amber-700 text-amber-300';
  return 'bg-slate-800 border-slate-600 text-slate-300';
}

function magLabel(mag) {
  if (mag >= 8.0) return 'Catastrófico';
  if (mag >= 7.0) return 'Mayor';
  if (mag >= 6.0) return 'Fuerte';
  if (mag >= 5.0) return 'Moderado';
  if (mag >= 4.0) return 'Ligero';
  return 'Micro';
}

/** Timestamp Unix (ms) a tiempo relativo legible */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (mins < 2)  return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  if (hrs < 24)  return `Hace ${hrs}h ${mins % 60}min`;
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('es-VE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Caracas',
  });
}

/** Escapar caracteres HTML para inserción segura vía innerHTML */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Validar que una URL tenga scheme seguro antes de insertarla en un href */
function safeUrl(url) {
  if (!url) return '#';
  const s = String(url).trim();
  return /^(https?:|tel:|mailto:)/i.test(s) ? s : '#';
}

// ─── COPIAR AL PORTAPAPELES ───────────────────────────────────────────────────

let copyToastTimer = null;

function showCopyToast(msg) {
  const toast = document.getElementById('copy-toast');
  const text  = document.getElementById('copy-toast-text');
  if (!toast) return;
  if (text) text.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(copyToastTimer);
  copyToastTimer = setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION_MS);
}

function copyText(text, btn) {
  if (btn?.dataset.copying) return;

  const onDone = () => {
    showCopyToast(`Copiado: ${text}`);
    if (btn) {
      btn.dataset.copying = 'true';
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="text-emerald-400">✓ Copiado</span>';
      setTimeout(() => {
        btn.innerHTML = original;
        delete btn.dataset.copying;
      }, COPY_FEEDBACK_MS);
    }
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone));
  } else {
    fallbackCopy(text, onDone);
  }
}

function fallbackCopy(text, onDone) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onDone();
  } catch {
    showCopyToast('No se pudo copiar');
  }
}

/** Íconos SVG — referencian los símbolos definidos en index.html */
const ICON_PHONE = `<svg class="w-5 h-5 shrink-0" aria-hidden="true"><use href="#icon-phone"></use></svg>`;
const ICON_COPY  = `<svg class="w-5 h-5 shrink-0" aria-hidden="true"><use href="#icon-copy"></use></svg>`;

/**
 * Botones Copiar + Llamar para un número de teléfono.
 * El botón Copiar usa data-copy (delegación de eventos).
 */
function callActions(telefono, nombre) {
  const tel        = String(telefono).replace(/[\s()]/g, '');
  const safe       = esc(telefono);
  const safeNombre = esc(nombre || 'contacto');
  return `
    <p class="text-sm text-slate-300 font-mono mt-2">${safe}</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button type="button" data-copy="${safe}" aria-label="Copiar teléfono de ${safeNombre}"
        class="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 font-semibold text-sm transition-colors">
        ${ICON_COPY} Copiar
      </button>
      <a href="tel:${esc(tel)}" aria-label="Llamar a ${safeNombre}"
        class="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-800 text-green-50 font-semibold text-sm transition-colors">
        ${ICON_PHONE} Llamar
      </a>
    </div>
  `;
}

/** Eliminar prefijos de distancia/dirección que USGS incluye en place */
function cleanPlace(place) {
  return place
    .replace(/^\d+(\.\d+)?\s*km\s*(NW|NE|SW|SE|N|S|E|W)\s*of\s*/i, '')
    .replace(/^[A-Z]+\s+of\s+/i, '')
    .trim();
}

/** Traducir términos geográficos inglés → español */
function translatePlace(place) {
  return cleanPlace(place)
    .replace(/Caribbean Sea/gi,  'Mar Caribe')
    .replace(/Atlantic Ocean/gi, 'Océano Atlántico');
}

// ─── ESTADO ONLINE/OFFLINE ──────────────────────────────────────────────────

function updateOnlineStatus() {
  state.online = navigator.onLine;
  const dot   = document.getElementById('status-dot');
  const text  = document.getElementById('status-text-mini');
  const toast = document.getElementById('offline-toast');

  if (dot)   dot.className    = `w-1.5 h-1.5 rounded-full ${state.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`;
  if (text)  text.textContent = state.online ? 'En línea' : 'Sin conexión';
  if (toast) toast.classList.toggle('hidden', state.online);
}

function updateLastUpdateTime(ts) {
  const el = document.getElementById('last-update');
  if (!el) return;
  const time = new Date(ts).toLocaleTimeString('es-VE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas',
  });
  el.textContent = `Act. ${time}`;
}

// ─── SISMOS USGS + SISMOS VENEZUELA ───────────────────────────────────────────

async function fetchUSGS() {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res        = await fetch(USGS_API, { signal: controller.signal });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.features || [];
}

async function fetchSismos() {
  const els = {
    loading:     document.getElementById('sismos-loading'),
    error:       document.getElementById('sismos-error'),
    top:         document.getElementById('sismos-top'),
    list:        document.getElementById('sismos-list'),
    cacheNotice: document.getElementById('sismos-cache-notice'),
    refreshIcon: document.getElementById('refresh-icon'),
  };

  els.loading?.classList.remove('hidden');
  els.error?.classList.add('hidden');
  els.top?.classList.add('hidden');
  els.list?.classList.add('hidden');
  els.cacheNotice?.classList.add('hidden');
  if (els.refreshIcon) els.refreshIcon.textContent = '⟳';

  let features  = null;
  let fromCache = false;

  try {
    features = await fetchUSGS();
    if (features?.length) {
      localStorage.setItem(LS_KEY_SISMOS,    JSON.stringify(features));
      localStorage.setItem(LS_KEY_TIMESTAMP, Date.now().toString());
      updateLastUpdateTime(Date.now());
    }
  } catch {
    // fallback a cache
  }

  if (!features?.length) {
    const cached = localStorage.getItem(LS_KEY_SISMOS);
    if (cached) {
      try {
        features  = JSON.parse(cached);
        fromCache = true;
        const ts  = localStorage.getItem(LS_KEY_TIMESTAMP);
        if (ts) updateLastUpdateTime(parseInt(ts, 10));
      } catch {
        features = null;
      }
    }
  }

  els.loading?.classList.add('hidden');
  if (els.refreshIcon) els.refreshIcon.textContent = '↻';

  if (!features?.length) {
    els.error?.classList.remove('hidden');
    return;
  }

  state.sismos          = features;
  state.sismosFromCache = fromCache;
  renderSismos(features, fromCache, els);
}

function renderSismos(features, fromCache, els = {}) {
  const topEl   = els.top         || document.getElementById('sismos-top');
  const listEl  = els.list        || document.getElementById('sismos-list');
  const cacheEl = els.cacheNotice || document.getElementById('sismos-cache-notice');

  const strongest = [...features].sort((a, b) =>
    (b.properties.mag || 0) - (a.properties.mag || 0)
  )[0];

  const recent = features.slice(0, MAX_SISMOS_LIST);

  if (strongest) {
    const p     = strongest.properties;
    const mag   = (p.mag || 0).toFixed(1);
    const depth = strongest.geometry?.coordinates?.[2]?.toFixed(0) ?? '?';

    topEl.innerHTML = `
      <div class="sismo-destacado rounded-2xl border-2 bg-slate-800 p-6 mb-2">
        <div class="flex items-center gap-2 mb-5">
          <span class="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-950/50 px-3 py-1 rounded-full border border-red-900/50">
            Más fuerte esta semana
          </span>
        </div>
        <div class="flex items-start gap-5">
          <div class="shrink-0 text-center">
            <div class="text-5xl font-black ${magColor(parseFloat(mag))}">${mag}</div>
            <div class="text-xs text-slate-400 mt-1">${magLabel(parseFloat(mag))}</div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-white text-base leading-snug truncate-2">${esc(translatePlace(p.place || 'Ubicación desconocida'))}</p>
            <p class="text-sm text-slate-400 mt-2">${formatDateTime(p.time)}</p>
            <p class="text-xs text-slate-500 mt-1">Profundidad: ${depth} km</p>
          </div>
        </div>
      </div>
    `;
    topEl.classList.remove('hidden');
  }

  if (recent.length > 0) {
    listEl.innerHTML = recent.map(f => {
      const p     = f.properties;
      const mag   = (p.mag || 0).toFixed(1);
      const depth = f.geometry?.coordinates?.[2]
        ? `${f.geometry.coordinates[2].toFixed(0)} km`
        : '?';

      return `
        <div class="flex items-center gap-4 bg-slate-800 rounded-2xl px-5 py-4 border border-slate-700 hover:border-slate-600 transition-colors">
          <div class="shrink-0 w-14 text-center">
            <div class="text-xl font-black ${magColor(parseFloat(mag))}">${mag}</div>
            <div class="text-xs text-slate-500 mt-0.5">${magLabel(parseFloat(mag)).slice(0, 3)}</div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-slate-200 font-semibold leading-snug truncate">${esc(translatePlace(p.place || 'Venezuela'))}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <span class="text-xs text-slate-500">${timeAgo(p.time)}</span>
              <span class="text-xs text-slate-700">·</span>
              <span class="text-xs text-slate-500">Prof. ${depth}</span>
            </div>
          </div>
          ${p.url ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener"
            aria-label="Ver sismo en USGS"
            class="shrink-0 text-slate-500 hover:text-amber-400 transition-colors text-xl leading-none px-1">↗</a>` : ''}
        </div>
      `;
    }).join('');

    listEl.classList.remove('hidden');
  }

  if (fromCache) cacheEl?.classList.remove('hidden');
}

// ─── CONTACTOS ───────────────────────────────────────────────────────────────

function renderContactos(contactos) {
  const el = document.getElementById('contactos-list');
  if (!el) return;

  if (!contactos?.length) {
    el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay contactos disponibles.</p>';
    return;
  }

  const visibles = contactos.filter(matchesZone);

  const grupos = {
    emergencia: visibles.filter(c => c.tipo === 'emergencia'),
    salud:      visibles.filter(c => c.tipo === 'salud'),
    bomberos:   visibles.filter(c => c.tipo === 'bomberos'),
    policia:    visibles.filter(c => c.tipo === 'policia'),
  };

  const labels = {
    emergencia: { label: 'Protección Civil', icon: '🛡️', color: 'border-red-800 bg-red-950/30' },
    salud:      { label: 'Salud y Cruz Roja', icon: '🏥', color: 'border-rose-800 bg-rose-950/30' },
    bomberos:   { label: 'Bomberos',          icon: '🚒', color: 'border-orange-800 bg-orange-950/30' },
    policia:    { label: 'Policía / CICPC',   icon: '👮', color: 'border-blue-800 bg-blue-950/30' },
  };

  let html = '';
  for (const [tipo, items] of Object.entries(grupos)) {
    if (!items.length) continue;
    const meta = labels[tipo];
    html += `
      <div class="mb-8">
        <p class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>${meta.icon}</span> ${meta.label}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          ${items.map(c => contactoCard(c, meta.color)).join('')}
        </div>
      </div>
    `;
  }

  el.innerHTML = html || emptyZoneState('No hay contactos registrados para esta zona.');
}

function contactoCard(c, colorClass) {
  return `
    <div class="rounded-2xl border ${colorClass} p-5">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-base font-bold text-slate-200 leading-tight">${esc(c.nombre)}</p>
        ${c.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓ Verificado</span>' : ''}
      </div>
      ${c.estado ? `<p class="text-xs text-slate-400 mt-1">${esc(c.estado === 'nacional' ? 'Nacional' : c.estado)}</p>` : ''}
      ${c.descripcion ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">${esc(c.descripcion)}</p>` : ''}
      ${callActions(c.telefono, c.nombre)}
    </div>
  `;
}

function emptyZoneState(msg) {
  const zonaTxt = state.zona === 'all' ? '' : ` (${esc(state.zona)})`;
  return `
    <div class="col-span-full rounded-2xl bg-slate-800/60 border border-slate-700 border-dashed p-6 text-center">
      <p class="text-2xl mb-2">🔍</p>
      <p class="text-sm text-slate-400 leading-relaxed">${msg}${zonaTxt}</p>
      <p class="text-xs text-slate-500 mt-2">Cambia de zona en el selector superior para ver más.</p>
    </div>
  `;
}

// ─── HOSPITALES ──────────────────────────────────────────────────────────────

function renderHospitales(hospitales) {
  const el = document.getElementById('hospitales-list');
  if (!el) return;

  if (!hospitales?.length) {
    el.innerHTML = `
      <div class="rounded-2xl bg-slate-800 border border-slate-700 p-8 text-center">
        <p class="text-4xl mb-4">🏗️</p>
        <p class="text-base font-semibold text-slate-300">Datos en verificación</p>
        <p class="text-sm text-slate-500 mt-3 leading-relaxed">
          Estamos verificando los datos de hospitales activos. Para emergencias médicas llama al <strong class="text-white">911</strong> o a la <a href="tel:+582125714380" class="text-rose-400 underline">Cruz Roja (+58 212-5714380)</a>.
        </p>
      </div>
    `;
    return;
  }

  const verificados = hospitales.filter(h => h.verificado && matchesZone(h));

  if (!verificados.length) {
    el.innerHTML = emptyZoneState('No hay hospitales registrados para esta zona.');
    return;
  }

  el.innerHTML = verificados.map(h => `
    <div class="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-5">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-base font-bold text-slate-200 leading-tight">${esc(h.nombre)}</p>
        ${h.verificado  ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓</span>' : ''}
        ${h.emergencias ? '<span class="text-xs bg-red-900/50 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full font-semibold">EMERGENCIAS</span>' : ''}
      </div>
      ${h.ciudad    ? `<p class="text-xs text-slate-400 mt-1.5">${esc(h.ciudad)}${h.estado ? ` · ${esc(h.estado)}` : ''}</p>` : ''}
      ${h.direccion ? `<p class="text-xs text-slate-500 mt-1">${esc(h.direccion)}</p>` : ''}
      ${h.telefono  ? callActions(h.telefono, h.nombre) : ''}
      ${h.mapsUrl   ? `<a href="${esc(safeUrl(h.mapsUrl))}" target="_blank" rel="noopener"
         class="mt-2 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors">
        📍 Ver en mapa
      </a>` : ''}
    </div>
  `).join('');
}

// ─── REFUGIOS ────────────────────────────────────────────────────────────────

function renderRefugios(refugios) {
  const el = document.getElementById('refugios-list');
  if (!el) return;

  const visibles = (refugios || []).filter(r => r.verificado && matchesZone(r));

  if (!visibles.length) {
    el.innerHTML = emptyZoneState('No hay refugios registrados para esta zona.');
    return;
  }

  el.innerHTML = visibles.map(r => {
    return `
      <div class="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-5 h-full">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-base font-bold text-white leading-tight">${esc(r.nombre)}</p>
          ${r.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓ Verificado</span>' : ''}
        </div>
        ${r.estado && r.estado !== 'nacional' ? `<p class="text-xs text-slate-400 mt-1.5">${esc(r.estado)}</p>` : ''}
        ${r.ubicacion    ? `<p class="text-xs text-slate-500 mt-1">${esc(r.ubicacion)}</p>` : ''}
        ${r.descripcion ? `<p class="text-sm text-slate-300 mt-2 leading-relaxed">${esc(r.descripcion)}</p>` : ''}
        ${r.mapsUrl    ? `<a href="${esc(safeUrl(r.mapsUrl))}" target="_blank" rel="noopener"
          class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-sky-800 hover:bg-sky-700 text-white font-semibold text-sm transition-colors">
          📍 Cómo llegar
        </a>` : ''}
      </div>
    `;
  }).join('');
}

// ─── CENTROS DE ACOPIO ────────────────────────────────────────────────────────

function renderAcopio(centros) {
  const el = document.getElementById('acopio-list');
  if (!el) return;

  const visibles = (centros || []).filter(c => c.verificado && matchesZone(c));

  if (!visibles.length) {
    el.innerHTML = emptyZoneState('No hay centros de acopio registrados para esta zona.');
    return;
  }

  el.innerHTML = visibles.map(c => `
    <div class="rounded-2xl border border-teal-900/50 bg-teal-950/20 p-5">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-base font-bold text-white leading-tight">${esc(c.nombre)}</p>
        ${c.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓ Verificado</span>' : ''}
      </div>
      ${c.estado    ? `<p class="text-xs text-slate-400 mt-1.5">${esc(c.estado)}</p>` : ''}
      ${c.direccion ? `<p class="text-xs text-slate-500 mt-1 leading-relaxed">${esc(c.direccion)}</p>` : ''}
      ${c.mapsUrl   ? `<a href="${esc(safeUrl(c.mapsUrl))}" target="_blank" rel="noopener"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-sm transition-colors">
        📍 Cómo llegar
      </a>` : ''}
    </div>
  `).join('');
}

// ─── DONACIONES ───────────────────────────────────────────────────────────────

function renderDonaciones(donaciones) {
  const el = document.getElementById('donar-list');
  if (!el) return;

  if (!donaciones?.length) {
    el.innerHTML = '<p class="col-span-full text-sm text-slate-500 text-center py-8">No hay campañas de donación disponibles.</p>';
    return;
  }

  el.innerHTML = donaciones.map(d => `
    <div class="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-base font-bold text-slate-200 leading-tight">${esc(d.nombre)}</p>
        ${d.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓ Verificado</span>' : ''}
      </div>
      ${d.organizacion ? `<p class="text-xs text-slate-400 mt-1.5">${esc(d.organizacion)}${d.plataforma ? ` · ${esc(d.plataforma)}` : ''}</p>` : ''}
      ${d.descripcion  ? `<p class="text-sm text-slate-300 mt-2 leading-relaxed">${esc(d.descripcion)}</p>` : ''}
      <a href="${esc(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-emerald-50 font-bold text-sm transition-colors">
        💚 Donar ahora ↗
      </a>
    </div>
  `).join('');
}

function renderNecesidadesDonacion(necesidades) {
  const fechaEl = document.getElementById('necesidades-fecha');
  if (fechaEl && necesidades?.fecha) {
    fechaEl.textContent = `Lista actualizada según centros de acopio y hospitales · ${esc(necesidades.fecha)}`;
  }

  const prioridadEl = document.getElementById('necesidades-prioridad');
  if (prioridadEl && necesidades?.prioridadAlta?.length) {
    prioridadEl.innerHTML = `
      <div class="rounded-2xl border border-red-800/60 bg-red-950/20 p-6 mb-5">
        <div class="flex items-center gap-2 mb-6">
          <span class="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-950/50 px-3 py-1 rounded-full border border-red-900/50">Prioridad Alta</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          ${necesidades.prioridadAlta.map(item => {
            const w = item.fullWidth ? ' md:col-span-2' : '';
            const t = item.fullWidth ? ' -mt-2' : '';
            return `
              <div class="${w}${t}">
                <p class="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">${esc(item.icono)} ${esc(item.nombre)}</p>
                <p class="text-xs text-slate-400${item.fullWidth ? '' : ''}">${esc(item.descripcion)}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const secundarioEl = document.getElementById('necesidades-secundario');
  if (secundarioEl && necesidades?.secundario?.length) {
    secundarioEl.innerHTML = `
      <div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 mb-5">
        <p class="text-base font-bold text-slate-200 mb-4">También se necesita</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          ${necesidades.secundario.map(item => `
            <div>
              <p class="text-sm text-slate-300 flex items-center gap-2"><span>${esc(item.icono)}</span> ${esc(item.nombre)}</p>
              <p class="text-xs text-slate-500 mt-0.5 ml-7">${esc(item.descripcion)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

function renderIniciativasApoyo(iniciativas) {
  const el = document.getElementById('iniciativas-list');
  if (!el) return;

  if (!iniciativas?.length) {
    el.innerHTML = '<p class="col-span-full text-sm text-slate-500 text-center py-8">No hay iniciativas registradas.</p>';
    return;
  }

  el.innerHTML = iniciativas.map(i => `
    <div class="rounded-2xl border border-sky-800/50 bg-sky-950/10 p-5">
      <div class="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p class="text-xs font-bold text-sky-400 uppercase tracking-wider">${esc(i.organizacion)}</p>
        ${i.estado ? `<span class="text-xs bg-green-900/40 text-green-400 border border-green-800/40 px-2 py-0.5 rounded-full font-semibold">${esc(i.estado)}</span>` : ''}
      </div>
      <p class="text-base font-bold text-slate-200 leading-tight">${esc(i.nombre)}</p>
      ${i.tipo_ayuda ? `<span class="inline-block text-xs bg-sky-900/40 text-sky-400 px-2 py-0.5 rounded-full mt-2 font-semibold">${esc(i.tipo_ayuda)}</span>` : ''}
      ${i.descripcion ? `<p class="text-sm text-slate-400 mt-3 leading-relaxed">${esc(i.descripcion)}</p>` : ''}
      ${i.plataforma ? `<p class="text-xs text-slate-500 mt-3">Disponible en: <span class="text-slate-300 font-semibold">${esc(i.plataforma)}</span></p>` : ''}
      <a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-600 active:bg-sky-800 text-white font-bold text-sm transition-colors">
        Ver iniciativa ↗
      </a>
    </div>
  `).join('');
}

// ─── DESAPARECIDOS ────────────────────────────────────────────────────────────

async function renderDesaparecidos(enlaces) {
  const el = document.getElementById('desaparecidos-list');
  if (!el || !enlaces?.length) {
    if (el) el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay plataformas configuradas.</p>';
    return;
  }

  el.innerHTML = enlaces.map(e => `
    <div id="link-${esc(e.id)}" class="rounded-2xl border border-violet-900/50 bg-violet-950/20 p-5">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="min-w-0">
          <p class="text-base font-bold text-white leading-tight">${esc(e.nombre)}</p>
          ${e.descripcion ? `<p class="text-sm text-slate-400 mt-2 leading-relaxed">${esc(e.descripcion)}</p>` : ''}
        </div>
        <span id="status-${esc(e.id)}" class="text-xs text-slate-500 shrink-0 mt-1">...</span>
      </div>
      <a id="btn-${esc(e.id)}" href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer"
         class="flex items-center justify-center gap-2 w-full py-4 px-5 rounded-xl bg-violet-700 hover:bg-violet-600 active:bg-violet-800 text-white font-bold text-sm transition-colors">
        Abrir plataforma ↗
      </a>
    </div>
  `).join('');

  if (state.online) {
    enlaces.forEach(e => checkUrlAvailability(e));
  } else {
    enlaces.forEach(e => {
      const statusEl = document.getElementById(`status-${e.id}`);
      if (statusEl) {
        statusEl.textContent = 'Sin conexión';
        statusEl.className   = 'text-xs text-amber-500 shrink-0';
      }
    });
  }
}

async function checkUrlAvailability(enlace) {
  const statusEl = document.getElementById(`status-${enlace.id}`);
  const btnEl    = document.getElementById(`btn-${enlace.id}`);

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
    await fetch(enlace.url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timeoutId);

    if (statusEl) {
      statusEl.textContent = 'Disponible';
      statusEl.className   = 'text-xs text-green-400 shrink-0';
    }
  } catch {
    if (statusEl) {
      statusEl.textContent = 'No disponible';
      statusEl.className   = 'text-xs text-red-400 shrink-0';
    }
    if (btnEl) {
      btnEl.classList.remove('bg-violet-700', 'hover:bg-violet-600', 'active:bg-violet-800');
      btnEl.classList.add('bg-slate-700', 'cursor-not-allowed', 'opacity-60');
      btnEl.textContent = 'No disponible actualmente';
      btnEl.removeAttribute('href');
    }
  }
}

// ─── GUÍAS ───────────────────────────────────────────────────────────────────

function renderGuias(guias) {
  const el = document.getElementById('guias-list');
  if (!el || !guias?.length) return;

  el.innerHTML = guias.map((g, i) => {
    const urgenciaClass = g.urgencia === 'alta'
      ? 'border-emerald-800 bg-emerald-950/20'
      : 'border-slate-700 bg-slate-800/50';

    return `
      <div class="rounded-2xl border ${urgenciaClass} overflow-hidden h-full">
        <button
          data-guia-idx="${i}"
          class="w-full flex items-center justify-between gap-4 px-5 py-5 text-left"
          aria-expanded="false"
          aria-controls="guia-body-${i}">
          <div class="flex items-center gap-4">
            <span class="text-3xl" aria-hidden="true">${esc(g.icono || '📋')}</span>
            <div>
              <span class="font-bold text-white text-base block">${esc(g.titulo)}</span>
              ${g.urgencia === 'alta' ? '<span class="text-xs text-red-400 font-semibold">Urgente</span>' : ''}
            </div>
          </div>
          <span id="guia-arrow-${i}" class="text-slate-400 text-xl transition-transform duration-200 shrink-0">›</span>
        </button>
        <div id="guia-body-${i}" class="hidden px-5 pb-6">
          <ol class="space-y-4">
            ${(g.pasos || []).map((paso, idx) => `
              <li class="flex items-start gap-4">
                <span class="shrink-0 w-7 h-7 rounded-full bg-emerald-900/60 text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">${idx + 1}</span>
                <span class="text-sm text-slate-300 leading-relaxed">${esc(paso)}</span>
              </li>
            `).join('')}
          </ol>
        </div>
      </div>
    `;
  }).join('');
}

function toggleGuia(idx) {
  const body  = document.getElementById(`guia-body-${idx}`);
  const arrow = document.getElementById(`guia-arrow-${idx}`);
  const btn   = body?.previousElementSibling;

  if (!body) return;
  const isOpen = !body.classList.contains('hidden');

  body.classList.toggle('hidden', isOpen);
  if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
  if (btn)   btn.setAttribute('aria-expanded', String(!isOpen));
}

// ─── APOYO PSICOLÓGICO ────────────────────────────────────────────────────────

function renderApoyoPsicologico(items) {
  const el = document.getElementById('apoyo-psicologico-list');
  if (!el) return;

  if (!items?.length) {
    el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay servicios de apoyo psicológico disponibles.</p>';
    return;
  }

  const grupos = {};
  items.forEach(item => {
    if (!grupos[item.category]) grupos[item.category] = [];
    grupos[item.category].push(item);
  });

  const catStyles = {
    'Atención Telefónica y Virtual':        { card: 'border-cyan-800/50 bg-cyan-950/10',  badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50' },
    'Atención Institucional y Presencial':  { card: 'border-violet-800/50 bg-violet-950/10', badge: 'bg-violet-900/40 text-violet-300 border-violet-800/50' },
  };

  const defaultStyle = { card: 'border-slate-700 bg-slate-800/50', badge: 'bg-slate-800 text-slate-300 border-slate-600' };

  let html = '';
  for (const [cat, catItems] of Object.entries(grupos)) {
    const s = catStyles[cat] || defaultStyle;
    html += `
      <div class="mb-8">
        <p class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">${esc(cat)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${catItems.map(item => `
            <div class="rounded-2xl border ${s.card} p-5 h-full flex flex-col">
              <span class="text-xs font-semibold ${s.badge} border px-2.5 py-1 rounded-full w-fit">${esc(item.badge_text)}</span>
              <p class="text-base font-bold text-slate-200 leading-tight mt-3">${esc(item.title)}</p>
              <p class="text-xs text-slate-400 mt-1">${esc(item.provider)}</p>
              <p class="text-sm text-slate-400 mt-3 leading-relaxed flex-1">${esc(item.description)}</p>
              ${renderApoyoActions(item)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  el.innerHTML = html;
}

function renderApoyoActions(item) {
  if (!item.has_phone && !item.has_link) return '';

  const base = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-colors';
  let actions = '';

  if (item.has_phone && item.phone_numbers?.length) {
    item.phone_numbers.forEach(num => {
      const clean = num.replace(/[\s()]/g, '');
      actions += `
        <a href="tel:${esc(clean)}" class="${base} bg-green-700 hover:bg-green-600 active:bg-green-800 text-green-50">
          <svg class="w-5 h-5 shrink-0" aria-hidden="true"><use href="#icon-phone"></use></svg>
          ${esc(num)}
        </a>
      `;
    });
  }

  if (item.has_link && item.action_url) {
    actions += `
      <a href="${esc(safeUrl(item.action_url))}" target="_blank" rel="noopener noreferrer" class="${base} bg-sky-700 hover:bg-sky-600 active:bg-sky-800 text-white">
        Abrir ↗
      </a>
    `;
  }

  return `<div class="mt-4 flex flex-col gap-2">${actions}</div>`;
}

// ─── CARGA DE DATOS ───────────────────────────────────────────────────────────

/**
 * Devuelve los datos de emergencia.
 * Usa window.VZ_DATA (cargado via data.js como <script>).
 * Fallback: fetch de data.json (requiere servidor HTTP).
 */
async function loadData() {
  if (window.VZ_DATA) {
    state.data = window.VZ_DATA;
    return window.VZ_DATA;
  }

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res        = await fetch(DATA_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.data = data;
    return data;
  } catch (err) {
    console.warn('[App] No se pudo cargar data.json:', err.message);
    return null;
  }
}

// ─── SELECTOR DE ZONA ─────────────────────────────────────────────────────────

function populateZonaSelector(zonas) {
  const select = document.getElementById('zona-select');
  if (!select || !Array.isArray(zonas)) return;

  select.innerHTML = ['<option value="all">Todas las zonas</option>']
    .concat(zonas.map(z => `<option value="${esc(z)}">${esc(z)}</option>`))
    .join('');

  if (state.zona !== 'all' && !zonas.includes(state.zona)) {
    state.zona = 'all';
    localStorage.removeItem(LS_KEY_ZONA);
  }
  select.value = state.zona;

  select.addEventListener('change', () => {
    state.zona = select.value;
    if (state.zona === 'all') {
      localStorage.removeItem(LS_KEY_ZONA);
    } else {
      localStorage.setItem(LS_KEY_ZONA, state.zona);
    }
    applyZoneFilter();
  });

  updateZonaHint();
}

function updateZonaHint() {
  const hint = document.getElementById('zona-hint');
  if (!hint) return;
  if (state.zona === 'all') {
    hint.classList.add('hidden');
  } else {
    hint.textContent = `Mostrando recursos de ${state.zona} y nacionales`;
    hint.classList.remove('hidden');
  }
}

function applyZoneFilter() {
  if (!state.data) return;
  renderContactos(state.data.contactos    || []);
  renderHospitales(state.data.hospitales  || []);
  renderRefugios(state.data.refugios      || []);
  renderAcopio(state.data.centrosAcopio   || []);
  updateZonaHint();
}

// ─── DELEGACIÓN: COPIAR TELÉFONOS ─────────────────────────────────────────────

function setupCopyDelegation() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    copyText(btn.getAttribute('data-copy'), btn);
  });
}

// ─── REGISTRO DEL SERVICE WORKER ─────────────────────────────────────────────

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('update-toast')?.classList.remove('hidden');
          }
        });
      });
    })
    .catch((err) => console.warn('[App] SW error:', err));

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'USGS_FROM_CACHE') {
      document.getElementById('sismos-cache-notice')?.classList.remove('hidden');
    }
  });
}

// ─── MENÚ DRAWER ─────────────────────────────────────────────────────────────

const DRAWER_SELECTOR = '#menu-drawer';
const BACKDROP_SELECTOR = '#menu-backdrop';  
const PANEL_SELECTOR = '#menu-panel';

function initMenuDrawer() {
  const menuBtn   = document.getElementById('menu-btn');
  const closeBtn  = document.getElementById('menu-close');
  const drawer    = document.querySelector(DRAWER_SELECTOR);
  const backdrop  = document.querySelector(BACKDROP_SELECTOR);
  const panel     = document.querySelector(PANEL_SELECTOR);
  if (!menuBtn || !drawer || !backdrop || !panel) return;

  function open() {
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.remove('pointer-events-none');
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.add('pointer-events-none');
    backdrop.classList.add('opacity-0');
    backdrop.classList.remove('opacity-100');
    panel.classList.add('translate-x-full');
    panel.classList.remove('translate-x-0');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('pointer-events-none')) close();
  });

  // Cerrar menú al hacer clic en un link de navegación + smooth scroll
  drawer.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      close();
      if (href) {
        setTimeout(() => {
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    });
  });

  // Exponer para debug
  window.VZMenu = { open, close };
}

// ─── PERSONAS LOCALIZADAS ─────────────────────────────────────────────────────

function initLocalizadosSearch() {
  const input     = document.getElementById('search-localizados');
  const container = document.getElementById('localizados-results');
  if (!input || !container) return;

  let debounceTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      renderLocalizadosPlaceholder(container);
      return;
    }
    debounceTimer = setTimeout(() => fetchLocalizados(q, container), SEARCH_DEBOUNCE_MS);
  });
}

async function fetchLocalizados(query, container) {
  renderLocalizadosLoading(container);

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const url        = `${LOCALIZADOS_API}${encodeURIComponent(query)}&limit=${MAX_LOCALIZADOS}`;
    const res        = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json    = await res.json();
    const results = json.data || [];

    if (results.length === 0) {
      renderLocalizadosEmpty(container, query);
    } else {
      renderLocalizadosResults(container, results, query);
    }
  } catch (err) {
    renderLocalizadosError(
      container,
      err.name === 'AbortError' ? 'La solicitud tardó demasiado. Verifica tu conexión.' : null
    );
  }
}

function renderLocalizadosLoading(container) {
  container.innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-16 gap-4">
      <div class="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
      <p class="text-sm text-slate-400">Buscando personas...</p>
    </div>
  `;
}

function renderLocalizadosPlaceholder(container) {
  container.innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <span class="text-4xl mb-4">🔍</span>
      <p class="text-sm text-slate-400 leading-relaxed">Escribe un nombre, apellido o cédula para buscar personas localizadas.</p>
    </div>
  `;
}

function renderLocalizadosEmpty(container, query) {
  container.innerHTML = `
    <div class="col-span-full rounded-2xl bg-slate-800/60 border border-slate-700 border-dashed p-8 text-center">
      <span class="text-4xl mb-3 block">🔍</span>
      <p class="text-sm font-semibold text-slate-300">Sin resultados</p>
      <p class="text-sm text-slate-500 mt-2 leading-relaxed">No encontramos personas con "<strong class="text-slate-300">${esc(query)}</strong>".</p>
      <p class="text-xs text-slate-600 mt-2">Prueba con otro nombre, apellido o verifica la ortografía.</p>
    </div>
  `;
}

function renderLocalizadosError(container, customMsg) {
  const msg = customMsg || 'No se pudo conectar con el servidor. Intenta de nuevo más tarde.';
  container.innerHTML = `
    <div class="col-span-full rounded-2xl bg-slate-800 border border-slate-700 p-8 text-center">
      <span class="text-4xl mb-4 block">📡</span>
      <p class="text-base font-semibold text-slate-300">Error de conexión</p>
      <p class="text-sm text-slate-400 mt-2 leading-relaxed">${esc(msg)}</p>
      ${!navigator.onLine ? '<p class="text-xs text-amber-400 mt-2">No hay conexión a internet.</p>' : ''}
      <p class="text-xs text-slate-500 mt-3">Puedes buscar directamente en <a href="https://localizadosvenezuela.com" target="_blank" rel="noopener" class="text-emerald-400 underline">LocalizadosVenezuela.com</a></p>
    </div>
  `;
}

function renderLocalizadosResults(container, results, query) {
  container.innerHTML = results.map(p => {
    const slug      = p.slug || '';
    const url       = `${LOCALIZADOS_BASE}/${encodeURIComponent(slug)}`;
    const nombre    = p.nombreCompleto || 'Sin nombre';
    const lugar     = p.lugarNombre || '';
    const direccion = p.direccion || '';

    return `
      <div class="flex flex-col rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5 h-full">
        <p class="text-base font-bold text-slate-200 leading-tight">${esc(nombre)}</p>
        ${lugar     ? `<p class="text-sm text-emerald-300 font-semibold mt-3 flex items-center gap-2"><span>📍</span> ${esc(lugar)}</p>` : ''}
        ${direccion ? `<p class="text-xs text-slate-400 mt-1 mb-1">${esc(direccion)}</p>` : ''}
        <a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer"
           class="mt-auto flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-emerald-50 font-bold text-sm transition-colors">
          Ver más información
        </a>
      </div>
    `;
  }).join('');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  registerServiceWorker();

  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  setupCopyDelegation();

  // Menú de navegación lateral
  initMenuDrawer();

  // Guías: delegación para abrir/cerrar acordeones (evita onclick inline)
  document.getElementById('guias-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-guia-idx]');
    if (btn) toggleGuia(Number(btn.dataset.guiaIdx));
  });

  // Toast de actualización SW
  document.getElementById('update-toast')
    ?.querySelector('button')
    ?.addEventListener('click', () => location.reload());

  // Botón de refrescar sismos
  document.getElementById('btn-refresh-sismos')
    ?.addEventListener('click', fetchSismos);

  const data = await loadData();

  if (data) {
    const versionEl = document.getElementById('app-version');
    if (versionEl && data.version) versionEl.textContent = `v${data.version}`;
    const versionDrawer = document.getElementById('version-drawer');
    if (versionDrawer && data.version) versionDrawer.textContent = `v${data.version}`;

    populateZonaSelector(data.zonasAfectadas          || []);
    renderContactos(data.contactos                    || []);
    renderHospitales(data.hospitales                  || []);
    renderRefugios(data.refugios                      || []);
    renderAcopio(data.centrosAcopio                   || []);
    renderDonaciones(data.donaciones                  || []);
    renderNecesidadesDonacion(data.necesidadesDonacion);
    renderIniciativasApoyo(data.iniciativas_apoyo      || []);
    renderDesaparecidos(data.enlacesDesaparecidos     || []);
    renderGuias(data.guias                            || []);
    renderApoyoPsicologico(data.apoyoPsicologico       || []);
  } else {
    ['contactos-list', 'hospitales-list', 'refugios-list', 'acopio-list',
     'donar-list', 'iniciativas-list', 'localizados-results', 'desaparecidos-list', 'guias-list', 'apoyo-psicologico-list']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p class="text-sm text-red-400 text-center py-4">Error cargando datos. Intenta recargar la app.</p>';
      });
  }

  initLocalizadosSearch();
  await fetchSismos();
}

// Exponer para debug
window.VZApp         = { fetchSismos, fetchUSGS, copyText, applyZoneFilter };
window.VZLocalizados = { fetchLocalizados };

document.addEventListener('DOMContentLoaded', init);
