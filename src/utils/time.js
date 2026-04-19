const { DateTime } = require('luxon');

/**
 * Returns the current time in the given IANA timezone (defaults to UTC).
 */
function getNow(timezone = 'UTC') {
  return DateTime.now().setZone(timezone);
}

/**
 * Floors a DateTime to the nearest multiple of windowMinutes.
 * e.g. 18:53 with window=5 → 18:50
 */
function floorToSlot(dt, windowMinutes) {
  const minute = Math.floor(dt.minute / windowMinutes) * windowMinutes;
  return dt.set({ minute, second: 0, millisecond: 0 });
}

/**
 * Returns a deterministic slot key string, e.g. "2026-05-20T18:50:00Z".
 * Two times in the same 5-minute window produce the same key.
 */
function getSlotKey(dt, windowMinutes) {
  return floorToSlot(dt, windowMinutes).toUTC().toISO({ suppressMilliseconds: true });
}

/**
 * Given a DateTime and a "HH:MM" string, returns a new DateTime set to that time.
 */
function atTime(dt, timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  return dt.set({ hour, minute, second: 0, millisecond: 0 });
}

module.exports = { getNow, floorToSlot, getSlotKey, atTime };
