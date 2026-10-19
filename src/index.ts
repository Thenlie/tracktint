import * as fs from 'fs';
import * as path from 'path';
import { loadLibrary } from './fit/library';
import { buildDashboardHTML } from './pages/dashboard';
import { buildMapHTML } from './pages/map';
import { startServer } from './server';

const PORT = 3000;

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
  const { tracks, activities } = await loadLibrary(folder, fitFiles);

  startServer({ map: buildMapHTML(tracks), dashboard: buildDashboardHTML(activities) }, PORT);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
