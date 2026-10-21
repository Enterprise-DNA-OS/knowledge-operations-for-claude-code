create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table collections(id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table authors(id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table articles(
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references collections, external_id text,
 title text not null check(length(trim(title))>0), category text not null default 'Uncategorised', permalink text not null default '',
 owner_id uuid references authors, status text not null default 'draft' check(status in ('draft','ready','active','archived')),
 revision integer not null default 1 check(revision>0), approved_revision integer,
 review_due date, privacy_class text not null default 'unknown' check(privacy_class in ('unknown','none','personal')),
 purpose text not null default '', retention_review date, privacy_checked_at date,
 source_status text not null default '', source_visibility text not null default '', source_url text not null default '',
 views integer not null default 0 check(views>=0), thumbs_up integer not null default 0 check(thumbs_up>=0), thumbs_down integer not null default 0 check(thumbs_down>=0),
 source_modified text not null default '', source_data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(collection_id,external_id)
);
create table revisions(id uuid primary key default gen_random_uuid(), article_id uuid not null references articles, version integer not null check(version>0), body text not null, original_html text not null default '', editor text not null, note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(article_id,version));
create table reviews(id uuid primary key default gen_random_uuid(), article_id uuid not null references articles, version integer not null, reviewer text not null, decision text not null check(decision in ('approved','changes')), evidence text not null check(length(trim(evidence))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), foreign key(article_id,version) references revisions(article_id,version));
create table feedback(id uuid primary key default gen_random_uuid(), article_id uuid not null references articles, note text not null, priority text not null default 'normal' check(priority in ('normal','urgent')), status text not null default 'open' check(status in ('open','resolved')), resolution text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table searches(id uuid primary key default gen_random_uuid(), phrase text not null, hits integer not null check(hits>=0), searched_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table activity(id uuid primary key default gen_random_uuid(), article_id uuid references articles, actor text not null, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table imports(id uuid primary key default gen_random_uuid(), collection_id uuid not null references collections, digest text not null, row_count integer not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(collection_id,digest));
do $$ declare t text; begin foreach t in array array['collections','authors','articles','revisions','reviews','feedback','searches','activity','imports'] loop execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t); execute format('alter table %I enable row level security',t); execute format('revoke all on %I from public',t); end loop; end $$;
create index articles_owner on articles(owner_id);
create index feedback_article on feedback(article_id);
create view article_register as
select a.id,a.title,c.name as collection,a.category,coalesce(o.name,'Unassigned') as owner,a.status,a.revision,a.approved_revision,a.review_due,a.privacy_class,a.retention_review,a.views,a.thumbs_down,
 length(r.body) as body_characters,(select count(*)::int from feedback f where f.article_id=a.id and f.status='open') as open_feedback
from articles a join collections c on c.id=a.collection_id left join authors o on o.id=a.owner_id join revisions r on r.article_id=a.id and r.version=a.revision;
create view review_queue as select * from article_register where status<>'archived' and (review_due is null or review_due<=current_date or approved_revision is distinct from revision) ;
create view attention as
select a.id,a.title,coalesce(o.name,'Unassigned') as owner,issue.reason,issue.priority
from articles a left join authors o on o.id=a.owner_id join revisions r on r.article_id=a.id and r.version=a.revision
cross join lateral (values
 ('Review overdue',case when a.review_due<current_date then 2 end),
 ('Review date missing',case when a.review_due is null then 2 end),
 ('Owner unavailable',case when o.id is null or not o.active then 1 end),
 ('Content missing',case when trim(r.body)='' then 1 end),
 ('Revision needs approval',case when a.approved_revision is distinct from a.revision then 2 end),
 ('Privacy classification unknown',case when a.privacy_class='unknown' then 1 end),
 ('Retention review due',case when a.privacy_class='personal' and (a.retention_review is null or a.retention_review<=current_date) then 1 end),
 ('Reader correction open',case when exists(select 1 from feedback f where f.article_id=a.id and f.status='open') then 2 end)
) issue(reason,priority) where a.status<>'archived' and issue.priority is not null;
create view content_performance as select title,owner,status,views,thumbs_down,open_feedback,review_due from article_register;
create view owner_workload as select owner,count(*)::int as articles,count(*) filter(where review_due is null or review_due<=current_date)::int as reviews_due,sum(open_feedback)::int as open_feedback from article_register where status<>'archived' group by owner;
create view compliance_findings as
select a.id,a.title,'NZ-IPP8' as rule,'Personal information needs an accuracy review' as finding,'https://www.privacy.org.nz/privacy-principles/8/' as source
from articles a where a.status<>'archived' and a.privacy_class='personal' and (a.privacy_checked_at is null or a.review_due is null or a.review_due<=current_date)
union all select a.id,a.title,'NZ-IPP9','Record the purpose and review whether personal information is still needed','https://www.privacy.org.nz/privacy-principles/9/' from articles a where a.privacy_class='personal' and (trim(a.purpose)='' or a.retention_review is null or a.retention_review<=current_date)
union all select a.id,a.title,'HOUSE-01','Assign an active article owner','docs/compliance.md#house-rules' from articles a left join authors o on o.id=a.owner_id where a.status<>'archived' and (o.id is null or not o.active)
union all select a.id,a.title,'HOUSE-02','Current revision has no independent approval','docs/compliance.md#house-rules' from articles a where a.status='active' and a.approved_revision is distinct from a.revision
union all select a.id,a.title,'HOUSE-03','Classify content before operational use','docs/compliance.md#house-rules' from articles a where a.status<>'archived' and a.privacy_class='unknown';
revoke all on article_register,review_queue,attention,content_performance,owner_workload,compliance_findings from public;
