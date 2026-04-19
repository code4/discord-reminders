const { z } = require('zod');

// ── Primitives ────────────────────────────────────────────────────────────────

const TimeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format (e.g. "19:05")');

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format (e.g. "2026-05-20")');

const WeekdayEnum = z.enum([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

// ── Schedule types ────────────────────────────────────────────────────────────

const DailySchedule = z.object({
  type: z.literal('daily'),
  time: TimeString,
});

const WeeklySchedule = z.object({
  type: z.literal('weekly'),
  /** One or more weekday names, e.g. ["Monday", "Thursday"] */
  days: z.array(WeekdayEnum).min(1, 'Provide at least one day'),
  time: TimeString,
});

const EveryNDaysSchedule = z.object({
  type: z.literal('every_n_days'),
  /** How many days between reminders, e.g. 2 for every other day */
  interval: z.number().int().min(1),
  /** The anchor date from which the interval is counted */
  start_date: DateString,
  time: TimeString,
});

const OneOffSchedule = z.object({
  type: z.literal('one_off'),
  /** The single date this reminder fires */
  date: DateString,
  time: TimeString,
});

const ScheduleSchema = z.discriminatedUnion('type', [
  DailySchedule,
  WeeklySchedule,
  EveryNDaysSchedule,
  OneOffSchedule,
]);

// ── Event ─────────────────────────────────────────────────────────────────────

const EventSchema = z.object({
  /** Short unique identifier, used in logs (e.g. "bear1") */
  id: z.string().min(1),
  /** Human-readable name shown in messages */
  name: z.string().min(1),
  /** Set to false to pause this reminder without deleting it */
  enabled: z.boolean(),
  /** Name of the environment variable holding the Discord webhook URL */
  webhook_env: z.string().min(1),
  /** Discord role mention string, e.g. "<@&123456789>" or "@everyone" */
  role_mention: z.string().optional().default(''),
  /**
   * Message template with placeholders:
   *   {role}           → role_mention value
   *   {event_name}     → event name
   *   {time}           → schedule time (HH:MM)
   *   {minutes_before} → minutes_before value
   *   {strategy}       → custom extra_var
   *   ...any key from extra_vars
   */
  message_template: z.string().min(1),
  /** How many minutes before the event this reminder fires (used in templates) */
  minutes_before: z.number().int().min(0).optional().default(5),
  /** IANA timezone string, e.g. "UTC" or "America/New_York" */
  timezone: z.string().optional().default('UTC'),
  /** Optional extra key/value pairs injected into the message template */
  extra_vars: z.record(z.string()).optional().default({}),
  schedule: ScheduleSchema,
});

// ── Top-level config ──────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  /**
   * How many minutes wide the matching window is.
   * Must equal the GitHub Actions cron interval (default: 5).
   */
  window_minutes: z.number().int().min(1).max(60).optional().default(5),
  events: z.array(EventSchema).min(1, 'Define at least one event'),
});

module.exports = { ConfigSchema, EventSchema };
