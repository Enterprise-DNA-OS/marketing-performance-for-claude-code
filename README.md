# Marketing Performance for Claude Code

See which campaigns overspend, which results have gone stale and which return claims need evidence. An MIT-licensed database and command set for the weekly marketing performance meeting.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Run the demo and import an aggregate campaign CSV. | Your measures, flight rules, reports, history, a web front end or a different stack. | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=salesforce-marketing-cloud-intelligence&utm_source=github&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=salesforce-marketing-cloud-intelligence&utm_source=github&utm_medium=managed) |

## The weekly performance meeting

Five rituals: reconcile the latest results, review spend pacing, inspect cost per acquisition, assign exceptions, and prepare the evidence pack. The fictional Harbour Outdoor and Coastal Supply demo includes overspend, stale social results, missing ownership and an unsupported claim. NZD and AUD never form a combined money total.

## Quick start

Node 20 or later. These commands run on Windows and Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/marketing-performance-for-claude-code.git
cd marketing-performance-for-claude-code
npm install
npm run demo
npm test
node scripts/performance.mjs weekly-review
npm run view
npm run docs
```

Open this folder in Claude Code, Codex, OpenCode or Cursor. Every runtime uses the same commands and database. There are 32 CLI commands including help, and 33 recurring slash recipes including /customise and /new-view.

PGlite stores the demo in .data/db. DATABASE_URL selects Postgres 15 or later with verified TLS. Use a fresh DATA_DIR and migrate without seed for real records. Do not mix demonstration and business records. Embedded mode is single-process. A shared installation requires authenticated operators, restricted database roles and backups. Actor names record attribution, not authenticated identities.

## What it calculates

The supplied [CLI](docs/cli.md) reports cumulative campaign results through today. Cost per acquisition is spend divided by reported conversions. Return on ad spend is reported revenue divided by spend. Zero denominators return unknown, never zero. Pacing compares spend with a straight-line flight budget. Remaining daily budget spreads the remaining amount over days after today, and becomes unknown when the flight ends. Negative remaining budget means overspend. No currency conversion occurs.

Reported conversions can overlap across channels. Revenue is supplied by the exported report, not reconciled to accounting. No identity stitching, attribution model or causal lift is inferred. An imported campaign starts with no owner and a zero budget; assign it and set its actual flight dates and budget before relying on pacing. Source exports determine completeness. A repeat import replaces matching campaign-day values and retains their previous values in append-only activity history. A missing row is not deleted.

## Ten questions beyond a fixed report

Salesforce already offers dashboards and attribution. These are queries shipped here, not a claim that Salesforce cannot answer them.

1. Which campaign is over budget and has no owner? attention
2. Where are we spending without a recorded conversion? zero-return
3. Which campaign has stopped reporting during its flight? stale-feeds
4. Which campaign exceeds its own acquisition-cost target? efficiency
5. How much can each campaign spend per remaining day? pacing
6. What return is reported by channel without mixing currencies? channel-summary
7. Which claim has no evidence or an overdue review? compliance
8. What did a corrected daily result replace? campaign
9. Which report supplied the imported results? imports
10. Which records need a purpose and retention review? compliance

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the performance pack.
2. Show the campaigns that need an owner.
3. Review what has overspent its budget.
4. Check an export without saving it.
5. Import it into a fresh workspace.
6. Set the campaign flight dates and budgets.
7. Compare spend and conversions with the source report.
8. Draft the weekly review for the owner.
9. Add our agreed target with /customise.
10. Add a channel review with /new-view.

## Paperwork and views

brand.json controls the business name, logo and colours. npm run docs creates performance packs, claim evidence records and purpose/retention reviews. npm run view creates the weekly performance desk and evidence review as read-only HTML. Drafts remain in drafts/. [Record checks](docs/compliance.md) distinguish legal context from internal policies. [Why no front end](docs/why-no-front-end.md) describes the screen, mobile and connector boundaries.

## Move from Salesforce Marketing Cloud Intelligence

[The replacement guide](docs/replace-salesforce-marketing-cloud-intelligence.md) defines the campaign-day CSV report, supported fields, dry run, repeat imports and reconciliation. This imports aggregate results, not an entire Salesforce account. Connector configurations, custom calculations, dashboards and attribution models require separate migration work. The free base is a performance desk. Enterprise DNA scopes any additional connections or screens for your version.

## Verification

npm test uses an isolated temporary database, exercises all CLI commands and verifies calculations, currencies, corrections, import rollback, history, documents and exports. CI runs Windows, Linux and Postgres. See [research](docs/research.md) for selection evidence and limitations.

MIT licence. Not affiliated with Salesforce or Anthropic. Hosting and agent usage have separate costs. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=salesforce-marketing-cloud-intelligence&utm_source=github&utm_medium=readme).

