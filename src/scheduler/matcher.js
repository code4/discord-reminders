const { DateTime } = require('luxon');
const { getSlotKey, atTime } = require('../utils/time');
const logger = require('../utils/logger');

/**
 * Returns true if the given event should fire during the current execution window.
 *
 * Matching strategy — stateless slot comparison:
 *   1. Floor `now` to the nearest windowMinutes boundary → "nowSlot"
 *   2. Compute the event's scheduled DateTime for today → "eventTime"
 *   3. Floor eventTime to the same boundary → "eventSlot"
 *   4. Fire if nowSlot === eventSlot
 *
 * This is deterministic: a given (event, now) pair always produces the same result,
 * so no state file or database is needed. The only risk is a GitHub Actions delay
 * longer than windowMinutes (rare; acceptable for a reminder bot).
 *
 * @param {object}   event         - validated event from config
 * @param {DateTime} now           - current UTC time (Luxon DateTime)
 * @param {number}   windowMinutes - must match the GitHub Actions cron interval
 */
function shouldFire(event, now, windowMinutes = 5) {
  if (!event.enabled) {
    logger.info(`[${event.id}] skipped — disabled`);
    return false;
  }

  const localNow = now.setZone(event.timezone || 'UTC');
  const { schedule } = event;

  switch (schedule.type) {
    case 'daily':
      return checkDaily(event, localNow, windowMinutes);
    case 'weekly':
      return checkWeekly(event, localNow, windowMinutes);
    case 'every_n_days':
      return checkEveryNDays(event, localNow, windowMinutes);
    case 'one_off':
      return checkOneOff(event, localNow, windowMinutes);
    default:
      logger.warn(`[${event.id}] unknown schedule type: "${schedule.type}" — skipped`);
      return false;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** True if nowSlot matches the event's scheduled time slot. */
function slotsMatch(eventId, scheduledTime, now, windowMinutes) {
  const nowSlot = getSlotKey(now, windowMinutes);
  const eventSlot = getSlotKey(scheduledTime, windowMinutes);
  const fires = nowSlot === eventSlot;
  logger.info(
    `[${eventId}] slot check: event=${eventSlot}, now=${nowSlot} → ${fires ? 'FIRE' : 'skip'}`
  );
  return fires;
}

function checkDaily(event, localNow, windowMinutes) {
  const scheduledTime = atTime(localNow, event.schedule.time);
  return slotsMatch(event.id, scheduledTime, localNow, windowMinutes);
}

function checkWeekly(event, localNow, windowMinutes) {
  const { days } = event.schedule;
  // Luxon weekdayLong: "Monday", "Tuesday", …
  const todayName = localNow.weekdayLong;

  if (!days.includes(todayName)) {
    logger.info(
      `[${event.id}] weekly: today is ${todayName}, not in [${days.join(', ')}] — skip`
    );
    return false;
  }

  const scheduledTime = atTime(localNow, event.schedule.time);
  return slotsMatch(event.id, scheduledTime, localNow, windowMinutes);
}

function checkEveryNDays(event, localNow, windowMinutes) {
  const { interval, start_date } = event.schedule;

  const startDay = DateTime.fromISO(start_date, { zone: event.timezone || 'UTC' }).startOf('day');
  const nowDay = localNow.startOf('day');
  const diffDays = Math.round(nowDay.diff(startDay, 'days').days);

  if (diffDays < 0) {
    logger.info(`[${event.id}] every_n_days: start_date ${start_date} is in the future — skip`);
    return false;
  }

  if (diffDays % interval !== 0) {
    logger.info(
      `[${event.id}] every_n_days: day ${diffDays} since start, interval=${interval} — not a fire day`
    );
    return false;
  }

  const scheduledTime = atTime(localNow, event.schedule.time);
  return slotsMatch(event.id, scheduledTime, localNow, windowMinutes);
}

function checkOneOff(event, localNow, windowMinutes) {
  const { date } = event.schedule;
  const todayStr = localNow.toISODate();

  if (date !== todayStr) {
    logger.info(`[${event.id}] one_off: scheduled=${date}, today=${todayStr} — skip`);
    return false;
  }

  const scheduledTime = atTime(localNow, event.schedule.time);
  return slotsMatch(event.id, scheduledTime, localNow, windowMinutes);
}

module.exports = { shouldFire };
