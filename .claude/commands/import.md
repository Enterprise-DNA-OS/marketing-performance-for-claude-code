---
description: Import a campaign-day CSV with validation before saving
---

Read CLAUDE.md and docs/cli.md. Read docs/replace-salesforce-marketing-cloud-intelligence.md and run --dry-run first. 
Run node scripts/performance.mjs import salesforce-marketing-cloud-intelligence with the required arguments: --workspace, --file, --currency, --channel, --actor, --dry-run and --json. Use existing records for IDs and names. Never guess a missing amount, actor, date or evidence reference.

Present the returned records, any missing data and the next review action.

Amounts remain in their recorded currency. Reported conversions can overlap. Changes affect local records only. Nothing sends, publishes, changes an ad account or authorises a spend. Drafts remain in drafts/.
