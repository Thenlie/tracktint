import * as http from 'http';
import * as path from 'path';
import { serveStatic } from './static';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export interface ServerPages {
  map: string;
  dashboard: string;
}

/** Serve files from public/, the dashboard at /dashboard, and the map for any other path. /__reload is an SSE stream for live reload. */
export function startServer(pages: ServerPages, port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      return;
    }
    const urlPath = req.url?.split('?')[0] ?? '/';
    if (serveStatic(PUBLIC_DIR, urlPath, res)) return;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(urlPath === '/dashboard' ? pages.dashboard : pages.map);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\nMap ready → http://localhost:${port}`);
    console.log(`Dashboard → http://localhost:${port}/dashboard`);
    console.log('Press Ctrl+C to stop.\n');
  });
  return server;
}
