import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Serve a file from `root` if the URL maps to one. Returns false if not handled. */
export function serveStatic(root: string, urlPath: string, res: http.ServerResponse): boolean {
  const filePath = path.join(root, decodeURIComponent(urlPath));
  // Reject paths that escape the root
  if (!filePath.startsWith(root + path.sep)) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  const type = MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}
