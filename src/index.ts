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
  points: TrackPoint[];
}

function parseFitFile(filePath: string): Promise<TrackPoint[]> {
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
      resolve(points);
    });
  });
}

function buildHTML(tracks: Track[]): string {
  const colors = [
    '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#C39BD3',
    '#F7DC6F', '#82E0AA', '#F1948A', '#85C1E9', '#F0B27A',
    '#AED6F1', '#A9DFBF', '#F9E79F', '#D2B4DE', '#A3E4D7',
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
      background: rgba(255, 255, 255, 0.96);
      border-radius: 10px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
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
    .track-item:hover { background: #f0f0f0; }
    .track-item.active { background: #eef4ff; }
    .swatch {
      width: 24px;
      height: 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .track-name {
      font-size: 12px;
      color: #222;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-pts {
      font-size: 11px;
      color: #aaa;
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
    <h2>GPS Tracks</h2>
    <div id="track-list"></div>
  </div>
  <script>
    const COLORS = ${colorsJson};
    const tracks = ${tracksJson};

    const map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const trackList = document.getElementById('track-list');
    const allLatLngs = [];
    const polylines = [];
    let activeItem = null;

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
        weight: 3,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      poly.bindTooltip(track.name, { sticky: true, opacity: 0.9 });
      polylines.push(poly);

      const item = document.createElement('div');
      item.className = 'track-item';
      item.title = track.name;
      item.innerHTML =
        '<div class="swatch" style="background:' + color + '"></div>' +
        '<span class="track-name">' + track.name + '</span>' +
        '<span class="track-pts">' + track.points.length.toLocaleString() + '</span>';

      item.addEventListener('click', () => {
        if (activeItem) activeItem.classList.remove('active');
        item.classList.add('active');
        activeItem = item;

        polylines.forEach((p, j) => p.setStyle({ weight: j === i ? 5 : 2, opacity: j === i ? 1 : 0.4 }));
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
      });

      trackList.appendChild(item);
    });

    if (allLatLngs.length > 0) {
      map.fitBounds(allLatLngs, { padding: [30, 30] });
    }
  </script>
</body>
</html>`;
}

async function main(): Promise<void> {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error('Usage: ts-node src/index.ts <folder-with-fit-files>');
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
      const points = await parseFitFile(filePath);
      const label = points.length > 0 ? `${points.length} GPS points` : 'no GPS data';
      console.log(`  ${points.length > 0 ? '✓' : '–'} ${file}: ${label}`);
      if (points.length > 0) {
        tracks.push({ name: file, points });
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
