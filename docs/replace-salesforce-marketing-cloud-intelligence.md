# Replace the campaign performance desk

Salesforce documents [data reports](https://help.salesforce.com/s/articleView?id=mktg.dato_anlyz_reports.htm&language=en_US&type=5) as flat files with chosen dimensions and measurements and a date range, exportable to CSV. This importer targets that configurable campaign-day report. It is not a universal account backup importer.

1. In Marketing Cloud Intelligence, create a data report for one workspace, channel and currency. Select Day, Campaign ID, Campaign Name, Media Cost, Impressions, Clicks, Total Conversions and Revenue. Export at campaign-day grain, with no ad, placement, device or audience breakdown. Use YYYY-MM-DD dates and plain decimal amounts without symbols or thousands separators. Currency is an optional explicit column. Report labels can differ by configuration; map them to the headers below before import.
2. Keep the original CSV and report settings in private storage. Use a fresh DATA_DIR, run npm run migrate, and add a workspace using add-workspace. Never seed the destination.
3. Validate, then import the same file:

```bash
node scripts/performance.mjs import salesforce-marketing-cloud-intelligence --workspace="Harbour Outdoor" --file=imports/campaigns.csv --currency=NZD --channel=Search --actor="Operator" --dry-run
node scripts/performance.mjs import salesforce-marketing-cloud-intelligence --workspace="Harbour Outdoor" --file=imports/campaigns.csv --currency=NZD --channel=Search --actor="Operator"
```

The first command rolls back every write. The second imports in one transaction. The sample in examples/campaign-results.csv is synthetic and shaped to this report contract, not a captured customer export.

| Report field | Stored field | Rule |
|---|---|---|
| Day or Date | day | Real YYYY-MM-DD date |
| Campaign ID | external_id | Required stable identifier, unique within the workspace |
| Campaign Name | name | Required and consistent for the same ID |
| Media Cost or Spend | spend | Nonnegative decimal, at most two places |
| Impressions, Clicks | respective counts | Nonnegative integers |
| Total Conversions or Conversions | conversions | Nonnegative decimal, up to four places |
| Revenue | revenue | Nonnegative decimal, up to two places |
| Currency | validated against workspace | Optional column; --currency is always required |

Both possible aliases for a measure must not be selected together. Extra columns are refused, so personal information and unhandled measures do not silently enter storage. Rows at a finer grain are refused when the same campaign/day occurs twice. Aggregate in the source report first. Export fractional attribution conversions as decimals. Blank values are refused: resolve whether they mean zero or unknown before import.

Campaign ID and day form the repeat-import key. A matching day is replaced, never added. The activity record retains before/after values and the import hash. Missing days remain; this is not a destructive synchronisation. New campaigns get zero budget, no owner and the observed export date range. Set the owner with assign, budget with set-budget and true dates with set-flight. Existing campaign names or channels must match or the entire import rolls back. Reconcile intentional renames through a reviewed mapping change.

Compare campaign count, date coverage, spend, impressions, clicks, conversions and revenue with the source report in the same currency. Check missing days and overlapping attribution. Save the full JSON export privately after reconciliation. Run both reports side by side before ending the vendor subscription.

Does not carry over: connectors and credentials, dashboard definitions, custom formulas, harmonisation rules, identity profiles, attribution models, schedules, attachments or permissions. Source CSV reports can be filtered, so verify completeness. Enterprise DNA handles the agreed mapping and additional migration scope as part of a custom version.

