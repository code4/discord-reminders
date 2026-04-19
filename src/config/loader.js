const fs = require('fs');
const path = require('path');
const { ConfigSchema } = require('./schema');
const logger = require('../utils/logger');

/**
 * Loads, parses, and validates events.json at the given path.
 * Throws a descriptive error if the file is missing, malformed, or invalid.
 */
function loadConfig(configPath) {
  const resolved = path.resolve(configPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse config JSON (${resolved}): ${err.message}`);
  }

  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • events[${i.path.join('.')}]: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${issues}`);
  }

  const { data } = result;
  const enabledCount = data.events.filter((e) => e.enabled).length;
  logger.info(
    `Config loaded: ${data.events.length} events total, ${enabledCount} enabled, window=${data.window_minutes}min`
  );

  return data;
}

module.exports = { loadConfig };
