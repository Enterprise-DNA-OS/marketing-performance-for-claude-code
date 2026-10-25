# Marketing Performance for Claude Code

A campaign performance record system for one operator. Read data from scripts/performance.mjs before answering. Never invent prices, conversions, attribution, evidence or an operator's approval.

Run the matching recipe in .claude/commands/. Every CLI command accepts --json. Read docs/cli.md for arguments and calculations. Ambiguous matches list candidates and exit 1. Actor names are attribution, not authentication.

The five weekly rituals are reconcile results, review pacing, review efficiency, assign exceptions and draft the review. /weekly-review combines pacing, attention and compliance. Import aggregate campaign-day exports only. Read the replacement guide before importing. Preserve original exports privately. Use a dry run first. Repeat imports replace matching values with an audit trail; they do not add amounts or delete absent rows.

Never combine currencies. Never describe reported conversions as unique customers or reported revenue as audited profit. No ad budget or status command here changes an advertising account. They update local records only. Never send, activate campaigns, connect external systems, publish or delete records from these recipes. Drafts stay in drafts/.

- /workspaces: node scripts/performance.mjs workspaces
- /campaigns: node scripts/performance.mjs campaigns
- /performance: node scripts/performance.mjs performance
- /pacing: node scripts/performance.mjs pacing
- /efficiency: node scripts/performance.mjs efficiency
- /channel-summary: node scripts/performance.mjs channel-summary
- /stale-feeds: node scripts/performance.mjs stale-feeds
- /zero-return: node scripts/performance.mjs zero-return
- /data-quality: node scripts/performance.mjs data-quality
- /attention: node scripts/performance.mjs attention
- /compliance: node scripts/performance.mjs compliance
- /claims: node scripts/performance.mjs claims
- /imports: node scripts/performance.mjs imports
- /activity: node scripts/performance.mjs activity
- /campaign: node scripts/performance.mjs campaign
- /weekly-review: node scripts/performance.mjs weekly-review
- /add-workspace: node scripts/performance.mjs add-workspace
- /add-campaign: node scripts/performance.mjs add-campaign
- /set-budget: node scripts/performance.mjs set-budget
- /set-flight: node scripts/performance.mjs set-flight
- /assign: node scripts/performance.mjs assign
- /set-state: node scripts/performance.mjs set-state
- /record-day: node scripts/performance.mjs record-day
- /add-claim: node scripts/performance.mjs add-claim
- /review-claim: node scripts/performance.mjs review-claim
- /review-data: node scripts/performance.mjs review-data
- /log: node scripts/performance.mjs log
- /draft-review: node scripts/performance.mjs draft-review
- /draft-claim: node scripts/performance.mjs draft-claim
- /import: node scripts/performance.mjs import salesforce-marketing-cloud-intelligence
- /export: node scripts/performance.mjs export
- /customise: add and test a numbered migration, then apply within the operator's authorised change.
- /new-view: add a read-only report using views.json.

Use synthetic records for testing. Never seed a working database. Read docs/compliance.md before explaining record checks. The checks flag missing evidence and review dates; they do not establish legal compliance. Local embedded mode is single-process. Shared deployments require authentication, least-privilege database roles, backup restore tests and access review.

Omni by Enterprise DNA installs, customises and runs this system. https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=salesforce-marketing-cloud-intelligence&utm_source=github&utm_medium=instructions

