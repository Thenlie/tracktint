export interface TrackPoint {
  lat: number;
  lon: number;
  /** cumulative distance in km */
  d?: number;
  /** altitude in km */
  a?: number;
}

/** Subset of the FIT session message we use. Distances in km, times in seconds. */
export interface FitSession {
  start_time?: string | Date;
  sport?: string;
  sub_sport?: string;
  total_distance?: number;
  total_timer_time?: number;
  total_elapsed_time?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_ascent?: number;
  total_descent?: number;
  total_calories?: number;
  max_speed?: number;
}

export interface ParsedTrack {
  points: TrackPoint[];
  session?: FitSession;
}

/** One workout with its GPS points, for the map page. */
export interface Track {
  name: string;
  title: string;
  subtitle: string;
  label: string;
  date: string;
  sport: string;
  id: string;
  startTime: number;
  distance: number;
  timerTime: number;
  elapsedTime: number;
  avgHeartRate: number;
  maxHeartRate: number;
  ascent: number;
  descent: number;
  calories: number;
  maxSpeed: number;
  points: TrackPoint[];
}

/** One workout without GPS, for the dashboard. Distances/ascent in km, times in seconds. */
export interface DashActivity {
  id: string;
  name: string;
  sport: string;
  startTime: number;
  distance: number;
  timerTime: number;
  elapsedTime: number;
  ascent: number;
  calories: number;
  avgHeartRate: number;
}
