import { FitSession } from '../types';

export interface TrackName {
  name: string;
  title: string;
  subtitle: string;
  label: string;
  date: string;
}

/** Build display strings (list title, subtitle, tooltip name) for an activity. */
export function formatTrackName(
  session: FitSession | undefined,
  fallback: string,
  activityName?: string,
): TrackName {
  if (!session) {
    const n = activityName ?? fallback;
    return { name: n, title: n, subtitle: '', label: n, date: '' };
  }

  const parts: string[] = [];
  let duration = '';
  let date = '';
  if (activityName) parts.push(activityName);
  if (session.start_time) {
    const start = new Date(session.start_time);
    if (!Number.isNaN(start.getTime())) {
      date = start.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      parts.push(date);
    }
  }
  if (typeof session.total_timer_time === 'number' && session.total_timer_time > 0) {
    const minutes = Math.round(session.total_timer_time / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    duration = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes} min`;
  }

  if (parts.length === 0 && !duration) return { name: fallback, title: fallback, subtitle: '', label: fallback, date: '' };
  const name = parts.join(' · ') || fallback;
  const all = duration ? [...parts, duration] : parts;
  return {
    name, title: all[0], subtitle: all.slice(1).join(' · '),
    label: activityName ?? '', date,
  };
}
