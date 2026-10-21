import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { convert } from 'html-to-text';
import { parseCsv, pick } from './csv.mjs';
import { REPO_ROOT } from './db.mjs';

export const questions = [
 ['Which heavily read articles have overdue reviews?',"select title,owner,views,review_due from article_register where status='active' and review_due<current_date order by views desc"],
 ['Which articles combine negative ratings with unresolved corrections?',"select title,thumbs_down,open_feedback from article_register where thumbs_down>0 and open_feedback>0 order by thumbs_down desc"],
 ['Who carries the largest overdue review queue?',"select * from owner_workload order by reviews_due desc,owner"],
 ['Which current articles depend on a former employee?',"select a.title,o.name as former_owner from articles a join authors o on o.id=a.owner_id where not o.active and a.status<>'archived' order by a.title"],
 ['Which personal-information articles need a retention decision?',"select title,status,purpose,retention_review from articles where privacy_class='personal' and (purpose='' or retention_review is null or retention_review<=current_date) order by title"],
 ['Which search phrases repeatedly return no answer?',"select phrase,count(*)::int as unanswered from searches where hits=0 group by phrase order by unanswered desc,phrase"],
 ['Which imported articles have no usable body?',"select title,collection,body_characters from article_register where body_characters=0 order by title"],
 ['Which active revisions have no recorded approval?',"select title,revision,approved_revision from article_register where status='active' and approved_revision is distinct from revision order by title"],
 ['Which categories hold the most open reader corrections?',"select a.category,count(*)::int as corrections from feedback f join articles a on a.id=f.article_id where f.status='open' group by a.category order by corrections desc,a.category"],
 ['Which correction requests have waited more than a week?',"select a.title,f.note,current_date-f.created_at::date as days_waiting from feedback f join articles a on a.id=f.article_id where f.status='open' and f.created_at<now()-interval '7 days' order by f.created_at"]
];
export const reads={
 collections:'select * from collections order by name', authors:'select id,name,active from authors order by name', articles:'select * from article_register order by title',
 'review-queue':'select title,owner,status,revision,review_due from review_queue order by review_due nulls first,title',
 attention:'select title,owner,reason,priority from attention order by priority,title,reason',
 performance:'select * from content_performance order by views desc,title',workload:'select * from owner_workload order by reviews_due desc,owner',
 feedback:"select f.id,a.title,f.priority,f.status,f.note,f.resolution from feedback f join articles a on a.id=f.article_id order by f.created_at",
 'search-gaps':"select phrase,count(*)::int as searches,max(searched_at) as last_searched from searches where hits=0 group by phrase order by searches desc,phrase",
 compliance:'select title,rule,finding,source from compliance_findings order by rule,title',
 activity:'select actor,action,article_id,detail,created_at from activity order by created_at desc,id limit 100'
};
export const help={help:"help",...Object.fromEntries(Object.keys(reads).map(k=>[k,k])),article:'article <id-or-title>',search:'search <words>',insights:'insights',
 'add-collection':'add-collection --name=Name', 'add-author':'add-author --name=Name', 'set-author':'set-author <name> --active=true|false',
 add:'add --collection=Name --title=Title --owner=Name --body-file=path --actor=Name',
 assign:'assign <article> --owner=Name --actor=Name', revise:'revise <article> --body-file=path --note=Reason --actor=Name',
 review:'review <article> --decision=approved|changes --evidence=Text --due=YYYY-MM-DD --actor=Name',
 classify:'classify <article> --class=none|personal --purpose=Text --retention=YYYY-MM-DD --accuracy-checked=true --actor=Name',
 activate:'activate <article> --actor=Name',archive:'archive <article> --reason=Text --actor=Name',
 'log-feedback':'log-feedback <article> --note=Text --priority=normal|urgent --actor=Name',
 resolve:'resolve <feedback-id> --note=Resolution --actor=Name',
 'log-search':'log-search --phrase=Text --hits=0',
 import:'import knowledgeowl <csv> --collection=Name [--content-dir=extracted-html] [--manifest=paths.json] [--dry-run] --actor=Name',
 export:'export [--out=exports/backup.json]', 'draft-review':'draft-review <article>', 'weekly-review':'weekly-review'
};
const required=(v,label)=>{if(v===undefined||v===null||String(v).trim()==='')throw Error(`${label} is required`);return String(v).trim();};
const date=(v,label)=>{required(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)!==v)throw Error(`${label} must be a real YYYY-MM-DD date`);return v;};
const integer=(v,label)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error(`${label} must be a nonnegative integer`);return Number(v);};
export async function resolve(db,table,input,label='name') {
 if(!['articles','collections','authors','feedback'].includes(table))throw Error('Unknown record type');
 const q=required(input,'Record');const col=table==='articles'?'title':label;
 const exact=table==='feedback'?[]:await db.query(`select * from ${table} where lower(${col})=lower($1)`,[q]);
 const rows=exact.length?exact:await db.query(`select * from ${table} where id::text like $1 ${table==='feedback'?'':`or strpos(lower(${col}),lower($2))>0`} order by id`,table==='feedback'?[q+'%']:[q+'%',q]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous record; choose an ID:\n${rows.map(r=>`${r.id}  ${r[col]||r.note}`).join('\n')}`:`No ${table} record matches ${q}`);
 return rows[0];
}
const audit=(db,id,actor,action,detail={})=>db.query('insert into activity(article_id,actor,action,detail) values($1,$2,$3,$4)',[id,required(actor,'actor'),action,JSON.stringify(detail)]);
async function transaction(db,fn){await db.exec('BEGIN');try{const out=await fn();await db.exec('COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function readArticle(db,input){const a=await resolve(db,'articles',input);return {article:a,revisions:await db.query('select * from revisions where article_id=$1 order by version',[a.id]),reviews:await db.query('select * from reviews where article_id=$1 order by created_at',[a.id]),feedback:await db.query('select * from feedback where article_id=$1 order by created_at',[a.id])};}
function writePrivate(file,body){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,body,{mode:0o600});fs.chmodSync(file,0o600);return file;}
function filesUnder(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Content export must not contain symbolic links');if(e.isDirectory()){if(!['files','videos','images'].includes(e.name.toLowerCase()))out.push(...filesUnder(p));}else if(/\.html?$/i.test(e.name))out.push(p);}return out;}
export async function importKnowledge(db,file,o){
 const c=await resolve(db,'collections',required(o.collection,'collection'));const raw=fs.readFileSync(file,'utf8');const rows=parseCsv(raw);if(!rows.length)throw Error('CSV contains no articles');
 const actor=required(o.actor,'actor');const root=o['content-dir']?fs.realpathSync(o['content-dir']):null;const files=root?filesUnder(root):[];
 const manifest=o.manifest?JSON.parse(fs.readFileSync(o.manifest,'utf8')):{};
 const seen=new Set();const used=new Set();
 const prepared=rows.map((r,i)=>{
  const id=required(pick(r,'Article ID'),`row ${i+2} Article ID`);if(seen.has(id))throw Error(`Duplicate Article ID ${id}`);seen.add(id);
  const title=required(pick(r,'Article Title'),`row ${i+2} Article Title`);const status=pick(r,'Status').toLowerCase();
  const statuses={published:'active',draft:'draft','ready for review':'ready',archived:'archived',deleted:'archived'};
  if(!(status in statuses))throw Error(`Unsupported Status ${status}; map explicitly before importing`);
  const permalink=pick(r,'Permalink');let html='';let contentPath=null;
  if(root){
   let matches;
   if(manifest[id]){const p=fs.realpathSync(path.resolve(root,manifest[id]));if(!p.startsWith(root+path.sep)||!files.includes(p))throw Error(`Unsafe or unsupported manifest path for ${id}`);matches=[p];}
   else matches=files.filter(p=>[id,permalink].filter(Boolean).some(n=>path.basename(p,path.extname(p))===n));
   if(matches.length!==1)throw Error(`Article ${id}: ${matches.length} HTML matches; provide --manifest with Article ID to relative HTML path`);
   contentPath=matches[0];if(used.has(contentPath))throw Error('Two articles map to one HTML file');used.add(contentPath);html=fs.readFileSync(contentPath,'utf8');
  }
  return {id,title,status:statuses[status],permalink,author:pick(r,'Author'),category:pick(r,'Breadcrumbs','Category')||'Uncategorised',source_status:pick(r,'Status'),visibility:pick(r,'Visibility'),url:pick(r,'View Article Link'),modified:pick(r,'Date Modified'),views:integer(pick(r,'Total Views')||'0','Total Views'),up:integer(pick(r,'Thumbs Up')||'0','Thumbs Up'),down:integer(pick(r,'Thumbs Down')||'0','Thumbs Down'),html,body:html?convert(html,{wordwrap:false,selectors:[{selector:'img',format:'skip'},{selector:'script',format:'skip'},{selector:'style',format:'skip'}]}):'',raw:r};
 });
 const digest=crypto.createHash('sha256').update(JSON.stringify(prepared)).digest('hex');
 if((await db.query('select id from imports where collection_id=$1 and digest=$2',[c.id,digest])).length)return {unchanged:true,articles:prepared.length};
 const ids=prepared.map(r=>r.id);const conflicts=await db.query('select external_id from articles where collection_id=$1 and external_id=any($2::text[])',[c.id,ids]);
 if(conflicts.length)throw Error(`Existing articles would be overwritten: ${conflicts.map(x=>x.external_id).join(', ')}. Use revise for later changes.`);
 const summary={articles:prepared.length,with_content:prepared.filter(r=>r.body.trim()).length,metadata_only:prepared.filter(r=>!r.body.trim()).length,dry_run:!!o['dry-run'],unmatched_html:files.length-used.size};
 if(o['dry-run'])return summary;
 return transaction(db,async()=>{for(const r of prepared){let owner=null;if(r.author){owner=(await db.query('insert into authors(name) values($1) on conflict(name) do update set name=excluded.name returning id',[r.author]))[0].id;}
  const a=(await db.query(`insert into articles(collection_id,external_id,title,category,permalink,owner_id,status,source_status,source_visibility,source_url,views,thumbs_up,thumbs_down,source_modified,source_data) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,[c.id,r.id,r.title,r.category,r.permalink,owner,r.status,r.source_status,r.visibility,r.url,r.views,r.up,r.down,r.modified,JSON.stringify(r.raw)]))[0];
  await db.query('insert into revisions(article_id,version,body,original_html,editor,note) values($1,1,$2,$3,$4,$5)',[a.id,r.body,r.html,actor,'Imported current content; prior version history not supplied']);await audit(db,a.id,actor,'import',{external_id:r.id,content:!!r.body});
 }
 await db.query('insert into imports(collection_id,digest,row_count) values($1,$2,$3)',[c.id,digest,prepared.length]);return summary;});
}
export async function run(db,cmd,args=[],o={}) {
 if(cmd==='help')return help;
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='article')return readArticle(db,args[0]);
 if(cmd==='search'){const q=required(args.join(' '),'Search words');return db.query("select a.id,a.title,a.status,r.body from articles a join revisions r on r.article_id=a.id and r.version=a.revision where a.status='active' and (strpos(lower(a.title),lower($1))>0 or strpos(lower(r.body),lower($1))>0) order by a.title",[q]);}
 if(cmd==='insights'){const out=[];for(const [question,sql] of questions)out.push({question,rows:await db.query(sql)});return out;}
 if(cmd==='import'){if(args[0]!=='knowledgeowl')throw Error('Supported import: knowledgeowl');return importKnowledge(db,required(args[1],'CSV file'),o);}
 if(cmd==='export'){const backup={format:'knowledge-operations-v1',exported_at:new Date().toISOString(),records:{}};for(const t of ['collections','authors','articles','revisions','reviews','feedback','searches','activity','imports'])backup.records[t]=await db.query(`select * from ${t} order by id`);const file=path.resolve(o.out||path.join(process.env.OUTPUT_DIR||REPO_ROOT,'exports',`knowledge-${Date.now()}.json`));return {file:writePrivate(file,JSON.stringify(backup,null,2)+'\n')};}
 if(cmd==='draft-review'||cmd==='weekly-review'){let content;if(cmd==='draft-review'){const a=await readArticle(db,args[0]);content='# Article review packet\n\n'+JSON.stringify(a,null,2);}else{content='# Weekly knowledge review\n\n';for(const k of ['attention','review-queue','compliance'])content+=`## ${k}\n\n${JSON.stringify(await run(db,k),null,2)}\n\n`;}
 const file=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts',`${cmd}-${crypto.randomUUID()}.md`);return {file:writePrivate(file,content+'\n'),sent:false};}
 if(cmd==='add-collection'||cmd==='add-author'){const t=cmd==='add-author'?'authors':'collections';return db.query(`insert into ${t}(name) values($1) returning *`,[required(o.name,'name')]);}
 if(cmd==='log-search')return db.query('insert into searches(phrase,hits) values($1,$2) returning id,phrase,hits',[required(o.phrase,'phrase'),integer(o.hits,'hits')]);
 if(cmd==='set-author'){if(!['true','false'].includes(o.active))throw Error('active must be true or false');const a=await resolve(db,'authors',args[0]);return db.query('update authors set active=$1 where id=$2 returning name,active',[o.active==='true',a.id]);}
 const actor=required(o.actor,'actor');
 if(cmd==='add')return transaction(db,async()=>{const c=await resolve(db,'collections',o.collection),owner=await resolve(db,'authors',o.owner);if(!owner.active)throw Error('Owner is inactive');const body=fs.readFileSync(required(o['body-file'],'body-file'),'utf8');required(body,'body');const a=(await db.query('insert into articles(collection_id,title,owner_id,category) values($1,$2,$3,$4) returning *',[c.id,required(o.title,'title'),owner.id,o.category||'Uncategorised']))[0];await db.query('insert into revisions(article_id,version,body,editor) values($1,1,$2,$3)',[a.id,body,actor]);await audit(db,a.id,actor,'add');return a;});
 if(cmd==='resolve')return transaction(db,async()=>{const f=await resolve(db,'feedback',args[0]);if(f.status==='resolved')throw Error('Feedback already resolved');const out=await db.query("update feedback set status='resolved',resolution=$1 where id=$2 returning *",[required(o.note,'note'),f.id]);await audit(db,f.article_id,actor,'resolve-feedback',{feedback_id:f.id});return out;});
 if(!['assign','revise','review','classify','activate','archive','log-feedback'].includes(cmd))throw Error(`Unknown command ${cmd}; use help`);
 return transaction(db,async()=>{let a=await resolve(db,'articles',args[0]);a=(await db.query('select * from articles where id=$1 for update',[a.id]))[0];
 if(a.status==='archived'&&!['classify','assign'].includes(cmd))throw Error('Archived article cannot be edited or activated');
 let result;
 if(cmd==='assign'){const owner=await resolve(db,'authors',o.owner);if(!owner.active)throw Error('Owner is inactive');result=await db.query('update articles set owner_id=$1 where id=$2 returning title,owner_id',[owner.id,a.id]);}
 if(cmd==='revise'){const body=fs.readFileSync(required(o['body-file'],'body-file'),'utf8');required(body,'body');await db.query('insert into revisions(article_id,version,body,editor,note) values($1,$2,$3,$4,$5)',[a.id,a.revision+1,body,actor,required(o.note,'note')]);result=await db.query("update articles set revision=revision+1,approved_revision=null,status='draft',privacy_checked_at=null where id=$1 returning title,revision,status",[a.id]);}
 if(cmd==='review'){
  if(!['approved','changes'].includes(o.decision))throw Error('decision must be approved or changes');
  const rev=(await db.query('select * from revisions where article_id=$1 and version=$2',[a.id,a.revision]))[0];
  if(actor.toLowerCase()===rev.editor.toLowerCase())throw Error('Independent reviewer must differ from revision editor');required(rev.body,'Article body');const due=date(o.due,'due');
  const today=(await db.query('select current_date::text as today'))[0].today;if(due<=today)throw Error('Next review date must be in the future');
  await db.query('insert into reviews(article_id,version,reviewer,decision,evidence) values($1,$2,$3,$4,$5)',[a.id,a.revision,actor,o.decision,required(o.evidence,'evidence')]);
  result=await db.query("update articles set approved_revision=$1,review_due=$2,status=$3 where id=$4 returning title,approved_revision,review_due,status",[o.decision==='approved'?a.revision:null,due,o.decision==='approved'?'ready':'draft',a.id]);
 }
 if(cmd==='classify'){
  if(!['none','personal'].includes(o.class))throw Error('class must be none or personal');if(o['accuracy-checked']!==undefined&&!['true','false'].includes(o['accuracy-checked']))throw Error('accuracy-checked must be true or false');
  const personal=o.class==='personal';result=await db.query('update articles set privacy_class=$1,purpose=$2,retention_review=$3,privacy_checked_at=case when $4 then current_date else null end where id=$5 returning title,privacy_class,purpose,retention_review,privacy_checked_at',[o.class,personal?required(o.purpose,'purpose'):'',personal?date(o.retention,'retention'):null,o['accuracy-checked']==='true',a.id]);
 }
 if(cmd==='activate'){
  const rev=(await db.query('select body from revisions where article_id=$1 and version=$2',[a.id,a.revision]))[0];required(rev.body,'body');
  const today=(await db.query('select current_date::text as today'))[0].today;
  const owner=a.owner_id&&(await db.query('select active from authors where id=$1',[a.owner_id]))[0];
  if(a.approved_revision!==a.revision||!a.review_due||a.review_due<=today||!owner?.active||a.privacy_class==='unknown')throw Error('Activation requires approval, future review date, active owner and privacy classification');
  if(a.privacy_class==='personal'&&(!a.purpose||!a.retention_review||a.retention_review<=today||!a.privacy_checked_at))throw Error('Personal information requires purpose, future retention review and accuracy check');
  if((await db.query("select id from feedback where article_id=$1 and status='open'",[a.id])).length)throw Error('Resolve open reader corrections before activation');
  result=await db.query("update articles set status='active' where id=$1 returning title,status",[a.id]);
 }
 if(cmd==='archive'){required(o.reason,'reason');result=await db.query("update articles set status='archived' where id=$1 returning title,status",[a.id]);}
 if(cmd==='log-feedback'){if(!['normal','urgent'].includes(o.priority||'normal'))throw Error('priority must be normal or urgent');result=await db.query('insert into feedback(article_id,note,priority) values($1,$2,$3) returning id,note,priority',[a.id,required(o.note,'note'),o.priority||'normal']);}
 await audit(db,a.id,actor,cmd,Object.fromEntries(Object.entries(o).filter(([k])=>k!=='body-file')));return result;
 });
}
