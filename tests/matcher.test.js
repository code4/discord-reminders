const { DateTime } = require('luxon');
const { shouldFire } = require('../src/scheduler/matcher');

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeEvent(scheduleOverride, eventOverride = {}) {
  return {
    id: 'test-event',
    name: 'Test Event',
    enabled: true,
    webhook_env: 'TEST_WEBHOOK',
    role_mention: '@everyone',
    message_template: '{role} {event_name}',
    minutes_before: 5,
    timezone: 'UTC',
    extra_vars: {},
    schedule: scheduleOverride,
    ...eventOverride,
  };
}

/** Parse an ISO string into a Luxon UTC DateTime. */
function utc(iso) {
  return DateTime.fromISO(iso, { zone: 'UTC' });
}

// ── Disabled event ────────────────────────────────────────────────────────────

describe('disabled event', () => {
  test('never fires regardless of schedule match', () => {
    const event = makeEvent(
      { type: 'daily', time: '19:00' },
      { enabled: false }
    );
    expect(shouldFire(event, utc('2026-05-20T19:00:00Z'), 5)).toBe(false);
    expect(shouldFire(event, utc('2026-05-20T19:02:00Z'), 5)).toBe(false);
  });
});

// ── Daily schedule ────────────────────────────────────────────────────────────

describe('daily schedule', () => {
  const event = makeEvent({ type: 'daily', time: '19:00' });

  test('fires at the exact scheduled minute', () => {
    expect(shouldFire(event, utc('2026-05-20T19:00:00Z'), 5)).toBe(true);
  });

  test('fires within the window (2 minutes after)', () => {
    expect(shouldFire(event, utc('2026-05-20T19:02:00Z'), 5)).toBe(true);
  });

  test('fires within the window (4 minutes after)', () => {
    expect(shouldFire(event, utc('2026-05-20T19:04:00Z'), 5)).toBe(true);
  });

  test('does NOT fire at the window boundary (5 minutes after)', () => {
    expect(shouldFire(event, utc('2026-05-20T19:05:00Z'), 5)).toBe(false);
  });

  test('does NOT fire before scheduled time', () => {
    expect(shouldFire(event, utc('2026-05-20T18:59:00Z'), 5)).toBe(false);
  });

  test('does NOT fire on the same day but wrong time', () => {
    expect(shouldFire(event, utc('2026-05-20T12:00:00Z'), 5)).toBe(false);
  });
});

// ── Weekly schedule ───────────────────────────────────────────────────────────

describe('weekly schedule', () => {
  const event = makeEvent({
    type: 'weekly',
    days: ['Monday', 'Thursday'],
    time: '20:00',
  });

  // 2026-05-21 = Thursday
  test('fires on Thursday when scheduled', () => {
    expect(shouldFire(event, utc('2026-05-21T20:00:00Z'), 5)).toBe(true);
  });

  // 2026-05-25 = Monday
  test('fires on Monday when scheduled', () => {
    expect(shouldFire(event, utc('2026-05-25T20:00:00Z'), 5)).toBe(true);
  });

  // 2026-05-20 = Wednesday
  test('does NOT fire on Wednesday (not in schedule)', () => {
    expect(shouldFire(event, utc('2026-05-20T20:00:00Z'), 5)).toBe(false);
  });

  // 2026-05-23 = Saturday
  test('does NOT fire on Saturday (not in schedule)', () => {
    expect(shouldFire(event, utc('2026-05-23T20:00:00Z'), 5)).toBe(false);
  });

  test('does NOT fire on a scheduled day at the wrong time', () => {
    expect(shouldFire(event, utc('2026-05-21T15:00:00Z'), 5)).toBe(false);
  });
});

// ── Every-N-days schedule ─────────────────────────────────────────────────────

describe('every_n_days schedule', () => {
  const event = makeEvent({
    type: 'every_n_days',
    interval: 2,
    start_date: '2026-05-20',
    time: '18:55',
  });

  test('fires on the start date (day 0)', () => {
    expect(shouldFire(event, utc('2026-05-20T18:55:00Z'), 5)).toBe(true);
  });

  test('does NOT fire on day 1 (odd day)', () => {
    expect(shouldFire(event, utc('2026-05-21T18:55:00Z'), 5)).toBe(false);
  });

  test('fires on day 2 (even)', () => {
    expect(shouldFire(event, utc('2026-05-22T18:55:00Z'), 5)).toBe(true);
  });

  test('does NOT fire on day 3 (odd)', () => {
    expect(shouldFire(event, utc('2026-05-23T18:55:00Z'), 5)).toBe(false);
  });

  test('fires on day 4 (even)', () => {
    expect(shouldFire(event, utc('2026-05-24T18:55:00Z'), 5)).toBe(true);
  });

  test('does NOT fire before start_date', () => {
    expect(shouldFire(event, utc('2026-05-19T18:55:00Z'), 5)).toBe(false);
  });

  test('fires within window on a fire day', () => {
    expect(shouldFire(event, utc('2026-05-20T18:57:00Z'), 5)).toBe(true);
  });

  test('does NOT fire outside window on a fire day', () => {
    expect(shouldFire(event, utc('2026-05-20T19:00:00Z'), 5)).toBe(false);
  });
});

// ── One-off schedule ──────────────────────────────────────────────────────────

describe('one_off schedule', () => {
  const event = makeEvent({
    type: 'one_off',
    date: '2026-06-15',
    time: '19:50',
  });

  test('fires on the scheduled date within window', () => {
    expect(shouldFire(event, utc('2026-06-15T19:50:00Z'), 5)).toBe(true);
  });

  test('fires within the window (3 minutes after)', () => {
    expect(shouldFire(event, utc('2026-06-15T19:52:00Z'), 5)).toBe(true);
  });

  test('does NOT fire on a different date', () => {
    expect(shouldFire(event, utc('2026-06-14T19:50:00Z'), 5)).toBe(false);
  });

  test('does NOT fire the day after', () => {
    expect(shouldFire(event, utc('2026-06-16T19:50:00Z'), 5)).toBe(false);
  });

  test('does NOT fire outside window on the correct date', () => {
    expect(shouldFire(event, utc('2026-06-15T19:55:00Z'), 5)).toBe(false);
  });
});

// ── Unknown schedule type ─────────────────────────────────────────────────────

describe('unknown schedule type', () => {
  test('returns false without throwing', () => {
    const event = makeEvent({ type: 'fortnightly', time: '10:00' });
    expect(shouldFire(event, utc('2026-05-20T10:00:00Z'), 5)).toBe(false);
  });
});

// ── Config validation (via schema) ────────────────────────────────────────────

describe('config schema validation', () => {
  const { ConfigSchema } = require('../src/config/schema');

  test('accepts a valid daily event', () => {
    const result = ConfigSchema.safeParse({
      window_minutes: 5,
      events: [
        {
          id: 'arena',
          name: 'Arena',
          enabled: true,
          webhook_env: 'DISCORD_WEBHOOK_ARENA',
          message_template: '{role} {event_name}',
          schedule: { type: 'daily', time: '18:55' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects a missing required field (id)', () => {
    const result = ConfigSchema.safeParse({
      events: [
        {
          name: 'Arena',
          enabled: true,
          webhook_env: 'DISCORD_WEBHOOK_ARENA',
          message_template: '{role} {event_name}',
          schedule: { type: 'daily', time: '18:55' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects an invalid time format', () => {
    const result = ConfigSchema.safeParse({
      events: [
        {
          id: 'arena',
          name: 'Arena',
          enabled: true,
          webhook_env: 'DISCORD_WEBHOOK_ARENA',
          message_template: '{role} {event_name}',
          schedule: { type: 'daily', time: '7:30pm' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects an invalid weekday name', () => {
    const result = ConfigSchema.safeParse({
      events: [
        {
          id: 'tac',
          name: 'TAC',
          enabled: true,
          webhook_env: 'DISCORD_WEBHOOK_GENERAL',
          message_template: '{role} {event_name}',
          schedule: { type: 'weekly', days: ['Funday'], time: '20:00' },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('applies defaults for optional fields', () => {
    const result = ConfigSchema.safeParse({
      events: [
        {
          id: 'x',
          name: 'X',
          enabled: true,
          webhook_env: 'WEBHOOK',
          message_template: 'hello',
          schedule: { type: 'daily', time: '10:00' },
        },
      ],
    });
    expect(result.success).toBe(true);
    const event = result.data.events[0];
    expect(event.minutes_before).toBe(5);
    expect(event.timezone).toBe('UTC');
    expect(event.role_mention).toBe('');
    expect(event.extra_vars).toEqual({});
    expect(result.data.window_minutes).toBe(5);
  });
});
