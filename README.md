# Discord Reminder Bot

A simple Node.js bot that sends a reminder to a Discord channel every other day at 20:05 UTC.

## Setup

1.  **Hosted on GitHub**:
    *   This repository is configured with a GitHub Action workflow.
    *   No manual server setup is required.

2.  **Secret Configuration**:
    *   Go to your GitHub Repository Settings > Secrets and variables > Actions.
    *   Create a new repository secret named `DISCORD_WEBHOOK_URL`.
    *   Paste your Discord Webhook URL (for Bear reminders) as the value.
    *   Create another secret named `DISCORD_GENERAL_WEBHOOK_URL`.
    *   Paste your General Channel Webhook URL as the value.

## How it works

*   The workflow (`.github/workflows/reminder.yml`) runs automatically at 20:05 UTC every day.
*   The script (`reminder.js`) calculates if it is a "reminder day" (every 2 days starting from Jan 24, 2026).
*   If it is a reminder day, it sends: `@everyone Reminder : Bear 1 in 5 mins`.

## Local Testing

To test locally, you need Node.js installed.

```bash
# Install dependencies
yarn install

# Run script (requires webhook env var)
# Windows PowerShell
$env:DISCORD_WEBHOOK_URL="YOUR_WEBHOOK_URL"; node reminder.js

# Bash
DISCORD_WEBHOOK_URL="YOUR_WEBHOOK_URL" node reminder.js
```
