const axios = require('axios');

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('Error: DISCORD_WEBHOOK_URL environment variable is not set.');
    // Don't fail the build in development if checking logic, but for prod this is fatal.
    // However, if we are just testing date logic locally without a webhook, we might want a flag or just log.
    process.exit(1);
  }

  // Start date: January 24, 2026 (UTC)
  // We want to run Today (24th), Skip 25th, Run 26th...
  // Logic: (CurrentDate - StartDate) in days must be even.

  const startDate = new Date('2026-01-24T00:00:00Z');
  const now = new Date();

  // Calculate difference in time
  const diffTime = now.getTime() - startDate.getTime();

  const msPerDay = 1000 * 60 * 60 * 24;

  // Calculate difference in days
  const diffDays = Math.floor(diffTime / msPerDay);

  console.log(`Current Date: ${now.toISOString()}`);
  console.log(`Start Date: ${startDate.toISOString()}`);
  console.log(`Days elapsed: ${diffDays}`);

  // --- RECURRING REMINDER ---
  // Check if even (0, 2, 4...)
  if (diffDays % 2 === 0) {
    console.log('It is a recurring reminder day!');
    if (webhookUrl) {
      console.log('Sending recurring notification...');
      try {
        await axios.post(webhookUrl, {
          content: '@everyone Reminder : Bear 1 in 5 mins'
        });
        console.log('Recurring notification sent successfully.');
      } catch (error) {
        console.error('Failed to send recurring notification:', error.message);
        // We log but don't exit hard yet, so we can try one-offs
      }
    } else {
      console.log('Skipping recurring: DISCORD_WEBHOOK_URL not set.');
    }
  } else {
    console.log('Not a recurring reminder day.');
  }

  // --- ONE-OFF REMINDERS ---
  const generalWebhookUrl = process.env.DISCORD_GENERAL_WEBHOOK_URL;
  const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // List of one-off reminders
  const oneOffs = [
    {
      date: '2026-01-24',
      message: '@everyone Reminder: Bear Hunt Trap 1 at 20:10 UTC. Tri-Alliance Clash at 21:00 UTC today.'
    }
  ];

  const todaysReminder = oneOffs.find(r => r.date === todayStr);

  if (todaysReminder) {
    console.log(`Found one-off reminder for today (${todayStr})!`);
    if (generalWebhookUrl) {
      console.log('Sending one-off notification...');
      try {
        await axios.post(generalWebhookUrl, {
          content: todaysReminder.message
        });
        console.log('One-off notification sent successfully.');
      } catch (error) {
        console.error('Failed to send one-off notification:', error.message);
        process.exit(1);
      }
    } else {
      console.error('Error: One-off reminder found but DISCORD_GENERAL_WEBHOOK_URL not set.');
    }
  } else {
    console.log(`No one-off reminder found for today (${todayStr}).`);
  }
}

main();
