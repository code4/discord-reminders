const path = require('path');
const { DateTime } = require('luxon');
const { loadConfig } = require('./config/loader');
const { shouldFire } = require('./scheduler/matcher');
const { sendReminder, sendBatchReminder } = require('./discord/webhook');
const { getSlotKey } = require('./utils/time');
const logger = require('./utils/logger');

const isDryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

async function main() {
  const configPath =
    process.env.EVENTS_CONFIG || path.resolve(__dirname, '..', 'events.json');

  if (isDryRun) {
    logger.info('══════════════════════════════════════════════');
    logger.info('  DRY RUN MODE — no messages will be sent');
    logger.info('══════════════════════════════════════════════');
  }

  // ── Load config ───────────────────────────────────────────────────────────
  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // ── Determine current slot ────────────────────────────────────────────────
  const now = DateTime.utc();
  const windowMinutes = config.window_minutes;
  const currentSlot = getSlotKey(now, windowMinutes);

  logger.info(`Run start: ${now.toISO()}`);
  logger.info(`Current slot: ${currentSlot} (window=${windowMinutes}min)`);
  logger.info(`Checking ${config.events.length} events`);
  logger.info('──────────────────────────────────────────────');

  // ── Phase 1: collect all events that fire in this slot ────────────────────
  const toFire = [];

  for (const event of config.events) {
    if (shouldFire(event, now, windowMinutes)) {
      // Deterministic trace key — useful for debugging and future deduplication
      const traceKey = `${event.id}:${currentSlot}`;
      logger.info(`[${event.id}] MATCHED — trace key: ${traceKey}`);
      toFire.push(event);
    }
  }

  logger.info('──────────────────────────────────────────────');

  if (toFire.length === 0) {
    logger.info('No events matched this slot.');
    logger.info(`Run complete: fired=0  skipped=${config.events.length}  failed=0`);
    return;
  }

  // ── Phase 2: group by webhook and send ────────────────────────────────────
  // Events sharing the same webhook_env are batched into one Discord message.
  // This reduces channel noise when multiple events fire in the same window.
  const groups = new Map();
  for (const event of toFire) {
    if (!groups.has(event.webhook_env)) groups.set(event.webhook_env, []);
    groups.get(event.webhook_env).push(event);
  }

  let fired = 0;
  let failed = 0;

  for (const [webhookEnv, events] of groups) {
    const isBatch = events.length > 1;

    if (isBatch) {
      logger.info(
        `Sending batch to ${webhookEnv}: [${events.map((e) => e.id).join(', ')}]`
      );
    }

    const ok = isBatch
      ? await sendBatchReminder(events, isDryRun)
      : await sendReminder(events[0], isDryRun);

    if (ok) fired += events.length;
    else failed += events.length;
  }

  const skipped = config.events.length - toFire.length;
  logger.info('──────────────────────────────────────────────');
  logger.info(`Run complete: fired=${fired}  skipped=${skipped}  failed=${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
