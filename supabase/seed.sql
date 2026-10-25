INSERT INTO workspaces(id,name,currency,owner,purpose,review_due) VALUES
 ('10000000-0000-0000-0000-000000000001','Harbour Outdoor','NZD','Mia','Aggregate campaign reporting only',current_date-2),
 ('10000000-0000-0000-0000-000000000002','Coastal Supply','AUD','Lee','Aggregate campaign reporting only',current_date+90) ON CONFLICT DO NOTHING;
INSERT INTO campaigns(id,workspace_id,external_id,name,channel,owner,starts_on,ends_on,budget,target_cpa) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','NZ-SEARCH','Spring Search','Search','Mia',current_date-14,current_date+15,3000,40),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','NZ-SOCIAL','Spring Social','Social','',current_date-14,current_date+15,1000,50),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','AU-SEARCH','Coastal Search','Search','Lee',current_date-14,current_date+15,2000,35) ON CONFLICT DO NOTHING;
INSERT INTO daily_results(id,campaign_id,day,spend,impressions,clicks,conversions,revenue,evidence) VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,1800,40000,1200,60,7200,'demo:search-export'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',current_date-8,1250,30000,450,0,0,'demo:social-export'),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003',current_date-1,900,18000,600,10,1600,'demo:coastal-export') ON CONFLICT DO NOTHING;
INSERT INTO claims(id,campaign_id,statement,evidence,review_due) VALUES
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Our best return this season','',current_date-1) ON CONFLICT DO NOTHING;
