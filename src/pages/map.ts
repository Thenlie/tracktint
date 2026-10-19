import { Track } from '../types';

export function buildMapHTML(tracks: Track[]): string {
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
    .dash-link { display: block; text-align: center; margin-bottom: 8px; padding: 6px 0; font-size: 12px; color: #ccc; text-decoration: none; background: #2a2d36; border: 1px solid #3a3e4a; border-radius: 6px; }
    .dash-link:hover { border-color: #7B2CBF; }
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
    .unit-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; font-size: 12px; color: #888; }
    .unit-row span.on { color: #fff; font-weight: 600; }
    .switch { position: relative; width: 38px; height: 20px; padding: 0; border: none; border-radius: 10px; background: #3a3e4a; cursor: pointer; transition: background 0.15s; }
    .switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
    .switch[aria-checked="true"] { background: #7B2CBF; }
    .switch[aria-checked="true"]::after { transform: translateX(18px); }
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
    #detail .d-chart { display: inline-flex; margin-top: 8px; align-items: center; gap: 6px; background: #2a2d36; border: 1px solid #3a3e4a; border-radius: 6px; color: #e6e6e6; font-size: 12px; line-height: 1; cursor: pointer; padding: 6px 10px; white-space: nowrap; }
    #detail .d-chart:hover { border-color: #7B2CBF; }
    #detail .d-chart.on { background: #7B2CBF; border-color: #7B2CBF; color: #fff; }
    #chart {
      display: none;
      position: absolute;
      left: 12px;
      right: 304px;
      bottom: 12px;
      height: 170px;
      z-index: 1000;
      background: rgba(20, 22, 28, 0.95);
      border-radius: 10px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
      color: #e6e6e6;
    }
    #chart { flex-direction: column; }
    #chart .c-stats { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 8px 14px 0; font-size: 11px; color: #888; white-space: nowrap; }
    #chart .c-stats b { color: #e6e6e6; font-weight: 600; margin-left: 4px; }
    #chart .c-stats .up b { color: #6fcf97; }
    #chart .c-stats .down b { color: #eb7b7b; }
    #chart canvas { flex: 1; min-height: 0; width: 100%; display: block; }
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
      <a href="/dashboard" class="dash-link"><i class="fa-solid fa-chart-column"></i> Dashboard</a>
      <div class="unit-row">
        <span id="u-mi" title="Miles, feet">Imperial</span>
        <button id="unit-switch" class="switch" role="switch" aria-label="Use metric units" aria-checked="false"></button>
        <span id="u-km" title="Kilometers, meters">Metric</span>
      </div>
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
        <button class="d-chart" title="Elevation profile"><i class="fa-solid fa-chart-area"></i> Elevation</button>
      </div>
      <button class="d-close" title="Close">&times;</button>
    </div>
    <div class="d-grid"></div>
  </div>
  <div id="chart"><div class="c-stats"></div><canvas></canvas></div>
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

    // ---- Units ----
    const KM_TO_MI = 0.621371, KM_TO_FT = 3280.84, KM_TO_M = 1000;
    let units = 'mi';
    try { if (localStorage.getItem('units') === 'km') units = 'km'; } catch (e) {}
    const isMi = () => units === 'mi';
    const fmtDist = km => (km * (isMi() ? KM_TO_MI : 1)).toFixed(1) + ' ' + units;
    const fmtElev = km => Math.round(km * (isMi() ? KM_TO_FT : KM_TO_M)).toLocaleString() + (isMi() ? ' ft' : ' m');

    const map = L.map('map', { preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const trackList = document.getElementById('track-list');
    const allLatLngs = [];
    const polylines = [];
    const items = [];
    const distEls = [];
    let detailTrack = null;
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
      pointCount.textContent = track.distance > 0 ? fmtDist(track.distance) : '';
      item.append(swatch, text, pointCount);
      distEls.push({ el: pointCount, track });

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
    function fmtDuration(sec) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
      return h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm ' + String(s).padStart(2, '0') + 's';
    }
    function fmtPace(secPerUnit) {
      const m = Math.floor(secPerUnit / 60), s = Math.round(secPerUnit % 60);
      return m + ':' + String(s).padStart(2, '0') + ' /' + units;
    }

    function showDetail(track) {
      detailTrack = track;
      const dist = track.distance * (isMi() ? KM_TO_MI : 1);
      const rows = [
        ['Distance', dist > 0 ? dist.toFixed(2) + ' ' + units : null],
        ['Moving time', track.timerTime > 0 ? fmtDuration(track.timerTime) : null],
        ['Elapsed time', track.elapsedTime > 0 ? fmtDuration(track.elapsedTime) : null],
        ['Avg pace', dist > 0 && track.timerTime > 0 ? fmtPace(track.timerTime / dist) : null],
        ['Avg heart rate', track.avgHeartRate > 0 ? track.avgHeartRate + ' bpm' : null],
        ['Max heart rate', track.maxHeartRate > 0 ? track.maxHeartRate + ' bpm' : null],
        ['Elevation gain', track.ascent > 0 ? fmtElev(track.ascent) : null],
        ['Elevation loss', track.descent > 0 ? fmtElev(track.descent) : null],
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
      chartBtn.style.display = elevSeries(track).length > 1 ? '' : 'none';
      drawChart();
    }
    function hideDetail() { detailEl.style.display = 'none'; detailTrack = null; drawChart(); }
    detailEl.querySelector('.d-close').addEventListener('click', hideDetail);

    // ---- Elevation profile ----
    const chartEl = document.getElementById('chart');
    const chartCanvas = chartEl.querySelector('canvas');
    const chartBtn = detailEl.querySelector('.d-chart');
    const hoverMarker = L.circleMarker([0, 0], { radius: 6, color: '#fff', weight: 2, fillColor: '#7B2CBF', fillOpacity: 1, interactive: false });
    let chartOn = false;
    let chartGeom = null;

    function elevSeries(track) {
      if (track._elev) return track._elev;
      track._elev = track.points.filter(p => p.a != null && p.d != null);
      return track._elev;
    }

    function drawChart(hoverIdx) {
      const track = detailTrack;
      const series = track ? elevSeries(track) : [];
      const show = chartOn && series.length > 1;
      chartBtn.classList.toggle('on', chartOn);
      chartEl.style.display = show ? 'flex' : 'none';
      if (!show) { chartGeom = null; map.removeLayer(hoverMarker); return; }

      const dpr = window.devicePixelRatio || 1;
      const W = chartCanvas.clientWidth, H = chartCanvas.clientHeight;
      chartCanvas.width = W * dpr;
      chartCanvas.height = H * dpr;
      const ctx = chartCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const dMul = isMi() ? KM_TO_MI : 1, aMul = isMi() ? KM_TO_FT : KM_TO_M;
      const xs = series.map(p => p.d * dMul), ys = series.map(p => p.a * aMul);
      let yMin = Infinity, yMax = -Infinity;
      for (const y of ys) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
      const eu = isMi() ? ' ft' : ' m', fmtE = v => Math.round(v).toLocaleString() + eu;
      const gain = track.ascent > 0 ? track.ascent * aMul : null, loss = track.descent > 0 ? track.descent * aMul : null;
      const stat = (cls, label, v) => '<span class="' + cls + '">' + label + '<b>' + v + '</b></span>';
      chartEl.querySelector('.c-stats').innerHTML =
        stat('', 'Max', fmtE(yMax)) + stat('', 'Min', fmtE(yMin)) +
        (gain != null ? stat('up', 'Gain', '+' + fmtE(gain)) : '') +
        (loss != null ? stat('down', 'Loss', '&minus;' + fmtE(loss)) : '');
      const pad = Math.max((yMax - yMin) * 0.1, 1);
      yMin -= pad; yMax += pad;
      const xMin = xs[0], xMax = xs[xs.length - 1] || 1;
      const L_ = 52, R_ = 14, T_ = 14, B_ = 24;
      const px = x => L_ + ((x - xMin) / (xMax - xMin || 1)) * (W - L_ - R_);
      const py = y => T_ + (1 - (y - yMin) / (yMax - yMin)) * (H - T_ - B_);
      chartGeom = { xs, ys, series, px, L_, R_, W };

      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#888';
      ctx.strokeStyle = '#2a2d36';
      ctx.lineWidth = 1;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 3; i++) {
        const v = yMin + ((yMax - yMin) * i) / 3, y = py(v);
        ctx.beginPath(); ctx.moveTo(L_, y); ctx.lineTo(W - R_, y); ctx.stroke();
        ctx.fillText(Math.round(v).toLocaleString() + (isMi() ? ' ft' : ' m'), L_ - 6, y);
      }
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) {
        const v = xMin + ((xMax - xMin) * i) / 4;
        ctx.fillText(v.toFixed(1) + ' ' + units, px(v), H - B_ + 6);
      }

      ctx.beginPath();
      xs.forEach((x, i) => { if (i === 0) ctx.moveTo(px(x), py(ys[i])); else ctx.lineTo(px(x), py(ys[i])); });
      ctx.strokeStyle = '#B57BEE';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineTo(px(xMax), H - B_);
      ctx.lineTo(px(xMin), H - B_);
      ctx.closePath();
      ctx.fillStyle = 'rgba(123, 44, 191, 0.3)';
      ctx.fill();

      if (hoverIdx != null) {
        const x = px(xs[hoverIdx]), y = py(ys[hoverIdx]);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, T_); ctx.lineTo(x, H - B_); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        const label = xs[hoverIdx].toFixed(2) + ' ' + units + ' · ' + Math.round(ys[hoverIdx]).toLocaleString() + (isMi() ? ' ft' : ' m');
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textBaseline = 'top';
        ctx.textAlign = x > W / 2 ? 'right' : 'left';
        ctx.fillStyle = '#e6e6e6';
        ctx.fillText(label, x + (x > W / 2 ? -8 : 8), T_ + 2);
        hoverMarker.setLatLng([series[hoverIdx].lat, series[hoverIdx].lon]).addTo(map);
      } else {
        map.removeLayer(hoverMarker);
      }
    }

    chartCanvas.addEventListener('mousemove', e => {
      if (!chartGeom) return;
      const x = e.clientX - chartCanvas.getBoundingClientRect().left;
      const { xs, px } = chartGeom;
      let lo = 0, hi = xs.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (px(xs[mid]) < x) lo = mid + 1; else hi = mid; }
      if (lo > 0 && Math.abs(px(xs[lo - 1]) - x) < Math.abs(px(xs[lo]) - x)) lo--;
      drawChart(lo);
    });
    chartCanvas.addEventListener('mouseleave', () => drawChart());
    chartBtn.addEventListener('click', () => { chartOn = !chartOn; drawChart(); });
    window.addEventListener('resize', () => drawChart());

    // ---- Unit toggle ----
    const unitBtn = document.getElementById('unit-switch');
    function applyUnits() {
      unitBtn.setAttribute('aria-checked', String(!isMi()));
      document.getElementById('u-mi').classList.toggle('on', isMi());
      document.getElementById('u-km').classList.toggle('on', !isMi());
      distEls.forEach(({ el, track }) => { el.textContent = track.distance > 0 ? fmtDist(track.distance) : ''; });
      if (detailTrack) showDetail(detailTrack);
    }
    unitBtn.addEventListener('click', () => {
      units = isMi() ? 'km' : 'mi';
      try { localStorage.setItem('units', units); } catch (e) {}
      applyUnits();
    });
    applyUnits();

    // ---- Sorting ----
    const SORTERS = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      distance: (a, b) => a.distance - b.distance,
      date: (a, b) => a.startTime - b.startTime,
    };
    const SORT_LABELS = { name: 'Name', distance: 'Distance', date: 'Date' };
    const sortState = { key: 'date', dir: 'desc' };

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
    applySort();

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
