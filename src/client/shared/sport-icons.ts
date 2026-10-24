// Sport id -> Font Awesome icon name
const SPORT_ICONS: Record<string, string> = {
  running: 'person-running',
  trail_running: 'mountain',
  cycling: 'person-biking',
  e_biking: 'person-biking',
  walking: 'person-walking',
  hiking: 'person-hiking',
  swimming: 'person-swimming',
  alpine_skiing: 'person-skiing',
  cross_country_skiing: 'person-skiing-nordic',
  snowboarding: 'person-snowboarding',
  training: 'dumbbell',
};

/** Font Awesome classes for a sport, e.g. "fa-solid fa-person-running". */
export const sportIconClass = (sport: string): string =>
  `fa-solid fa-${SPORT_ICONS[sport] || 'location-dot'}`;
