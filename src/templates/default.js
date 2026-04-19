/**
 * Renders a message template by replacing {placeholder} tokens with values.
 *
 * Built-in placeholders (always available):
 *   {role}           → event.role_mention  (e.g. "<@&123456789>" or "@everyone")
 *   {event_name}     → event.name
 *   {time}           → event.schedule.time (HH:MM)
 *   {minutes_before} → event.minutes_before
 *
 * Custom placeholders:
 *   Any key defined in event.extra_vars is also available.
 *   e.g. extra_vars: { "strategy": "Focus on center" } → use {strategy} in template
 *
 * Unknown placeholders are left as-is so missing vars are visible in output.
 */
function renderTemplate(template, event) {
  const vars = {
    role: event.role_mention || '',
    event_name: event.name,
    time: event.schedule.time,
    minutes_before: String(event.minutes_before ?? 5),
    ...event.extra_vars,
  };

  return template.replace(/{(\w+)}/g, (match, key) => {
    return key in vars ? vars[key] : match;
  });
}

module.exports = { renderTemplate };
