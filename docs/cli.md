# CLI reference

All commands run through node scripts/performance.mjs. Flags use --name=value, quote values with spaces, and add --json for machine output. --dry-run and --json are bare switches. Unknown commands, extra flags and positional arguments are refused. Name matching is case-insensitive and UUID prefixes work. Ambiguous matches list candidates and exit 1.

- workspaces
- campaigns
- performance
- pacing
- efficiency
- channel-summary
- stale-feeds
- zero-return
- data-quality
- attention
- compliance
- claims
- imports
- activity
- campaign: --campaign
- weekly-review
- add-workspace: --name, --currency, --owner, --purpose, --review-due, --actor
- add-campaign: --workspace, --external-id, --name, --channel, --owner, --start, --end, --budget, --target-cpa, --actor
- set-budget: --campaign, --budget, --target-cpa, --actor, --note
- set-flight: --campaign, --start, --end, --actor, --note
- assign: --campaign, --owner, --actor
- set-state: --campaign, --state, --actor, --note
- record-day: --campaign, --day, --spend, --impressions, --clicks, --conversions, --revenue, --evidence, --actor
- add-claim: --campaign, --statement, --review-due, --actor
- review-claim: --claim, --evidence, --review-due, --actor
- review-data: --workspace, --purpose, --review-due, --actor
- log: --campaign, --note, --actor
- draft-review: --workspace
- draft-claim: --claim
- import salesforce-marketing-cloud-intelligence: --workspace, --file, --currency, --channel, --actor, --dry-run
- export: --file
- help

All listed value flags are required except target-cpa (add-campaign and set-budget). dry-run is optional and import-only. Target CPA must be positive if supplied. Dates use real YYYY-MM-DD calendar values. Money is nonnegative with up to two decimals, conversions allow four, impressions and clicks are integers. Currency is an explicit three-letter uppercase code. No currency conversion occurs.

Reads use the cumulative results through today; future-dated results are stored but excluded until their day arrives. All campaign result imports must use one row per campaign and day. Review the import guide before using an export. Set-state is a local record status; it does not pause or activate an ad.

Pacing assumes straight-line spend over inclusive flight dates. Remaining daily budget excludes today. CPA and ROAS use ratio-of-sums, not average-of-ratios. A zero denominator returns null. Channel summaries group workspace, channel and currency. Conversion and revenue totals are platform-reported, not deduplicated or accounting-reconciled.

Export writes all six domain collections, including before/after history, to a new JSON file and refuses to overwrite an existing file. Draft commands create uniquely named HTML files. npm run view and npm run docs regenerate read-only outputs. Every write needs an actor except drafts and export, which do not change database records.

