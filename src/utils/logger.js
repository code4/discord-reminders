const { DateTime } = require('luxon');

const isDryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

function timestamp() {
  return DateTime.utc().toISO({ suppressMilliseconds: true });
}

const logger = {
  info(msg) {
    console.log(`[${timestamp()}] INFO  ${msg}`);
  },
  warn(msg) {
    console.warn(`[${timestamp()}] WARN  ${msg}`);
  },
  error(msg) {
    console.error(`[${timestamp()}] ERROR ${msg}`);
  },
  debug(msg) {
    if (process.env.DEBUG === 'true') {
      console.log(`[${timestamp()}] DEBUG ${msg}`);
    }
  },
  dryRun(msg) {
    if (isDryRun) {
      console.log(`[${timestamp()}] DRY   ${msg}`);
    }
  },
};

module.exports = logger;
