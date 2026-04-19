const axios = require('axios');
const { renderTemplate } = require('../templates/default');
const logger = require('../utils/logger');

/**
 * Sends a single event's reminder message to its configured Discord webhook.
 *
 * @param {object}  event  - validated event config
 * @param {boolean} dryRun - if true, log only, do not send
 * @returns {Promise<boolean>}
 */
async function sendReminder(event, dryRun = false) {
  const webhookUrl = process.env[event.webhook_env];

  if (!webhookUrl) {
    logger.error(
      `[${event.id}] Cannot send — environment variable "${event.webhook_env}" is not set. ` +
        `Add it as a GitHub secret and reference it in the workflow env block.`
    );
    return false;
  }

  const content = renderTemplate(event.message_template, event);

  if (dryRun) {
    logger.info(`[${event.id}] DRY RUN — webhook: ${event.webhook_env}`);
    logger.info(`[${event.id}] DRY RUN — message: ${content}`);
    return true;
  }

  try {
    await axios.post(webhookUrl, { content });
    logger.info(`[${event.id}] Sent → ${content}`);
    return true;
  } catch (err) {
    const status = err.response?.status ?? 'no-response';
    const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(`[${event.id}] Send failed (HTTP ${status}): ${body}`);
    return false;
  }
}

/**
 * Sends multiple events that share the same webhook as one combined Discord message.
 *
 * Each event's rendered message is included on its own line block, separated by a
 * blank line. Role mentions within each template are preserved so each sub-group
 * still gets pinged.
 *
 * Only called when 2+ events fire in the same slot AND target the same channel.
 *
 * @param {object[]} events - two or more events sharing the same webhook_env
 * @param {boolean}  dryRun
 * @returns {Promise<boolean>}
 */
async function sendBatchReminder(events, dryRun = false) {
  const batchId = events.map((e) => e.id).join('+');
  const webhookUrl = process.env[events[0].webhook_env];

  if (!webhookUrl) {
    logger.error(
      `[batch:${batchId}] Cannot send — "${events[0].webhook_env}" is not set.`
    );
    return false;
  }

  // Render each event's template individually so role mentions and custom
  // vars are resolved per event, then join into one message body.
  const lines = events.map((event) => renderTemplate(event.message_template, event));
  const content = lines.join('\n\n');

  if (dryRun) {
    logger.info(`[batch:${batchId}] DRY RUN — webhook: ${events[0].webhook_env}`);
    logger.info(`[batch:${batchId}] DRY RUN — combined message (${events.length} events):`);
    lines.forEach((line, i) => logger.info(`  [${i + 1}] ${line}`));
    return true;
  }

  try {
    await axios.post(webhookUrl, { content });
    logger.info(`[batch:${batchId}] Sent combined message (${events.length} events)`);
    return true;
  } catch (err) {
    const status = err.response?.status ?? 'no-response';
    const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(`[batch:${batchId}] Send failed (HTTP ${status}): ${body}`);
    return false;
  }
}

module.exports = { sendReminder, sendBatchReminder };
