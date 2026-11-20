-- Catalogue : offres Sosh vérifiées le 20/11/2026 sur les fiches officielles, les récapitulatifs contractuels
-- et la fiche tarifaire Sosh « en vigueur au 19 novembre 2026 ». Les offres dont un frais reste ambigu sont en brouillon.
insert into public.providers (slug, name, website) values ('sosh', 'Sosh', 'https://www.sosh.fr') on conflict (slug) do nothing;

with p as (select id from public.providers where slug = 'sosh'),
ins as (
  insert into public.offers (provider_id, category, name, monthly_cents, intro_months, after_cents, commitment_months, sim_fee_cents, data_gb, roaming_gb, five_g, host_network, conditions, url, status, verified_at, valid_until)
  select p.id, 'mobile'::public.offer_category, v.name, v.monthly, 0, v.monthly, 0, 1000, v.data_gb, v.roaming, false, 'Orange',
    'Sans engagement. Réseau Orange 4G/4G+ (pas de 5G sur ce forfait). 10 € de frais d''activation de la carte SIM / eSIM à la commande. Data utilisable depuis l''Europe et les DOM (hors Suisse et Andorre) dans la limite indiquée.',
    v.url, 'verified'::public.offer_status, date '2026-11-20', date '2026-12-04'
  from p, (values
    ('Forfait Sosh 100 Go', 1399, 100::numeric, 40::numeric, 'https://shop.sosh.fr/mobile/forfait-100go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4991.pdf'),
    ('Forfait Sosh 20 Go', 999, 20::numeric, 20::numeric, 'https://shop.sosh.fr/mobile/forfait-20go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4744.pdf'),
    ('Forfait Sosh 1 Go', 199, 1::numeric, 1::numeric, 'https://shop.sosh.fr/mobile/forfait-bon-plan-1go-1go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4736.pdf')
  ) as v(name, monthly, data_gb, roaming, url, rc)
  where not exists (select 1 from public.offers o where o.url = v.url)
  returning id, url
)
insert into public.offer_sources (offer_id, url, label, evidence, checked_at)
select id, url, 'Fiche officielle Sosh', 'Prix mensuel, volume de data et absence d''engagement lus sur la fiche officielle le 20/11/2026.', date '2026-11-20' from ins
union all
select ins.id, v.rc, 'Récapitulatif contractuel Sosh', '« 10 € de frais d''activation de la carte SIM/eSIM (paiement à la commande) pour la souscription d''un forfait seul. »', date '2026-11-20'
from ins join (values
  ('https://shop.sosh.fr/mobile/forfait-100go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4991.pdf'),
  ('https://shop.sosh.fr/mobile/forfait-20go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4744.pdf'),
  ('https://shop.sosh.fr/mobile/forfait-bon-plan-1go-1go', 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_4736.pdf')
) as v(url, rc) on v.url = ins.url;

with p as (select id from public.providers where slug = 'sosh'),
box as (
  insert into public.offers (provider_id, category, name, monthly_cents, intro_months, after_cents, commitment_months, activation_fee_cents, termination_fee_cents, technology, download_mbps, upload_mbps, has_tv, has_phone, conditions, url, status, verified_at, valid_until)
  select p.id, 'internet', 'La Boîte Sosh Fibre', 2499, 0, 2499, 0, 3900, 6900, 'fibre', 2000, 800, false, true,
    'Sans engagement. Frais de mise en service : 39 €. Frais de résiliation : 69 €. Débit descendant jusqu''à 2 Gbit/s partagés, montant jusqu''à 800 Mbit/s. Appels illimités vers les fixes inclus ; décodeur TV en option à 5 €/mois. Sous réserve d''éligibilité à la fibre Orange.',
    'https://shop.sosh.fr/box-internet', 'verified', date '2026-11-20', date '2026-12-04'
  from p where not exists (select 1 from public.offers o where o.name = 'La Boîte Sosh Fibre')
  returning id
)
insert into public.offer_sources (offer_id, url, label, evidence, checked_at)
select id, 'https://documentscontractuels.orange.fr/les-offres-sosh_fit_1977.pdf', 'Fiche tarifaire Sosh (en vigueur au 19/11/2026)', '« Fibre 24,99 € — Frais de mise en service 39 € — Frais de résiliation 69 € — Sans engagement. »', date '2026-11-20' from box
union all
select id, 'https://documentscontractuels.orange.fr/les-offres-sosh_rc_5146.pdf', 'Récapitulatif contractuel Boîte Sosh Fibre', '« Débit descendant 2 Gbit/s partagés — Débit montant 800 Mbit/s »', date '2026-11-20' from box;

-- Brouillons Sosh : prix lus sur les fiches officielles, mais frais d'activation ou prix exact à confirmer.
insert into public.offers (provider_id, category, name, monthly_cents, intro_months, after_cents, data_gb, roaming_gb, five_g, host_network, technology, download_mbps, upload_mbps, activation_fee_cents, termination_fee_cents, conditions, url, status)
select p.id, v.category::public.offer_category, v.name, v.monthly, 0, v.monthly, v.data_gb, v.roaming, v.five_g, v.network, v.technology, v.down, v.up, v.activation, v.termination, v.conditions, v.url, 'draft'::public.offer_status
from (values
  ('mobile', 'Forfait Sosh Voyage 200 Go 5G', 1599, 200::numeric, 40::numeric, true, 'Orange', null, null::integer, null::integer, 0, 0,
    'BROUILLON — 15,99 €/mois sans engagement lu sur la fiche officielle le 20/11/2026. Le récapitulatif contractuel ne mentionne les 10 € d''activation que pour l''option Multi-SIM : frais de carte SIM à confirmer avant publication.',
    'https://shop.sosh.fr/mobile/forfait-voyage-200go-5g'),
  ('mobile', 'Forfait Sosh 300 Go 5G', 2099, 300::numeric, 50::numeric, true, 'Orange', null, null::integer, null::integer, 0, 0,
    'BROUILLON — 20,99 €/mois sans engagement lu sur la fiche officielle le 20/11/2026. Frais de carte SIM à confirmer avant publication.',
    'https://shop.sosh.fr/mobile/forfait-5g-300go-50go'),
  ('internet', 'Sosh Boost Fibre', 2899, null::numeric, null::numeric, false, null, 'fibre', 8000, 2000, 3900, 6900,
    'BROUILLON — débits 8 Gbit/s partagés / 2 Gbit/s lus dans le récapitulatif contractuel ; le prix mensuel exact n''a pas pu être lu : à saisir avant publication.',
    'https://shop.sosh.fr/box-internet')
) as v(category, name, monthly, data_gb, roaming, five_g, network, technology, down, up, activation, termination, conditions, url)
join public.providers p on p.slug = 'sosh'
where not exists (select 1 from public.offers o where o.name = v.name);
