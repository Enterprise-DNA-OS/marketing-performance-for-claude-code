---
description: add campaign from the campaign performance records
---

Read CLAUDE.md and docs/cli.md. 
Run node scripts/performance.mjs add-campaign with the required arguments: --workspace, --external-id, --name, --channel, --owner, --start, --end, --budget, --target-cpa, --actor and --json. Use existing records for IDs and names. Never guess a missing amount, actor, date or evidence reference.

Present the returned records, any missing data and the next review action.

Amounts remain in their recorded currency. Reported conversions can overlap. Changes affect local records only. Nothing sends, publishes, changes an ad account or authorises a spend. Drafts remain in drafts/.
