-- Sync publicly monitored companies with Google News RSS source discovery.
-- Sources are not a claim of complete coverage. Each is polled in rotating batches.
insert into public.world_news_sources(publisher,feed_url,region,language,category,trust_level,active,status)
select 'Google News · '||c.name,
       'https://news.google.com/rss/search?q=%22'||replace(c.name,' ','%20')||'%22%20fashion%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen',
       'global','en','brand_watch',78,true,'pending'
from public.companies c
where c.name ~ '^[A-Za-z0-9 ]{3,60}$'
  and not exists (select 1 from public.world_news_sources w where w.publisher='Google News · '||c.name)
on conflict(feed_url) do nothing;
-- Deployed cron schedule: daily 02:11 UTC, 'hunt-brand-news-registry-daily'.
