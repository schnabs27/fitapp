/**
 * Computes the UTC instant range [start, end) for a calendar day as seen
 * in a given IANA timezone (e.g. "America/Chicago"). This is how the app
 * decides what "today" means for filtering meals/water — without it, a
 * meal logged at 11pm Central could land on the wrong day once read back
 * in UTC.
 */
export function getZonedDayBoundsUTC(
  timeZone: string,
  referenceDate: Date = new Date(),
  dayOffset = 0,
): { startUTC: Date; endUTC: Date } {
  const { year, month, day } = getZonedYMD(timeZone, referenceDate);

  // Midnight of that Y-M-D, taken naively as if it were UTC, then shift
  // by however many days requested (e.g. -1 for "yesterday").
  const naiveUTCMidnight = new Date(
    Date.UTC(year, month - 1, day + dayOffset, 0, 0, 0),
  );

  // Find out how far that timezone actually sits from UTC at that
  // instant (handles DST automatically), then correct for it.
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, naiveUTCMidnight);
  const startUTC = new Date(naiveUTCMidnight.getTime() - offsetMinutes * 60_000);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  return { startUTC, endUTC };
}

/**
 * Returns a comparable "YYYY-MM-DD" key for a date as seen in a given
 * timezone. Used to compare calendar days (e.g. "is this meal in the
 * future relative to today?") without caring about exact instants.
 */
export function getZonedDateKey(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getZonedYMD(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return (asUTC - date.getTime()) / 60_000;
}
