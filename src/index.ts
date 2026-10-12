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
  id: string;
  points: TrackPoint[];
}

interface ParsedTrack {
  points: TrackPoint[];
  session?: FitSession;
}

interface FitSession {
  start_time?: string | Date;
  sport?: string;
  total_distance?: number;
  total_timer_time?: number;
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
      resolve({ points, session: sessions?.[0] });
    });
  });
}

function formatTrackName(session: FitSession | undefined, fallback: string): string {
  if (!session) return fallback;

  const parts: string[] = [];
  if (session.start_time) {
    const start = new Date(session.start_time);
    if (!Number.isNaN(start.getTime())) {
      parts.push(start.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      }));
    }
  }
  if (session.sport) {
    parts.push(session.sport.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  }
  if (typeof session.total_distance === 'number' && session.total_distance > 0) {
    parts.push(`${session.total_distance.toFixed(1)} km`);
  }
  if (typeof session.total_timer_time === 'number' && session.total_timer_time > 0) {
    const minutes = Math.round(session.total_timer_time / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    parts.push(hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes} min`);
  }

  return parts.length > 0 ? parts.join(' · ') : fallback;
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
      padding: 14px 16px;
      max-width: 280px;
      max-height: calc(100vh - 24px);
      overflow-y: auto;
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
    .mode-toggle { display: flex; gap: 4px; margin-bottom: 12px; }
    .mode-toggle button {
      flex: 1;
      padding: 6px 0;
      font-size: 12px;
      color: #ccc;
      background: #2a2d36;
      border: 1px solid #3a3e4a;
      border-radius: 6px;
      cursor: pointer;
    }
    .mode-toggle button.on { background: #7B2CBF; color: #fff; border-color: #7B2CBF; }
    #legend { display: none; margin-bottom: 12px; }
    #legend .bar { height: 8px; border-radius: 4px; background: linear-gradient(to right, hsl(275,100%,50%), hsl(240,100%,50%), hsl(180,100%,50%), hsl(120,100%,50%), hsl(60,100%,50%), hsl(30,100%,50%), hsl(0,100%,50%)); }
    #legend .labels { display: flex; justify-content: space-between; font-size: 10px; color: #999; margin-top: 3px; }
    .heat-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
    .swatch {
      width: 24px;
      height: 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .track-name {
      font-size: 12px;
      color: #e6e6e6;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-pts {
      font-size: 11px;
      color: #888;
      flex-shrink: 0;
    }
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
    <div class="mode-toggle">
      <button id="btn-tracks" class="on">Tracks</button>
      <button id="btn-heat">Heatmap</button>
    </div>
    <div id="legend">
      <div class="bar"></div>
      <div class="labels"><span>1 pass</span><span>many</span></div>
    </div>
    <h2>GPS Tracks</h2>
    <div id="track-list"></div>
  </div>
  <script>
    const COLORS = ${colorsJson};
    const tracks = ${tracksJson};

    const map = L.map('map', { preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const trackList = document.getElementById('track-list');
    const allLatLngs = [];
    const polylines = [];
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
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = color;
      const name = document.createElement('span');
      name.className = 'track-name';
      name.textContent = track.name;
      const pointCount = document.createElement('span');
      pointCount.className = 'track-pts';
      pointCount.textContent = track.points.length.toLocaleString();
      item.append(swatch, name, pointCount);

      item.addEventListener('click', () => {
        if (activeItem) activeItem.classList.remove('active');
        item.classList.add('active');
        activeItem = item;

        if (!heatOn) {
          polylines.forEach((p, j) => p.setStyle({ weight: j === i ? 5 : 2, opacity: j === i ? 1 : 0.35 }));
        }
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
      });

      trackList.appendChild(item);
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

  const tracks: Track[] = [];
  for (const file of fitFiles) {
    const filePath = path.join(folder, file);
    try {
      const parsed = await parseFitFile(filePath);
      const label = parsed.points.length > 0 ? `${parsed.points.length} GPS points` : 'no GPS data';
      console.log(`  ${parsed.points.length > 0 ? '✓' : '–'} ${file}: ${label}`);
      if (parsed.points.length > 0) {
        tracks.push({ name: formatTrackName(parsed.session, file), id: file, points: parsed.points });
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const html = buildHTML(tracks);

  const server = http.createServer((_req, res) => {
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
