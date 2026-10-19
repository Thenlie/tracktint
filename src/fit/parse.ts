import * as fs from 'fs';
import FitParser from 'fit-file-parser';
import { FitSession, ParsedTrack, TrackPoint } from '../types';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Keep only the session fields we use; the full message is large. */
function slimSession(s: FitSession | undefined): FitSession | undefined {
  if (!s) return undefined;
  return {
    start_time: s.start_time,
    sport: s.sport,
    sub_sport: s.sub_sport,
    total_distance: s.total_distance,
    total_timer_time: s.total_timer_time,
    total_elapsed_time: s.total_elapsed_time,
    avg_heart_rate: s.avg_heart_rate,
    max_heart_rate: s.max_heart_rate,
    total_ascent: s.total_ascent,
    total_descent: s.total_descent,
    total_calories: s.total_calories,
    max_speed: s.max_speed,
  };
}

export function parseFitFile(filePath: string): Promise<ParsedTrack> {
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
      const points: TrackPoint[] = [];
      let cum = 0;
      for (const r of data.records ?? []) {
        if (r.position_lat == null || r.position_long == null) continue;
        const lat = r.position_lat as number, lon = r.position_long as number;
        const prev = points[points.length - 1];
        if (typeof r.distance === 'number') cum = r.distance;
        else if (prev) cum += haversineKm(prev.lat, prev.lon, lat, lon);
        const alt = typeof r.enhanced_altitude === 'number' ? r.enhanced_altitude : r.altitude;
        const pt: TrackPoint = { lat, lon, d: Math.round(cum * 1e4) / 1e4 };
        if (typeof alt === 'number') pt.a = Math.round(alt * 1e4) / 1e4;
        points.push(pt);
      }
      const sessions = data.sessions as FitSession[] | undefined;
      resolve({ points, session: slimSession(sessions?.[0]) });
    });
  });
}
