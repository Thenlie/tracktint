import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import FitParser from 'fit-file-parser';

interface TrackPoint {
  lat: number;
  lon: number;
}

interface Track {
  name: string;
  title: string;
  subtitle: string;
  label: string;
  date: string;
  sport: string;
  id: string;
  startTime: number;
  distance: number;
  timerTime: number;
  elapsedTime: number;
  avgHeartRate: number;
  maxHeartRate: number;
  ascent: number;
  descent: number;
  calories: number;
  maxSpeed: number;
  points: TrackPoint[];
}

interface ParsedTrack {
  points: TrackPoint[];
  session?: FitSession;
}

interface FitSession {
  start_time?: string | Date;
  sport?: string;
  sub_sport?: string;
  total_distance?: number;
  total_timer_time?: number;
  total_elapsed_time?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_ascent?: number;
  total_descent?: number;
  total_calories?: number;
  max_speed?: number;
}

function parseFitFile(filePath: string): Promise<ParsedTrack> {
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(filePath);
    const parser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'both',
    });

    parser.parse(buffer, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      const points: TrackPoint[] = (data.records ?? [])
        .filter(r => r.position_lat != null && r.position_long != null)
        .map(r => ({ lat: r.position_lat as number, lon: r.position_long as number }));
      const sessions = data.sessions as FitSession[] | undefined;
      resolve({ points, session: slimSession(sessions?.[0]) });
    });
  });
}

const CACHE_FILE = '.tracktint-cache.json';
const CACHE_VERSION = 2;

interface CacheEntry {
  mtimeMs: number;
  size: number;
  parsed: ParsedTrack;
}

interface Cache {
  version: number;
  entries: Record<string, CacheEntry>;
}

function loadCache(folder: string): Cache {
  const empty: Cache = { version: CACHE_VERSION, entries: {} };
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(folder, CACHE_FILE), 'utf8')) as Cache;
    return cache.version === CACHE_VERSION ? cache : empty;
  } catch {
    return empty;
  }
}

function saveCache(folder: string, cache: Cache): void {
  try {
    fs.writeFileSync(path.join(folder, CACHE_FILE), JSON.stringify(cache));
  } catch (err) {
    console.error(`Could not write cache: ${err instanceof Error ? err.message : err}`);
  }
}

function slimSession(s: FitSession | undefined): FitSession | undefined {
  if (!s) return undefined;
  return {
    start_time: s.start_time,
    sport: s.sport,
    sub_sport: s.sub_sport,
    total_distance: s.total_distance,
    total_timer_time: s.total_timer_time,
    total_elapsed_time: s.total_elapsed_time,
    avg_heart_rate: s.avg_heart_rate,
    max_heart_rate: s.max_heart_rate,
    total_ascent: s.total_ascent,
    total_descent: s.total_descent,
    total_calories: s.total_calories,
    max_speed: s.max_speed,
  };
}

function loadNames(folder: string): Record<string, string> {
  const namesFile = path.join(folder, 'names.json');
  if (!fs.existsSync(namesFile)) return {};
  return JSON.parse(fs.readFileSync(namesFile, 'utf8')) as Record<string, string>;
}

function formatTrackName(
  session: FitSession | undefined,
  fallback: string,
  activityName?: string,
): { name: string; title: string; subtitle: string; label: string; date: string } {
  if (!session) {
    const n = activityName ?? fallback;
    return { name: n, title: n, subtitle: '', label: n, date: '' };
  }

  const parts: string[] = [];
  let duration = '';
  let date = '';
  if (activityName) parts.push(activityName);
  if (session.start_time) {
    const start = new Date(session.start_time);
    if (!Number.isNaN(start.getTime())) {
      date = start.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      parts.push(date);
    }
  }
  if (typeof session.total_timer_time === 'number' && session.total_timer_time > 0) {
    const minutes = Math.round(session.total_timer_time / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    duration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes} min`;
  }

  if (parts.length === 0 && !duration) return { name: fallback, title: fallback, subtitle: '', label: fallback, date: '' };
  const name = parts.join(' · ') || fallback;
  const all = duration ? [...parts, duration] : parts;
  return {
    name, title: all[0], subtitle: all.slice(1).join(' · '),
    label: activityName ?? '', date,
  };
}

function buildHTML(tracks: Track[]): string {
  const colors = [
    '#FF4D00', '#00E5FF', '#FF1493', '#76FF03', '#FFD600',
    '#E040FB', '#00FF9C', '#FF5252', '#40C4FF', '#FFAB00',
    '#B2FF59', '#FF6EC7', '#18FFFF', '#FF9100', '#7C4DFF',
  ];

  const tracksJson = JSON.stringify(tracks);
  const colorsJson = JSON.stringify(colors);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIT Map Viewer</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #map { height: 100vh; }
    #panel {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1000;
      background: rgba(20, 22, 28, 0.92);
      border-radius: 10px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
      padding: 0 16px 14px;
      width: 280px;
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      overflow-x: hidden;
    }
    #panel h2 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #888;
      margin-bottom: 12px;
    }
    .track-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 6px;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.12s;
    }
    .track-item:hover { background: #2a2d36; }
    .track-item.active { background: #343a4d; }
    /* darken OSM tiles: invert to dark, mute colors */
    .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) grayscale(0.7) brightness(0.75) contrast(0.9); }
    #map { background: #14161c; }
    .panel-header {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #14161c;
      padding: 14px 0 0;
      margin-bottom: 4px;
    }
    .mode-toggle, .sort-bar { display: flex; gap: 4px; margin-bottom: 8px; }
    .mode-toggle button, .sort-bar button {
      flex: 1;
      padding: 6px 0;
      font-size: 12px;
      color: #ccc;
      background: #2a2d36;
      border: 1px solid #3a3e4a;
      border-radius: 6px;
      cursor: pointer;
    }
    .sort-bar button { font-size: 11px; }
    .mode-toggle button.on, .sort-bar button.on { background: #7B2CBF; color: #fff; border-color: #7B2CBF; }
    #legend { display: none; margin-bottom: 8px; }
    #legend .bar { height: 8px; border-radius: 4px; background: linear-gradient(to right, hsl(275,100%,50%), hsl(240,100%,50%), hsl(180,100%,50%), hsl(120,100%,50%), hsl(60,100%,50%), hsl(30,100%,50%), hsl(0,100%,50%)); }
    #legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: #999; margin-top: 3px; }
    .heat-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
    .swatch {
      width: 22px;
      flex-shrink: 0;
      text-align: center;
      font-size: 17px;
      color: #fff;
    }
    .track-text { flex: 1; min-width: 0; }
    .track-name {
      display: block;
      font-size: 12px;
      color: #e6e6e6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-sub {
      font-size: 11px;
      color: #888;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-pts {
      font-size: 11px;
      color: #888;
      flex-shrink: 0;
    }
    #detail {
      display: none;
      position: absolute;
      top: 12px;
      right: 304px;
      z-index: 1000;
      width: 300px;
      max-width: calc(100vw - 316px);
      background: rgba(20, 22, 28, 0.95);
      border-radius: 10px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
      padding: 14px 16px 16px;
      color: #e6e6e6;
    }
    #detail .d-head { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #3a3e4a; }
    #detail .d-titles { flex: 1; min-width: 0; }
    #detail .d-title { font-size: 16px; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #detail .d-date { font-size: 11px; color: #888; margin-top: 2px; }
    #detail .d-close { background: none; border: none; color: #888; font-size: 18px; line-height: 1; cursor: pointer; }
    #detail .d-close:hover { color: #fff; }
    #detail .d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
    #detail .d-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; }
    #detail .d-value { font-size: 16px; font-weight: 600; margin-top: 2px; }
    #empty-msg {
      font-size: 13px;
      color: #999;
      padding: 4px 0;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="panel">
    <div class="panel-header">
      <div class="mode-toggle">
        <button id="btn-tracks" class="on">Tracks</button>
        <button id="btn-heat">Heatmap</button>
      </div>
      <div class="sort-bar">
        <button data-sort="name">Name</button>
        <button data-sort="distance">Distance</button>
        <button data-sort="date">Date</button>
      </div>
      <div id="legend">
        <div class="bar"></div>
        <div class="labels"><span>1 pass</span><span>many</span></div>
      </div>
    </div>
    <h2>GPS Tracks</h2>
    <div id="track-list"></div>
  </div>
  <div id="detail">
    <div class="d-head">
      <div class="d-titles">
        <div class="d-title"></div>
        <div class="d-date"></div>
      </div>
      <button class="d-close" title="Close">&times;</button>
    </div>
    <div class="d-grid"></div>
  </div>
  <script>
    // Live reload: server restarts (tsx watch) drop the stream; reload once it's back.
    (function () {
      const es = new EventSource('/__reload');
      es.onerror = () => {
        es.close();
        const poll = setInterval(() => {
          fetch('/', { cache: 'no-store' }).then(r => { if (r.ok) { clearInterval(poll); location.reload(); } }).catch(() => {});
        }, 500);
      };
    })();
  </script>
  <script>
    const COLORS = ${colorsJson};
    const tracks = ${tracksJson};

    const SPORT_ICONS = {
      running: 'person-running',
      trail_running: 'mountain',
      cycling: 'person-biking',
      e_biking: 'person-biking',
      walking: 'person-walking',
      hiking: 'person-hiking',
      swimming: 'person-swimming',
      alpine_skiing: 'person-skiing',
      cross_country_skiing: 'person-skiing-nordic',
      snowboarding: 'person-snowboarding',
      training: 'dumbbell',
    };
    function sportIcon(sport) {
      const el = document.createElement('i');
      el.className = 'swatch fa-solid fa-' + (SPORT_ICONS[sport] || 'location-dot');
      el.title = (sport || 'activity').replace(/_/g, ' ');
      return el;
    }

    const map = L.map('map', { preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const trackList = document.getElementById('track-list');
    const allLatLngs = [];
    const polylines = [];
    const items = [];
    let activeItem = null;
    let heatOn = false;

    if (tracks.length === 0) {
      trackList.innerHTML = '<div id="empty-msg">No GPS data found.</div>';
      map.setView([20, 0], 2);
    }

    tracks.forEach((track, i) => {
      const color = COLORS[i % COLORS.length];
      const latLngs = track.points.map(p => [p.lat, p.lon]);
      allLatLngs.push(...latLngs);

      const poly = L.polyline(latLngs, {
        color,
        weight: 2.5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      poly.bindTooltip(track.name, { sticky: true, opacity: 0.9 });
      polylines.push(poly);

      const item = document.createElement('div');
      item.className = 'track-item';
      item.title = track.id;
      const swatch = sportIcon(track.sport);
      const name = document.createElement('span');
      name.className = 'track-name';
      name.textContent = track.title;
      const text = document.createElement('div');
      text.className = 'track-text';
      text.appendChild(name);
      if (track.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'track-sub';
        sub.textContent = track.subtitle;
        text.appendChild(sub);
      }
      const pointCount = document.createElement('span');
      pointCount.className = 'track-pts';
      pointCount.textContent = track.distance > 0 ? (track.distance * 0.621371).toFixed(1) + ' mi' : '';
      item.append(swatch, text, pointCount);

      function selectTrack() {
        if (activeItem) activeItem.classList.remove('active');
        item.classList.add('active');
        activeItem = item;

        if (!heatOn) {
          polylines.forEach((p, j) => p.setStyle({ weight: j === i ? 5 : 2, opacity: j === i ? 1 : 0.35 }));
        }
        showDetail(track);
      }

      item.addEventListener('click', () => {
        selectTrack();
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
      });
      poly.on('click', selectTrack);

      items.push({ item, track });
      trackList.appendChild(item);
    });

    // ---- Detail dialog ----
    const detailEl = document.getElementById('detail');
    const KM_TO_MI = 0.621371, KM_TO_FT = 3280.84;

    function fmtDuration(sec) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
      return h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm ' + String(s).padStart(2, '0') + 's';
    }
    function fmtPace(secPerMi) {
      const m = Math.floor(secPerMi / 60), s = Math.round(secPerMi % 60);
      return m + ':' + String(s).padStart(2, '0') + ' /mi';
    }

    function showDetail(track) {
      const mi = track.distance * KM_TO_MI;
      const rows = [
        ['Distance', mi > 0 ? mi.toFixed(2) + ' mi' : null],
        ['Moving time', track.timerTime > 0 ? fmtDuration(track.timerTime) : null],
        ['Elapsed time', track.elapsedTime > 0 ? fmtDuration(track.elapsedTime) : null],
        ['Avg pace', mi > 0 && track.timerTime > 0 ? fmtPace(track.timerTime / mi) : null],
        ['Avg heart rate', track.avgHeartRate > 0 ? track.avgHeartRate + ' bpm' : null],
        ['Max heart rate', track.maxHeartRate > 0 ? track.maxHeartRate + ' bpm' : null],
        ['Elevation gain', track.ascent > 0 ? Math.round(track.ascent * KM_TO_FT).toLocaleString() + ' ft' : null],
        ['Elevation loss', track.descent > 0 ? Math.round(track.descent * KM_TO_FT).toLocaleString() + ' ft' : null],
        ['Calories', track.calories > 0 ? track.calories.toLocaleString() + ' kcal' : null],
      ];
      detailEl.querySelector('.d-title').textContent = track.label || track.date || track.name;
      const dateEl = detailEl.querySelector('.d-date');
      dateEl.textContent = track.label ? track.date : '';
      dateEl.style.display = track.label && track.date ? 'block' : 'none';
      const grid = detailEl.querySelector('.d-grid');
      grid.textContent = '';
      for (const [label, value] of rows) {
        if (value == null) continue;
        const cell = document.createElement('div');
        const l = document.createElement('div');
        l.className = 'd-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'd-value';
        v.textContent = value;
        cell.append(l, v);
        grid.appendChild(cell);
      }
      detailEl.style.display = 'block';
    }
    function hideDetail() { detailEl.style.display = 'none'; }
    detailEl.querySelector('.d-close').addEventListener('click', hideDetail);

    // ---- Sorting ----
    const SORTERS = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      distance: (a, b) => a.distance - b.distance,
      date: (a, b) => a.startTime - b.startTime,
    };
    const SORT_LABELS = { name: 'Name', distance: 'Distance', date: 'Date' };
    const sortState = { key: null, dir: 'asc' };

    function applySort() {
      const cmp = SORTERS[sortState.key];
      const sign = sortState.dir === 'asc' ? 1 : -1;
      [...items].sort((a, b) => sign * cmp(a.track, b.track))
        .forEach(({ item }) => trackList.appendChild(item));
      document.querySelectorAll('.sort-bar button').forEach(btn => {
        const key = btn.dataset.sort;
        const on = key === sortState.key;
        btn.classList.toggle('on', on);
        btn.textContent = SORT_LABELS[key] + (on ? (sortState.dir === 'asc' ? ' ↑' : ' ↓') : '');
      });
    }
    document.querySelectorAll('.sort-bar button').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'asc'; }
        applySort();
      });
    });

    if (allLatLngs.length > 0) {
      map.fitBounds(allLatLngs, { padding: [30, 30] });
    }

    // ---- Heatmap: alpha accumulates with overlap, then mapped purple -> red ----
    const HEAT_ALPHA = 0.18;   // per-pass alpha; ~10 overlaps approach full red
    const HEAT_WIDTH = 3;

    // 256-entry LUT: alpha -> rgb, rainbow hue 275 (purple) -> 0 (red)
    // via blue, cyan, green, yellow, orange
    function hslToRgb(h, s, l) {
      const k = n => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }
    const LUT = [];
    for (let a = 0; a < 256; a++) {
      LUT.push(hslToRgb(275 * (1 - a / 255), 1, 0.5));
    }

    const heatCanvas = document.createElement('canvas');
    heatCanvas.className = 'heat-canvas leaflet-zoom-hide';
    heatCanvas.style.display = 'none';
    map.getContainer().appendChild(heatCanvas);
    const accum = document.createElement('canvas');

    function renderHeat() {
      if (!heatOn) return;
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(size.x * dpr), h = Math.round(size.y * dpr);
      for (const c of [heatCanvas, accum]) { c.width = w; c.height = h; }
      heatCanvas.style.width = size.x + 'px';
      heatCanvas.style.height = size.y + 'px';
      heatCanvas.style.zIndex = 450;

      const ctx = accum.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = HEAT_WIDTH;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = HEAT_ALPHA;

      for (const track of tracks) {
        ctx.beginPath();
        let lx = NaN, ly = NaN;
        for (const p of track.points) {
          const pt = map.latLngToContainerPoint([p.lat, p.lon]);
          if (Math.abs(pt.x - lx) < 1 && Math.abs(pt.y - ly) < 1) continue;
          if (isNaN(lx)) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          lx = pt.x; ly = pt.y;
        }
        ctx.stroke();
      }

      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a === 0) continue;
        const c = LUT[a];
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
        d[i + 3] = Math.max(a, 140);   // keep faint single passes visible
      }
      heatCanvas.getContext('2d').putImageData(img, 0, 0);
    }

    let heatTimer = null;
    function scheduleHeat() {
      clearTimeout(heatTimer);
      heatTimer = setTimeout(renderHeat, 60);
    }
    map.on('moveend zoomend resize', scheduleHeat);
    map.on('zoomstart movestart', () => { if (heatOn) heatCanvas.style.opacity = 0.3; });
    map.on('moveend', () => { heatCanvas.style.opacity = 1; });

    function setMode(heat) {
      heatOn = heat;
      document.getElementById('btn-heat').classList.toggle('on', heat);
      document.getElementById('btn-tracks').classList.toggle('on', !heat);
      document.getElementById('legend').style.display = heat ? 'block' : 'none';
      heatCanvas.style.display = heat ? 'block' : 'none';
      polylines.forEach(p => {
        if (heat) { map.removeLayer(p); }
        else { p.addTo(map); p.setStyle({ weight: 2.5, opacity: 0.9 }); }
      });
      if (activeItem) { activeItem.classList.remove('active'); activeItem = null; }
      hideDetail();
      if (heat) renderHeat();
    }
    document.getElementById('btn-tracks').addEventListener('click', () => setMode(false));
    document.getElementById('btn-heat').addEventListener('click', () => setMode(true));
  </script>
</body>
</html>`;
}

async function main(): Promise<void> {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error('Usage: tsx src/index.ts <folder-with-fit-files>');
    process.exit(1);
  }

  const folder = path.resolve(folderArg);
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`Not a directory: ${folder}`);
    process.exit(1);
  }

  const fitFiles = fs.readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith('.fit'))
    .sort();

  if (fitFiles.length === 0) {
    console.error(`No .fit files found in: ${folder}`);
    process.exit(1);
  }

  console.log(`Parsing ${fitFiles.length} .fit file(s)...`);

  const names = loadNames(folder);
  const cache = loadCache(folder);
  const nextCache: Cache = { version: CACHE_VERSION, entries: {} };
  let cacheHits = 0;
  const tracks: Track[] = [];
  for (const file of fitFiles) {
    const filePath = path.join(folder, file);
    try {
      const stat = fs.statSync(filePath);
      const hit = cache.entries[file];
      let parsed: ParsedTrack;
      if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) {
        parsed = hit.parsed;
        cacheHits++;
      } else {
        parsed = await parseFitFile(filePath);
      }
      nextCache.entries[file] = { mtimeMs: stat.mtimeMs, size: stat.size, parsed };
      const label = parsed.points.length > 0 ? `${parsed.points.length} GPS points` : 'no GPS data';
      if (hit?.parsed !== parsed) console.log(`  ${parsed.points.length > 0 ? '✓' : '–'} ${file}: ${label}`);
      if (parsed.points.length > 0) {
        const startTime = parsed.session?.start_time ? new Date(parsed.session.start_time).getTime() : NaN;
        tracks.push({
          ...formatTrackName(parsed.session, file, names[path.basename(file, '.fit')]),
          sport: parsed.session?.sub_sport === 'trail' && parsed.session.sport === 'running'
            ? 'trail_running'
            : parsed.session?.sport ?? '',
          id: file,
          startTime: Number.isNaN(startTime) ? 0 : startTime,
          distance: parsed.session?.total_distance ?? 0,
          timerTime: parsed.session?.total_timer_time ?? 0,
          elapsedTime: parsed.session?.total_elapsed_time ?? 0,
          avgHeartRate: parsed.session?.avg_heart_rate ?? 0,
          maxHeartRate: parsed.session?.max_heart_rate ?? 0,
          // fit-file-parser reports ascent/descent in km (lengthUnit)
          ascent: parsed.session?.total_ascent ?? 0,
          descent: parsed.session?.total_descent ?? 0,
          calories: parsed.session?.total_calories ?? 0,
          maxSpeed: parsed.session?.max_speed ?? 0,
          points: parsed.points,
        });
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  saveCache(folder, nextCache);
  if (cacheHits > 0) console.log(`  (${cacheHits} file(s) loaded from cache)`);

  const html = buildHTML(tracks);

  const server = http.createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  const port = 3000;
  server.listen(port, '127.0.0.1', () => {
    console.log(`\nMap ready → http://localhost:${port}`);
    console.log('Press Ctrl+C to stop.\n');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
