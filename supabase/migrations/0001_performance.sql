CREATE FUNCTION touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(trim(name))>0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), owner text NOT NULL, purpose text NOT NULL, review_due date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX workspace_name ON workspaces(lower(name));
CREATE TABLE campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, external_id text NOT NULL, name text NOT NULL, channel text NOT NULL, owner text NOT NULL DEFAULT '',
 starts_on date NOT NULL, ends_on date NOT NULL, budget numeric(18,2) NOT NULL DEFAULT 0 CHECK(budget>=0), target_cpa numeric(18,2) CHECK(target_cpa>0), state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','paused','closed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,external_id), CHECK(ends_on>=starts_on)
);
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces, file_hash text NOT NULL, source text NOT NULL, row_count integer NOT NULL CHECK(row_count>=0), actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE daily_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns, day date NOT NULL,
 spend numeric(18,2) NOT NULL CHECK(spend>=0), impressions bigint NOT NULL CHECK(impressions>=0), clicks bigint NOT NULL CHECK(clicks>=0), conversions numeric(18,4) NOT NULL CHECK(conversions>=0), revenue numeric(18,2) NOT NULL CHECK(revenue>=0), evidence text NOT NULL CHECK(length(trim(evidence))>0), import_id uuid REFERENCES imports,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,day)
);
CREATE TABLE claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns, statement text NOT NULL, evidence text NOT NULL DEFAULT '', review_due date NOT NULL, reviewed_by text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE, actor text NOT NULL, action text NOT NULL, record_id uuid, detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History is append-only'; END $$;
CREATE TRIGGER immutable_activity BEFORE UPDATE OR DELETE ON activity FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER immutable_imports BEFORE UPDATE OR DELETE ON imports FOR EACH ROW EXECUTE FUNCTION immutable_history();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['workspaces','campaigns','daily_results','claims'] LOOP EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated()',t); END LOOP;
 FOREACH t IN ARRAY ARRAY['workspaces','campaigns','daily_results','claims','imports','activity'] LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t); END LOOP;
END $$;
CREATE VIEW campaign_performance AS
 SELECT c.id,c.workspace_id,w.name AS workspace,c.name AS campaign,c.channel,w.currency,c.owner,c.state,c.starts_on,c.ends_on,c.budget,c.target_cpa,
 COALESCE(sum(d.spend),0) AS spend,COALESCE(sum(d.impressions),0) AS impressions,COALESCE(sum(d.clicks),0) AS clicks,COALESCE(sum(d.conversions),0) AS conversions,COALESCE(sum(d.revenue),0) AS revenue,
 round(sum(d.spend)/nullif(sum(d.conversions),0),2) AS cpa,round(sum(d.revenue)/nullif(sum(d.spend),0),2) AS roas,
 round(100.0*sum(d.clicks)/nullif(sum(d.impressions),0),2) AS ctr_percent,max(d.day) AS latest_day
 FROM campaigns c JOIN workspaces w ON w.id=c.workspace_id LEFT JOIN daily_results d ON d.campaign_id=c.id AND d.day<=current_date GROUP BY c.id,w.name,w.currency;
CREATE VIEW campaign_pacing AS
 SELECT p.*,round(budget*greatest(0,least(current_date-starts_on+1,ends_on-starts_on+1))::numeric/(ends_on-starts_on+1),2) AS expected_spend,
 round(spend-budget*greatest(0,least(current_date-starts_on+1,ends_on-starts_on+1))::numeric/(ends_on-starts_on+1),2) AS pace_variance,
 budget-spend AS remaining,CASE WHEN current_date>=ends_on THEN NULL ELSE round((budget-spend)/greatest(1,ends_on-current_date),2) END AS remaining_daily_budget
 FROM campaign_performance p;
CREATE VIEW attention AS
 SELECT id AS campaign_id,'over budget'::text AS issue,campaign,owner,currency,spend-budget AS amount FROM campaign_performance WHERE spend>budget
 UNION ALL SELECT id,'missing owner',campaign,owner,currency,NULL FROM campaign_performance WHERE owner=''
 UNION ALL SELECT id,'stale results',campaign,owner,currency,NULL FROM campaign_performance WHERE state='active' AND starts_on<=current_date AND (latest_day IS NULL OR latest_day<least(current_date,ends_on)-3)
 UNION ALL SELECT id,'above target CPA',campaign,owner,currency,cpa-target_cpa FROM campaign_performance WHERE cpa>target_cpa
 UNION ALL SELECT id,'spend without conversions',campaign,owner,currency,spend FROM campaign_performance WHERE spend>0 AND conversions=0;
CREATE VIEW compliance_findings AS
 SELECT 'NZ-FTA-substantiation'::text AS rule,c.name AS item,'Review the claim and its supporting evidence'::text AS action FROM claims x JOIN campaigns c ON c.id=x.campaign_id WHERE x.evidence='' OR x.reviewed_by IS NULL OR x.review_due<=current_date
 UNION ALL SELECT 'NZ-IPP1-IPP9-review',name,'Review the purpose and retention of any personal information' FROM workspaces WHERE purpose='' OR review_due<=current_date
 UNION ALL SELECT 'INTERNAL-data-quality',c.name,'Check clicks above impressions against the source' FROM daily_results d JOIN campaigns c ON c.id=d.campaign_id WHERE d.clicks>d.impressions
 UNION ALL SELECT 'INTERNAL-flight-dates',c.name,'Check daily results outside the campaign flight dates' FROM daily_results d JOIN campaigns c ON c.id=d.campaign_id WHERE d.day<c.starts_on OR d.day>c.ends_on;
REVOKE ALL ON campaign_performance,campaign_pacing,attention,compliance_findings FROM PUBLIC;
