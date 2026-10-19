import * as fs from 'fs';
import * as path from 'path';
import { DashActivity, ParsedTrack, Track } from '../types';
import { emptyCache, loadCache, saveCache } from './cache';
import { loadNames } from './names';
import { parseFitFile } from './parse';
import { formatTrackName } from './track-name';

export interface Library {
  tracks: Track[];
  activities: DashActivity[];
}

/** Parse every .fit file in a folder (using the on-disk cache) into tracks and dashboard activities. */
export async function loadLibrary(folder: string, fitFiles: string[]): Promise<Library> {
  const names = loadNames(folder);
  const cache = loadCache(folder);
  const nextCache = emptyCache();
  let cacheHits = 0;
  const tracks: Track[] = [];
  const activities: DashActivity[] = [];

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

      const session = parsed.session;
      const startTime = session?.start_time ? new Date(session.start_time).getTime() : NaN;
      const sport = session?.sub_sport === 'trail' && session.sport === 'running'
        ? 'trail_running'
        : session?.sport ?? '';
      const activityName = names[path.basename(file, '.fit')];

      if (session) {
        activities.push({
          id: file,
          name: activityName ?? '',
          sport,
          startTime: Number.isNaN(startTime) ? 0 : startTime,
          distance: session.total_distance ?? 0,
          timerTime: session.total_timer_time ?? 0,
          elapsedTime: session.total_elapsed_time ?? 0,
          ascent: session.total_ascent ?? 0,
          calories: session.total_calories ?? 0,
          avgHeartRate: session.avg_heart_rate ?? 0,
        });
      }
      if (parsed.points.length > 0) {
        tracks.push({
          ...formatTrackName(session, file, activityName),
          sport,
          id: file,
          startTime: Number.isNaN(startTime) ? 0 : startTime,
          distance: session?.total_distance ?? 0,
          timerTime: session?.total_timer_time ?? 0,
          elapsedTime: session?.total_elapsed_time ?? 0,
          avgHeartRate: session?.avg_heart_rate ?? 0,
          maxHeartRate: session?.max_heart_rate ?? 0,
          // fit-file-parser reports ascent/descent in km (lengthUnit)
          ascent: session?.total_ascent ?? 0,
          descent: session?.total_descent ?? 0,
          calories: session?.total_calories ?? 0,
          maxSpeed: session?.max_speed ?? 0,
          points: parsed.points,
        });
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  saveCache(folder, nextCache);
  if (cacheHits > 0) console.log(`  (${cacheHits} file(s) loaded from cache)`);
  return { tracks, activities };
}
