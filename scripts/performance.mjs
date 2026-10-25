import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,writeOut} from './lib/render.mjs';

export const reads={
 workspaces:'select id,name,currency,owner,purpose,review_due from workspaces order by name',
 campaigns:'select id,campaign,workspace,channel,currency,owner,state,starts_on,ends_on,budget from campaign_performance order by workspace,campaign',
 performance:'select campaign,workspace,currency,spend,conversions,revenue,cpa,roas,latest_day from campaign_performance order by workspace,campaign',
 pacing:'select campaign,currency,budget,spend,expected_spend,pace_variance,remaining,remaining_daily_budget from campaign_pacing order by currency,campaign',
 efficiency:'select campaign,currency,spend,impressions,clicks,ctr_percent,conversions,cpa,target_cpa,roas from campaign_performance order by currency,cpa desc nulls last',
 'channel-summary':'select workspace,channel,currency,sum(spend) as spend,sum(conversions) as conversions,sum(revenue) as revenue,round(sum(revenue)/nullif(sum(spend),0),2) as roas from campaign_performance group by workspace,channel,currency order by workspace,channel',
 'stale-feeds':"select campaign,owner,latest_day,current_date-latest_day as age_days from campaign_performance where state='active' and starts_on<=current_date and (latest_day is null or latest_day<least(current_date,ends_on)-3) order by campaign",
 'zero-return':'select campaign,currency,spend,clicks,conversions,revenue from campaign_performance where spend>0 and conversions=0 order by currency,spend desc',
 'data-quality':"select * from compliance_findings where rule like 'INTERNAL-%' order by rule,item",
 attention:'select issue,campaign,owner,currency,amount from attention order by issue,campaign',
 compliance:'select * from compliance_findings order by rule,item',
 claims:'select x.id,c.name as campaign,x.statement,x.evidence,x.review_due,x.reviewed_by from claims x join campaigns c on c.id=x.campaign_id order by x.created_at,x.id',
 imports:'select i.id,w.name as workspace,i.source,i.file_hash,i.row_count,i.actor,i.created_at from imports i join workspaces w on w.id=i.workspace_id order by i.created_at,i.id',
 activity:'select seq,actor,action,record_id,detail,created_at from activity order by seq'
};
export const specs={...Object.fromEntries(Object.keys(reads).map(x=>[x,[]])),
 campaign:['campaign'], 'weekly-review':[],
 'add-workspace':['name','currency','owner','purpose','review-due','actor'],
 'add-campaign':['workspace','external-id','name','channel','owner','start','end','budget','target-cpa','actor'],
 'set-budget':['campaign','budget','target-cpa','actor','note'],
 'set-flight':['campaign','start','end','actor','note'],
 'assign':['campaign','owner','actor'],
 'set-state':['campaign','state','actor','note'],
 'record-day':['campaign','day','spend','impressions','clicks','conversions','revenue','evidence','actor'],
 'add-claim':['campaign','statement','review-due','actor'],
 'review-claim':['claim','evidence','review-due','actor'],
 'review-data':['workspace','purpose','review-due','actor'],
 log:['campaign','note','actor'],
 'draft-review':['workspace'], 'draft-claim':['claim'],
 import:['workspace','file','currency','channel','actor','dry-run'], export:['file'],help:[]
};
export function parseArgs(args){
 const [cmd='help',...rest]=args;if(!Object.hasOwn(specs,cmd))throw Error(`Unknown command ${cmd}`);
 const o={},pos=[];
 for(const a of rest){if(!a.startsWith('--')){pos.push(a);continue;}const i=a.indexOf('=');const key=a.slice(2,i<0?undefined:i);if(![...specs[cmd],'json'].includes(key))throw Error(`Unknown flag --${key}`);if(Object.hasOwn(o,key))throw Error(`Duplicate flag --${key}`);if(['json','dry-run'].includes(key)){if(i>=0)throw Error(`--${key} is a switch without a value`);o[key]=true;}else{if(i<0)throw Error(`Use --${key}=value`);o[key]=a.slice(i+1);}}
 if((cmd==='import'&&(pos.length!==1||pos[0]!=='salesforce-marketing-cloud-intelligence'))||(cmd!=='import'&&pos.length))throw Error('Unexpected positional arguments; import needs salesforce-marketing-cloud-intelligence');
 return {cmd,o};
}
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();};
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a real YYYY-MM-DD date');return v;}
export function number(v,key,scale=2){v=String(v).trim();if(!new RegExp(`^\\d+(?:\\.\\d{1,${Math.max(1,scale)}})?$`).test(v)||(scale===0&&v.includes('.'))||!Number.isFinite(Number(v))||Number(v)>1e12)throw Error(`Invalid ${key}: use a nonnegative plain number with at most ${scale} decimal places`);return v;}
const currency=v=>{if(!/^[A-Z]{3}$/.test(v))throw Error('Currency must be three uppercase letters');return v;};
async function resolve(db,entity,input){
 const allowed=['workspaces','campaigns','claims'];if(!allowed.includes(entity))throw Error('Invalid entity');
 const col=entity==='claims'?'statement':'name';const rows=await db.query(`select * from ${entity} where id::text=$1 or lower(${col})=lower($1) order by id`,[input]);
 const candidates=rows.length?rows:await db.query(`select * from ${entity} where starts_with(id::text,$1) or strpos(lower(${col}),lower($1))>0 order by id`,[input]);
 if(candidates.length!==1)throw Error(`${entity}: ${candidates.length?'ambiguous':'no match'}. Candidates: ${candidates.map(r=>`${r.id} ${r[col]}`).join('; ')||'(none)'}`);return candidates[0];
}
async function audit(db,actor,action,id,detail){await db.query('insert into activity(actor,action,record_id,detail) values($1,$2,$3,$4)',[actor,action,id,JSON.stringify(detail)]);}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const x=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return x;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function update(db,entity,id,values,actor,action,note=''){
 const before=(await db.query(`select * from ${entity} where id=$1 for update`,[id]))[0];
 const keys=Object.keys(values);const [after]=await db.query(`update ${entity} set ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} where id=$1 returning *`,[id,...Object.values(values)]);
 await audit(db,actor,action,id,{before,after,note});return [after];
}
async function saveDay(db,c,values,actor,importId=null){
 const before=(await db.query('select * from daily_results where campaign_id=$1 and day=$2',[c.id,values.day]))[0];
 const keys=['day','spend','impressions','clicks','conversions','revenue','evidence'];
 const [after]=await db.query(`insert into daily_results(campaign_id,${keys.join(',')},import_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(campaign_id,day) do update set spend=excluded.spend,impressions=excluded.impressions,clicks=excluded.clicks,conversions=excluded.conversions,revenue=excluded.revenue,evidence=excluded.evidence,import_id=excluded.import_id returning *`,[c.id,...keys.map(k=>values[k]),importId]);
 await audit(db,actor,before?'replace-day':'record-day',after.id,{before:before||null,after});return after;
}
function metricValues(o){return {day:date(req(o,'day')),spend:number(req(o,'spend'),'spend'),impressions:number(req(o,'impressions'),'impressions',0),clicks:number(req(o,'clicks'),'clicks',0),conversions:number(req(o,'conversions'),'conversions',4),revenue:number(req(o,'revenue'),'revenue'),evidence:req(o,'evidence')};}
const importColumns=['Day','Date','Campaign ID','Campaign Id','Campaign Name','Media Cost','Spend','Impressions','Clicks','Total Conversions','Conversions','Revenue','Currency'];
async function importCsv(db,o){
 const w=await resolve(db,'workspaces',req(o,'workspace'));const cur=currency(req(o,'currency'));if(cur!==w.currency)throw Error('Import currency does not match workspace; convert and reconcile before import');
 const actor=req(o,'actor'),channel=req(o,'channel'),file=req(o,'file');const input=fs.readFileSync(file,'utf8');const rows=parseCsv(input);if(!rows.length)throw Error('CSV is empty');
 const extra=Object.keys(rows[0]).filter(k=>!importColumns.some(x=>x.toLowerCase()===k.toLowerCase()));if(extra.length)throw Error(`Unsupported columns: ${extra.join(', ')}. Export only campaign-day aggregate fields; no personal information.`);
 for(const aliases of [['Day','Date'],['Media Cost','Spend'],['Total Conversions','Conversions']]){
  if(aliases.every(a=>Object.keys(rows[0]).some(k=>k.toLowerCase()===a.toLowerCase())))throw Error(`Conflicting aliases: ${aliases.join(', ')}`);
 }
 const seen=new Set(),names=new Map();
 const validated=rows.map((r,i)=>{
  const id=pick(r,'Campaign ID').trim(),name=pick(r,'Campaign Name').trim();if(!id||!name)throw Error(`Row ${i+2}: Campaign ID and Campaign Name required`);
  const rowCur=pick(r,'Currency').trim();if(rowCur&&rowCur!==cur)throw Error(`Row ${i+2}: Currency mismatch`);
  const values=metricValues({day:pick(r,'Day','Date'),spend:pick(r,'Media Cost','Spend'),impressions:pick(r,'Impressions'),clicks:pick(r,'Clicks'),conversions:pick(r,'Total Conversions','Conversions'),revenue:pick(r,'Revenue'),evidence:`CSV SHA256 ${createHash('sha256').update(input).digest('hex')}`});
  const key=JSON.stringify([id,values.day]);if(seen.has(key))throw Error(`Duplicate campaign-day at row ${i+2}; aggregate the report to one row per campaign per day`);seen.add(key);
  if(names.has(id)&&names.get(id)!==name)throw Error(`Conflicting campaign names for ${id}`);names.set(id,name);return {id,name,values};
 });
 return transaction(db,async()=>{
  await db.query('select id from workspaces where id=$1 for update',[w.id]);
  const hash=createHash('sha256').update(input).digest('hex');
  const [batch]=await db.query('insert into imports(workspace_id,file_hash,source,row_count,actor) values($1,$2,$3,$4,$5) returning *',[w.id,hash,'Salesforce Marketing Cloud Intelligence CSV',rows.length,actor]);
  let created=0,replaced=0,inserted=0;
  for(const row of validated){
   let [c]=await db.query('select * from campaigns where workspace_id=$1 and external_id=$2',[w.id,row.id]);
   if(c&&(c.channel!==channel||c.name!==row.name))throw Error(`Campaign ${row.id} name/channel differs from existing mapping; reconcile before importing`);
   if(!c){const dates=validated.filter(v=>v.id===row.id).map(v=>v.values.day).sort();[c]=await db.query('insert into campaigns(workspace_id,external_id,name,channel,starts_on,ends_on) values($1,$2,$3,$4,$5,$6) returning *',[w.id,row.id,row.name,channel,dates[0],dates.at(-1)]);created++;await audit(db,actor,'import-campaign',c.id,{after:c,review:'Set actual flight dates, owner and budget'});}
   const existing=await db.query('select id from daily_results where campaign_id=$1 and day=$2',[c.id,row.values.day]);if(existing.length)replaced++;else inserted++;
   await saveDay(db,c,row.values,actor,batch.id);
  }
  await audit(db,actor,'import',batch.id,{hash,created,inserted,replaced});return [{dry_run:!!o['dry-run'],campaigns_created:created,days_inserted:inserted,days_replaced:replaced,rows:rows.length,hash}];
 },!!o['dry-run']);
}
export async function execute(db,args){
 const {cmd,o}=parseArgs(args);
 if(cmd==='help')return Object.entries(specs).map(([command,flags])=>({command,flags:flags.map(k=>`--${k}`).join(' ')}));
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='weekly-review')return {pacing:await db.query(reads.pacing),attention:await db.query(reads.attention),compliance:await db.query(reads.compliance)};
 if(cmd==='campaign'){const c=await resolve(db,'campaigns',req(o,'campaign'));return {campaign:c,results:await db.query('select * from daily_results where campaign_id=$1 order by day',[c.id]),claims:await db.query('select * from claims where campaign_id=$1 order by created_at',[c.id]),history:await db.query("select * from activity where record_id=$1 or detail->'after'->>'campaign_id'=$2 order by seq",[c.id,c.id])};}
 if(cmd==='import')return importCsv(db,o);
 if(cmd==='export'){
  const file=path.resolve(req(o,'file'));const out={format:'marketing-performance-v1',at:new Date().toISOString()};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of ['workspaces','campaigns','daily_results','claims','imports','activity'])out[t]=await db.query(`select * from ${t} order by id`);}finally{await db.exec('ROLLBACK');}
  fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});return [{file,records:Object.values(out).filter(Array.isArray).reduce((n,a)=>n+a.length,0)}];
 }
 if(cmd==='draft-review'){
  const w=await resolve(db,'workspaces',req(o,'workspace'));const sections=[{title:'Campaign performance',html:table(await db.query('select campaign,currency,spend,conversions,cpa,roas,latest_day from campaign_performance where workspace_id=$1 order by campaign',[w.id]))},{title:'Spend pacing',html:table(await db.query('select campaign,currency,budget,spend,pace_variance,remaining from campaign_pacing where workspace_id=$1 order by campaign',[w.id]))},{title:'Attention',html:table(await db.query('select a.* from attention a join campaigns c on c.id=a.campaign_id where c.workspace_id=$1 order by a.issue',[w.id]),['issue','campaign','owner','currency','amount'])}];
  return [{file:writeOut('drafts',`weekly-${w.id}-${randomUUID()}`,page({title:'Draft performance review',subtitle:`${w.name}. Reported conversions can overlap across channels. Human review required.`,sections}))}];
 }
 if(cmd==='draft-claim'){const x=await resolve(db,'claims',req(o,'claim'));return [{file:writeOut('drafts',`claim-${x.id}-${randomUUID()}`,page({title:'Draft claim evidence review',subtitle:'Internal review only. Nothing is approved or sent.',sections:[{title:'Claim and evidence',html:table([x],['statement','evidence','review_due','reviewed_by'])}]}))}];}
 return transaction(db,async()=>{
  const actor=req(o,'actor');
  if(cmd==='add-workspace'){const [x]=await db.query('insert into workspaces(name,currency,owner,purpose,review_due) values($1,$2,$3,$4,$5) returning *',[req(o,'name'),currency(req(o,'currency')),req(o,'owner'),req(o,'purpose'),date(req(o,'review-due'))]);await audit(db,actor,cmd,x.id,{after:x});return [x];}
  if(cmd==='add-campaign'){
   const w=await resolve(db,'workspaces',req(o,'workspace'));const start=date(req(o,'start')),end=date(req(o,'end'));if(end<start)throw Error('End must follow start');
   const target=o['target-cpa']?number(o['target-cpa'],'target CPA'):null;
   const [x]=await db.query('insert into campaigns(workspace_id,external_id,name,channel,owner,starts_on,ends_on,budget,target_cpa) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',[w.id,req(o,'external-id'),req(o,'name'),req(o,'channel'),req(o,'owner'),start,end,number(req(o,'budget'),'budget'),target]);await audit(db,actor,cmd,x.id,{after:x});return [x];
  }
  if(cmd==='review-data'){const w=await resolve(db,'workspaces',req(o,'workspace'));return update(db,'workspaces',w.id,{purpose:req(o,'purpose'),review_due:date(req(o,'review-due'))},actor,cmd);}
  if(cmd==='review-claim'){const x=await resolve(db,'claims',req(o,'claim'));return update(db,'claims',x.id,{evidence:req(o,'evidence'),review_due:date(req(o,'review-due')),reviewed_by:actor},actor,cmd);}
  const c=await resolve(db,'campaigns',req(o,'campaign'));
  if(cmd==='set-budget'){const v={budget:number(req(o,'budget'),'budget')};if(o['target-cpa'])v.target_cpa=number(o['target-cpa'],'target CPA');return update(db,'campaigns',c.id,v,actor,cmd,req(o,'note'));}
  if(cmd==='assign')return update(db,'campaigns',c.id,{owner:req(o,'owner')},actor,cmd);
  if(cmd==='set-flight'){const start=date(req(o,'start')),end=date(req(o,'end'));if(end<start)throw Error('End must follow start');return update(db,'campaigns',c.id,{starts_on:start,ends_on:end},actor,cmd,req(o,'note'));}
  if(cmd==='set-state'){const state=req(o,'state');if(!['active','paused','closed'].includes(state))throw Error('State must be active, paused or closed');return update(db,'campaigns',c.id,{state},actor,cmd,req(o,'note'));}
  if(cmd==='record-day'){await db.query('select id from campaigns where id=$1 for update',[c.id]);return [await saveDay(db,c,metricValues(o),actor)];}
  if(cmd==='add-claim'){const [x]=await db.query('insert into claims(campaign_id,statement,review_due) values($1,$2,$3) returning *',[c.id,req(o,'statement'),date(req(o,'review-due'))]);await audit(db,actor,cmd,x.id,{after:x});return [x];}
  if(cmd==='log'){const note=req(o,'note');await audit(db,actor,cmd,c.id,{note});return [{campaign:c.name,note}];}
  throw Error(`Unimplemented command ${cmd}`);
 });
}
export function format(result){if(Array.isArray(result))return result.length?textTable(result,Object.keys(result[0]).map(key=>({key,label:key,format:v=>typeof v==='object'?JSON.stringify(v):v}))):'(none)';return Object.entries(result).map(([k,v])=>`${k}\n${format(Array.isArray(v)?v:[v])}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const a=process.argv.slice(2);parseArgs(a);db=await getDb();const out=await execute(db,a);console.log(a.includes('--json')?JSON.stringify(out,null,2):format(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
