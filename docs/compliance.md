# Record checks and their limits

Sources checked 2026-10-25. Run node scripts/performance.mjs compliance. These checks identify missing records for human review. They do not certify legal compliance or judge the quality of evidence.

| Check | Data condition | Source and meaning |
|---|---|---|
| NZ-FTA-substantiation | Claim has no evidence, no reviewer, or a review date at or before today | [Commerce Commission: making accurate claims](https://www.comcom.govt.nz/business/dealing-with-typical-situations/making-accurate-claims/) explains that claims about goods or services need reasonable grounds when made. Recording a reference and reviewer is a workflow aid, not a finding that those grounds exist. |
| NZ-IPP1-IPP9-review | Workspace purpose is blank or review date has arrived | [Privacy principle 1](https://www.privacy.org.nz/privacy-principles/1/) concerns necessary collection for a lawful purpose. [Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits how long personal information is held. Campaign imports reject extra columns to reduce accidental collection; names and notes still require care. |
| INTERNAL-data-quality | Clicks exceed impressions | Internal reconciliation prompt, not a legal rule. Some vendor measures count interactions differently. Check the source. |
| INTERNAL-flight-dates | Results fall outside campaign dates | Internal reconciliation prompt. Imported dates describe the observed export, so set actual flight dates. |

The three-day freshness threshold, straight-line pacing, claim review dates and workspace review dates are internal policies, not statutory periods. Change them with /customise after agreeing the business rule. Review-claim records the operator and supporting reference; it never approves outward publication. Drafts and documents remain internal. Australian businesses must configure their applicable rules separately before relying on this NZ starter checklist.

