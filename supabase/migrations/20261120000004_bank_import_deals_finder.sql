-- Import de relevé bancaire (détection d'abonnements) et recherche automatique de bons plans.
alter table public.user_contracts add column started_on date;
alter table public.user_contracts add column source text not null default 'manual' check (source in ('manual', 'import', 'scan'));
alter table public.user_contracts add column previous_price_cents integer check (previous_price_cents is null or previous_price_cents >= 0);

alter table public.local_deals add column origin text not null default 'manual' check (origin in ('manual', 'submission', 'auto'));
alter table public.local_deals add column evidence text check (char_length(evidence) <= 400);
update public.local_deals set origin = 'submission' where submitted_by is not null;
create index local_deals_recheck_idx on public.local_deals (recheck_by) where status = 'verified';

insert into public.admin_settings (key, value) values
  ('deals_finder', '{"enabled": true, "auto_publish": true, "cities": ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nantes", "Strasbourg", "Montpellier", "Rennes"], "cities_per_run": 1, "recheck_days": 7, "cursor": 0}')
on conflict (key) do nothing;
