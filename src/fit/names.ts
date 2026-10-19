import * as fs from 'fs';
import * as path from 'path';

/** Activity names keyed by FIT file basename, from names.json (see fetch-names). */
export function loadNames(folder: string): Record<string, string> {
  const namesFile = path.join(folder, 'names.json');
  if (!fs.existsSync(namesFile)) return {};
  return JSON.parse(fs.readFileSync(namesFile, 'utf8')) as Record<string, string>;
}
