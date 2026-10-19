import * as fs from 'fs';
import * as path from 'path';
import { ParsedTrack } from '../types';

const CACHE_FILE = '.tracktint-cache.json';
/** Bump when the shape of ParsedTrack changes to invalidate old caches. */
const CACHE_VERSION = 3;

export interface CacheEntry {
  mtimeMs: number;
  size: number;
  parsed: ParsedTrack;
}

export interface Cache {
  version: number;
  entries: Record<string, CacheEntry>;
}

export function emptyCache(): Cache {
  return { version: CACHE_VERSION, entries: {} };
}

export function loadCache(folder: string): Cache {
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(folder, CACHE_FILE), 'utf8')) as Cache;
    return cache.version === CACHE_VERSION ? cache : emptyCache();
  } catch {
    return emptyCache();
  }
}

export function saveCache(folder: string, cache: Cache): void {
  try {
    fs.writeFileSync(path.join(folder, CACHE_FILE), JSON.stringify(cache));
  } catch (err) {
    console.error(`Could not write cache: ${err instanceof Error ? err.message : err}`);
  }
}
