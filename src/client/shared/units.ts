export type Unit = 'mi' | 'km';

export const KM_TO_MI = 0.621371;
export const KM_TO_FT = 3280.84;
export const KM_TO_M = 1000;

const STORAGE_KEY = 'units';

function loadUnit(): Unit {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'km') return 'km';
  } catch {
    // storage unavailable (private mode); fall back to default
  }
  return 'mi';
}

let unit: Unit = loadUnit();

export const getUnit = (): Unit => unit;
export const isMi = (): boolean => unit === 'mi';

export function setUnit(next: Unit): void {
  unit = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore: preference just won't persist
  }
}

/** Multiplier from km to the current distance unit. */
export const distMul = (): number => (isMi() ? KM_TO_MI : 1);

/** Multiplier from km to the current elevation unit (ft or m). */
export const elevMul = (): number => (isMi() ? KM_TO_FT : KM_TO_M);

export const elevUnit = (): string => (isMi() ? 'ft' : 'm');

/** Format an elevation given in km, e.g. "1,234 ft". */
export const fmtElev = (km: number): string =>
  `${Math.round(km * elevMul()).toLocaleString()} ${elevUnit()}`;
