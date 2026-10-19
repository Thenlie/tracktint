import * as http from 'http';

export interface ServerPages {
  map: string;
  dashboard: string;
}

/** Serve the map at any path and the dashboard at /dashboard. /__reload is an SSE stream for live reload. */
export function startServer(pages: ServerPages, port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(req.url?.split('?')[0] === '/dashboard' ? pages.dashboard : pages.map);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\nMap ready → http://localhost:${port}`);
    console.log(`Dashboard → http://localhost:${port}/dashboard`);
    console.log('Press Ctrl+C to stop.\n');
  });
  return server;
}
