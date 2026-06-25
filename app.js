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

const LS_KEY_SISMOS    = 'vzla_sismos_cache';
const LS_KEY_TIMESTAMP = 'vzla_sismos_ts';
const LS_KEY_ZONA      = 'vzla_zona';
const DATA_URL         = './data.json';

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

/** Magnitud a clase de color */
function magColor(mag) {
  if (mag >= 7.0) return 'text-red-400 font-black';
  if (mag >= 6.0) return 'text-orange-400 font-black';
  if (mag >= 5.0) return 'text-amber-400 font-bold';
  if (mag >= 4.0) return 'text-yellow-400 font-semibold';
  return 'text-slate-300';
}

/** Magnitud a color de fondo de badge */
function magBadgeBg(mag) {
  if (mag >= 7.0) return 'bg-red-950 border-red-700 text-red-300';
  if (mag >= 6.0) return 'bg-orange-950 border-orange-700 text-orange-300';
  if (mag >= 5.0) return 'bg-amber-950 border-amber-700 text-amber-300';
  return 'bg-slate-800 border-slate-600 text-slate-300';
}

/** Magnitud a descripción verbal */
function magLabel(mag) {
  if (mag >= 8.0) return 'Catastrófico';
  if (mag >= 7.0) return 'Mayor';
  if (mag >= 6.0) return 'Fuerte';
  if (mag >= 5.0) return 'Moderado';
  if (mag >= 4.0) return 'Ligero';
  return 'Micro';
}

/** Timestamp Unix (ms) a hora local legible */
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

/** Formato de fecha completo legible */
function formatDateTime(ts) {
  return new Date(ts).toLocaleString('es-VE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Caracas'
  });
}

/** Sanitizar HTML básico */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── COPIAR AL PORTAPAPELES ───────────────────────────────────────────────────

let copyToastTimer = null;

/** Muestra un toast breve de confirmación */
function showCopyToast(msg) {
  const toast = document.getElementById('copy-toast');
  const text  = document.getElementById('copy-toast-text');
  if (!toast) return;
  if (text) text.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(copyToastTimer);
  copyToastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
}

/** Copia texto usando Clipboard API con fallback a execCommand */
function copyText(text, btn) {
  const onDone = () => {
    showCopyToast(`Copiado: ${text}`);
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="text-emerald-400">✓ Copiado</span>';
      setTimeout(() => { btn.innerHTML = original; }, 1300);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone));
  } else {
    fallbackCopy(text, onDone);
  }
}

/** Fallback para navegadores sin Clipboard API o contextos no seguros */
function fallbackCopy(text, onDone) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
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

/** Icono de teléfono (hereda color con currentColor) */
const ICON_PHONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 shrink-0" aria-hidden="true"><path fill-rule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clip-rule="evenodd"/></svg>`;

/** Icono universal de copiar (dos cuadrados superpuestos) */
const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="w-5 h-5 shrink-0" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-7.5A2.25 2.25 0 0 1 10.5 8.25h6Z"/></svg>`;

/**
 * Fila de acciones para un teléfono: número visible + botón Llamar + botón Copiar.
 * El botón Copiar usa data-copy (delegación de eventos) para evitar problemas de escape.
 */
function callActions(telefono, nombre) {
  const tel  = String(telefono).replace(/[\s()]/g, '');
  const safe = esc(telefono);
  const safeNombre = esc(nombre || 'contacto');
  return `
    <p class="text-sm text-slate-300 font-mono mt-2">${safe}</p>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button type="button" data-copy="${safe}" aria-label="Copiar teléfono de ${safeNombre}"
        class="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 font-semibold text-sm transition-colors">
        ${ICON_COPY} Copiar
      </button>
      <a href="tel:${tel}" aria-label="Llamar a ${safeNombre}"
        class="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-600 active:bg-green-800 text-green-50 font-semibold text-sm transition-colors">
        ${ICON_PHONE} Llamar
      </a>
    </div>
  `;
}

/** Limpiar nombre de lugar (elimina prefijos USGS) */
function cleanPlace(place) {
  return place
    .replace(/^\d+(\.\d+)?\s*km\s*(NW|NE|SW|SE|N|S|E|W)\s*of\s*/i, '')
    .replace(/^[A-Z]+\s+of\s+/i, '')
    .trim();
}

/** Traducir términos geográficos comunes */
function translatePlace(place) {
  return cleanPlace(place)
    .replace(/Venezuela/gi, 'Venezuela')
    .replace(/Trinidad/gi, 'Trinidad')
    .replace(/Colombia/gi, 'Colombia')
    .replace(/Guyana/gi, 'Guyana')
    .replace(/Caribbean Sea/gi, 'Mar Caribe')
    .replace(/Atlantic Ocean/gi, 'Océano Atlántico');
}

// ─── ESTADO ONLINE/OFFLINE ──────────────────────────────────────────────────

function updateOnlineStatus() {
  state.online = navigator.onLine;
  const badge   = document.getElementById('status-badge');
  const dot     = document.getElementById('status-dot');
  const text    = document.getElementById('status-text');
  const toast   = document.getElementById('offline-toast');

  if (state.online) {
    badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-900 text-emerald-400 border border-emerald-700';
    dot.className   = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    text.textContent = 'EN LÍNEA';
    toast.classList.add('hidden');
  } else {
    badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-900 text-amber-400 border border-amber-700';
    dot.className   = 'w-2 h-2 rounded-full bg-amber-400';
    text.textContent = 'OFFLINE';
    toast.classList.remove('hidden');
  }
}

function updateLastUpdateTime(ts) {
  const el = document.getElementById('last-update');
  if (!el) return;
  const time = new Date(ts).toLocaleTimeString('es-VE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas'
  });
  el.textContent = `Act. ${time}`;
}

// ─── SECCIÓN 3: SISMOS USGS ──────────────────────────────────────────────────

async function fetchSismos() {
  const loading  = document.getElementById('sismos-loading');
  const errEl    = document.getElementById('sismos-error');
  const topEl    = document.getElementById('sismos-top');
  const listEl   = document.getElementById('sismos-list');
  const cacheEl  = document.getElementById('sismos-cache-notice');
  const refreshIcon = document.getElementById('refresh-icon');

  // Mostrar loading
  loading.classList.remove('hidden');
  errEl.classList.add('hidden');
  topEl.classList.add('hidden');
  listEl.classList.add('hidden');
  cacheEl.classList.add('hidden');
  if (refreshIcon) refreshIcon.textContent = '⟳';

  let features = null;
  let fromCache = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(USGS_API, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    features = json.features || [];

    // Guardar en localStorage como respaldo
    localStorage.setItem(LS_KEY_SISMOS, JSON.stringify(features));
    localStorage.setItem(LS_KEY_TIMESTAMP, Date.now().toString());

    updateLastUpdateTime(Date.now());

  } catch (err) {
    // Intentar recuperar del localStorage
    const cached = localStorage.getItem(LS_KEY_SISMOS);
    if (cached) {
      try {
        features = JSON.parse(cached);
        fromCache = true;
        const ts = localStorage.getItem(LS_KEY_TIMESTAMP);
        if (ts) updateLastUpdateTime(parseInt(ts));
      } catch {
        features = null;
      }
    }
  }

  loading.classList.add('hidden');
  if (refreshIcon) refreshIcon.textContent = '↻';

  if (!features || features.length === 0) {
    errEl.classList.remove('hidden');
    return;
  }

  state.sismos = features;
  state.sismosFromCache = fromCache;

  renderSismos(features, fromCache);
}

function renderSismos(features, fromCache) {
  const topEl  = document.getElementById('sismos-top');
  const listEl = document.getElementById('sismos-list');
  const cacheEl = document.getElementById('sismos-cache-notice');

  // Sismo más fuerte
  const strongest = [...features].sort((a, b) =>
    (b.properties.mag || 0) - (a.properties.mag || 0)
  )[0];

  // Últimos 10 sismos ordenados por tiempo
  const recent = features.slice(0, 10);

  // Renderizar sismo destacado
  if (strongest) {
    const p   = strongest.properties;
    const mag = (p.mag || 0).toFixed(1);
    const ts  = p.time;

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
            <p class="text-sm text-slate-400 mt-2">${formatDateTime(ts)}</p>
            <p class="text-xs text-slate-500 mt-1">Profundidad: ${p.dmin ? (p.dmin * 111).toFixed(0) : '?'} km</p>
          </div>
        </div>
        ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"
          class="mt-5 flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 underline">
          Ver en USGS ↗
        </a>` : ''}
      </div>
    `;
    topEl.classList.remove('hidden');
  }

  // Renderizar lista
  if (recent.length > 0) {
    listEl.innerHTML = recent.map((f, i) => {
      const p   = f.properties;
      const mag = (p.mag || 0).toFixed(1);
      const ts  = p.time;

      // Calcular profundidad desde coordenadas
      const depth = f.geometry?.coordinates?.[2]
        ? `${f.geometry.coordinates[2].toFixed(0)} km`
        : '?';

      return `
        <div class="flex items-center gap-4 bg-slate-800 rounded-2xl px-5 py-4 border border-slate-700 hover:border-slate-600 transition-colors">
          <div class="shrink-0 w-14 text-center">
            <div class="text-xl font-black ${magColor(parseFloat(mag))}">${mag}</div>
            <div class="text-xs text-slate-500 mt-0.5">${magLabel(parseFloat(mag)).slice(0,3)}</div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-slate-200 font-semibold leading-snug truncate">${esc(translatePlace(p.place || 'Venezuela'))}</p>
            <div class="flex items-center gap-3 mt-1.5">
              <span class="text-xs text-slate-500">${timeAgo(ts)}</span>
              <span class="text-xs text-slate-700">·</span>
              <span class="text-xs text-slate-500">Prof. ${depth}</span>
            </div>
          </div>
          ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"
            aria-label="Ver sismo en USGS"
            class="shrink-0 text-slate-500 hover:text-amber-400 transition-colors text-xl leading-none px-1">↗</a>` : ''}
        </div>
      `;
    }).join('');

    listEl.classList.remove('hidden');
  }

  if (fromCache) {
    cacheEl.classList.remove('hidden');
  }
}

// ─── SECCIÓN 4: CONTACTOS ────────────────────────────────────────────────────

function renderContactos(contactos) {
  const el = document.getElementById('contactos-list');
  if (!el) return;

  if (!contactos?.length) {
    el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay contactos disponibles.</p>';
    return;
  }

  // Filtrar por zona seleccionada
  const visibles = contactos.filter(matchesZone);

  // Agrupar por tipo
  const grupos = {
    emergencia: visibles.filter(c => c.tipo === 'emergencia'),
    salud:      visibles.filter(c => c.tipo === 'salud'),
    bomberos:   visibles.filter(c => c.tipo === 'bomberos'),
    policia:    visibles.filter(c => c.tipo === 'policia'),
  };

  const labels = {
    emergencia: { label: 'Protección Civil', icon: '🛡️', color: 'border-red-800 bg-red-950/30' },
    salud:      { label: 'Salud y Cruz Roja', icon: '🏥', color: 'border-rose-800 bg-rose-950/30' },
    bomberos:   { label: 'Bomberos', icon: '🚒', color: 'border-orange-800 bg-orange-950/30' },
    policia:    { label: 'Policía / CICPC', icon: '👮', color: 'border-blue-800 bg-blue-950/30' },
  };

  let html = '';

  for (const [tipo, items] of Object.entries(grupos)) {
    if (!items.length) continue;
    const meta = labels[tipo];
    html += `
      <div class="mb-6">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
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

/** Estado vacío reutilizable cuando un filtro de zona no devuelve resultados */
function emptyZoneState(msg) {
  const zonaTxt = state.zona === 'all' ? '' : ` (${esc(state.zona)})`;
  return `
    <div class="col-span-full rounded-2xl bg-slate-800/60 border border-slate-700 border-dashed p-6 text-center">
      <p class="text-2xl mb-2">🔍</p>
      <p class="text-sm text-slate-400 leading-relaxed">${esc(msg)}${zonaTxt}</p>
      <p class="text-xs text-slate-500 mt-2">Cambia de zona en el selector superior para ver más.</p>
    </div>
  `;
}

// ─── SECCIÓN 5: HOSPITALES ───────────────────────────────────────────────────

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

  // Solo verificados, filtrados por zona
  const verificados = hospitales.filter(h => h.verificado && matchesZone(h));

  if (!verificados.length) {
    el.innerHTML = emptyZoneState('No hay hospitales registrados para esta zona.');
    return;
  }

  el.innerHTML = verificados.map(h => {
    return `
      <div class="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-5">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-base font-bold text-slate-200 leading-tight">${esc(h.nombre)}</p>
          ${h.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓</span>' : ''}
          ${h.emergencias ? '<span class="text-xs bg-red-900/50 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full font-semibold">EMERGENCIAS</span>' : ''}
        </div>
        ${h.ciudad ? `<p class="text-xs text-slate-400 mt-1.5">${esc(h.ciudad)}${h.estado ? ` · ${esc(h.estado)}` : ''}</p>` : ''}
        ${h.direccion ? `<p class="text-xs text-slate-500 mt-1">${esc(h.direccion)}</p>` : ''}
        ${h.telefono ? callActions(h.telefono, h.nombre) : ''}
        ${h.mapsUrl ? `<a href="${esc(h.mapsUrl)}" target="_blank" rel="noopener"
           class="mt-2 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors">
          📍 Ver en mapa
        </a>` : ''}
      </div>
    `;
  }).join('');
}

// ─── SECCIÓN 5b: REFUGIOS ─────────────────────────────────────────────────────

function renderRefugios(refugios) {
  const el = document.getElementById('refugios-list');
  if (!el) return;

  const visibles = (refugios || []).filter(r => r.verificado && matchesZone(r));

  if (!visibles.length) {
    el.innerHTML = emptyZoneState('No hay refugios registrados para esta zona.');
    return;
  }

  el.innerHTML = visibles.map(r => `
    <div class="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-5">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-base font-bold text-white leading-tight">${esc(r.nombre)}</p>
        ${r.verificado ? '<span class="text-xs bg-green-900/50 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full font-semibold">✓ Verificado</span>' : ''}
      </div>
      ${r.estado ? `<p class="text-xs text-slate-400 mt-1.5">${esc(r.estado)}</p>` : ''}
      ${r.direccion ? `<p class="text-xs text-slate-500 mt-1">${esc(r.direccion)}</p>` : ''}
      ${r.descripcion ? `<p class="text-sm text-slate-300 mt-2 leading-relaxed">${esc(r.descripcion)}</p>` : ''}
      ${r.mapsUrl ? `<a href="${esc(r.mapsUrl)}" target="_blank" rel="noopener"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-sky-800 hover:bg-sky-700 text-white font-semibold text-sm transition-colors">
        📍 Cómo llegar
      </a>` : ''}
    </div>
  `).join('');
}

// ─── SECCIÓN 5c: CENTROS DE ACOPIO ────────────────────────────────────────────

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
      ${c.estado ? `<p class="text-xs text-slate-400 mt-1.5">${esc(c.estado)}</p>` : ''}
      ${c.direccion ? `<p class="text-xs text-slate-500 mt-1 leading-relaxed">${esc(c.direccion)}</p>` : ''}
      ${c.descripcion ? `<p class="text-sm text-slate-300 mt-2 leading-relaxed">${esc(c.descripcion)}</p>` : ''}
      ${c.mapsUrl ? `<a href="${esc(c.mapsUrl)}" target="_blank" rel="noopener"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-sm transition-colors">
        📍 Cómo llegar
      </a>` : ''}
    </div>
  `).join('');
}

// ─── SECCIÓN DONACIONES ───────────────────────────────────────────────────────

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
      ${d.descripcion ? `<p class="text-sm text-slate-300 mt-2 leading-relaxed">${esc(d.descripcion)}</p>` : ''}
      <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer"
         class="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-emerald-50 font-bold text-sm transition-colors">
        💚 Donar ahora ↗
      </a>
    </div>
  `).join('');
}

// ─── SECCIÓN 6: DESAPARECIDOS ────────────────────────────────────────────────

async function renderDesaparecidos(enlaces) {
  const el = document.getElementById('desaparecidos-list');
  if (!el || !enlaces?.length) {
    if (el) el.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No hay plataformas configuradas.</p>';
    return;
  }

  // Renderizar inmediatamente con estado "verificando"
  el.innerHTML = enlaces.map(e => `
    <div id="link-${esc(e.id)}" class="rounded-2xl border border-violet-900/50 bg-violet-950/20 p-5">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="min-w-0">
          <p class="text-base font-bold text-white leading-tight">${esc(e.nombre)}</p>
          ${e.descripcion ? `<p class="text-sm text-slate-400 mt-2 leading-relaxed">${esc(e.descripcion)}</p>` : ''}
        </div>
        <span id="status-${esc(e.id)}" class="text-xs text-slate-500 shrink-0 mt-1">...</span>
      </div>
      <a id="btn-${esc(e.id)}" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer"
         class="flex items-center justify-center gap-2 w-full py-4 px-5 rounded-xl bg-violet-700 hover:bg-violet-600 active:bg-violet-800 text-white font-bold text-sm transition-colors">
        Abrir plataforma ↗
      </a>
    </div>
  `).join('');

  // Verificar disponibilidad de cada URL en segundo plano
  if (state.online) {
    enlaces.forEach(e => checkUrlAvailability(e));
  } else {
    enlaces.forEach(e => {
      const statusEl = document.getElementById(`status-${e.id}`);
      if (statusEl) {
        statusEl.textContent = 'Sin conexión';
        statusEl.className = 'text-xs text-amber-500 shrink-0';
      }
    });
  }
}

async function checkUrlAvailability(enlace) {
  const statusEl = document.getElementById(`status-${enlace.id}`);
  const btnEl    = document.getElementById(`btn-${enlace.id}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Intentar fetch con no-cors para evitar CORS (solo verifica que hay respuesta)
    await fetch(enlace.url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (statusEl) {
      statusEl.textContent = 'Disponible';
      statusEl.className = 'text-xs text-green-400 shrink-0';
    }
  } catch {
    if (statusEl) {
      statusEl.textContent = 'No disponible';
      statusEl.className = 'text-xs text-red-400 shrink-0';
    }
    if (btnEl) {
      btnEl.className = btnEl.className.replace('bg-violet-700 hover:bg-violet-600 active:bg-violet-800', 'bg-slate-700 cursor-not-allowed opacity-60');
      btnEl.textContent = 'No disponible actualmente';
      btnEl.removeAttribute('href');
    }
  }
}

// ─── SECCIÓN 7: GUÍAS ────────────────────────────────────────────────────────

function renderGuias(guias) {
  const el = document.getElementById('guias-list');
  if (!el || !guias?.length) return;

  el.innerHTML = guias.map((g, i) => {
    const urgenciaClass = g.urgencia === 'alta'
      ? 'border-emerald-800 bg-emerald-950/20'
      : 'border-slate-700 bg-slate-800/50';

    return `
      <div class="rounded-2xl border ${urgenciaClass} overflow-hidden">
        <button
          onclick="toggleGuia(${i})"
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

  // Abrir la primera guía por defecto
  toggleGuia(0);
}

function toggleGuia(idx) {
  const body  = document.getElementById(`guia-body-${idx}`);
  const arrow = document.getElementById(`guia-arrow-${idx}`);
  const btn   = body?.previousElementSibling;

  if (!body) return;
  const isOpen = !body.classList.contains('hidden');

  body.classList.toggle('hidden', isOpen);
  if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
  if (btn) btn.setAttribute('aria-expanded', !isOpen);
}

// Exponer para onclick inline
window.toggleGuia = toggleGuia;

// ─── CARGA DE DATOS ───────────────────────────────────────────────────────────

/**
 * Devuelve los datos de emergencia.
 * Usa window.VZ_DATA (cargado via data.js como <script>).
 * Fallback: intenta fetch de data.json si se sirve desde un servidor.
 */
async function loadData() {
  // Camino principal: data.js ya está cargado en memoria
  if (window.VZ_DATA) {
    state.data = window.VZ_DATA;
    return window.VZ_DATA;
  }

  // Fallback: fetch (solo funciona con servidor HTTP, no con file://)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(DATA_URL, { signal: controller.signal });
    clearTimeout(timeout);
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

/** Llena el <select> con las zonas afectadas del data.json */
function populateZonaSelector(zonas) {
  const select = document.getElementById('zona-select');
  if (!select || !Array.isArray(zonas)) return;

  // Mantener "Todas las zonas" y añadir cada zona
  const optionsHtml = ['<option value="all">Todas las zonas</option>']
    .concat(zonas.map(z => `<option value="${esc(z)}">${esc(z)}</option>`))
    .join('');
  select.innerHTML = optionsHtml;

  // Restaurar selección previa si sigue siendo válida
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

/** Muestra una pista bajo el selector con la zona activa */
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

/** Re-renderiza las secciones que dependen de la zona */
function applyZoneFilter() {
  if (!state.data) return;
  renderContactos(state.data.contactos || []);
  renderHospitales(state.data.hospitales || []);
  renderRefugios(state.data.refugios || []);
  renderAcopio(state.data.centrosAcopio || []);
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
      console.log('[App] SW registrado:', registration.scope);

      // Detectar nueva versión disponible
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

  // Escuchar mensajes del SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'USGS_FROM_CACHE') {
      document.getElementById('sismos-cache-notice')?.classList.remove('hidden');
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Registrar SW
  registerServiceWorker();

  // 2. Estado online/offline
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // 3. Delegación de copiado de teléfonos
  setupCopyDelegation();

  // 4. Cargar data.json
  const data = await loadData();

  if (data) {
    // Selector de zona (debe ir antes de renderizar para aplicar el filtro)
    populateZonaSelector(data.zonasAfectadas || []);

    renderContactos(data.contactos || []);
    renderHospitales(data.hospitales || []);
    renderRefugios(data.refugios || []);
    renderAcopio(data.centrosAcopio || []);
    renderDonaciones(data.donaciones || []);
    renderDesaparecidos(data.enlacesDesaparecidos || []);
    renderGuias(data.guias || []);
  } else {
    // Fallback mínimo si data.json no carga
    ['contactos-list', 'hospitales-list', 'refugios-list', 'acopio-list', 'donar-list', 'desaparecidos-list', 'guias-list'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="text-sm text-red-400 text-center py-4">Error cargando datos. Intenta recargar la app.</p>';
    });
  }

  // 5. Fetch USGS
  await fetchSismos();
}

// Exponer funciones para uso inline / debug
window.VZApp = { fetchSismos, copyText, applyZoneFilter };

// Arrancar
document.addEventListener('DOMContentLoaded', init);
