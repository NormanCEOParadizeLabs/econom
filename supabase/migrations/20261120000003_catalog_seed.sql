-- Catalogue initial. Seules les offres dont TOUS les champs de coût ont été lus sur une source officielle
-- le 20/11/2026 sont « verified ». Les autres restent en brouillon (jamais publiées) jusqu'à vérification par un administrateur.
insert into public.providers (slug, name, website) values
  ('free', 'Free', 'https://www.free.fr'),
  ('bouygues-telecom', 'Bouygues Telecom', 'https://www.bouyguestelecom.fr')
on conflict (slug) do nothing;

with p as (select id from public.providers where slug = 'free'),
ins as (
  insert into public.offers (provider_id, category, name, monthly_cents, intro_months, after_cents, commitment_months, sim_fee_cents, data_gb, roaming_gb, five_g, host_network, conditions, promo_conditions, url, status, verified_at, valid_until)
  select p.id, 'mobile'::public.offer_category, v.name, v.monthly, v.intro, v.after, 0, 1000, v.data_gb, v.roaming, v.five_g, 'Free', v.conditions, v.promo, v.url, 'verified'::public.offer_status, date '2026-11-20', date '2026-12-04'
  from p, (values
    ('Série Free 110 Go 5G', 1299, 12, 1999, 110::numeric, 30::numeric, true,
      'Sans engagement. Carte SIM / eSIM facturée 10 € à la commande. 30 Go/mois utilisables depuis l''Europe et les DOM.',
      '12,99 €/mois pendant 12 mois, puis passage automatique au Forfait Free 5G+ à 19,99 €/mois (350 Go).',
      'https://mobile.free.fr/fiche-forfait-serie-free'),
    ('Forfait Free 5G+ 350 Go', 1999, 0, 1999, 350::numeric, 35::numeric, true,
      'Sans engagement. Carte SIM / eSIM facturée 10 € à la commande. 35 Go/mois à l''étranger dans plus de 115 destinations. Tarif réduit pour les abonnés Freebox (non pris en compte ici).',
      null, 'https://mobile.free.fr/fiche-forfait-free'),
    ('Forfait 2 € — 2 h et 50 Mo', 200, 0, 200, 0.05::numeric, 0.05::numeric, false,
      'Sans engagement. 2 h d''appels et 50 Mo par mois (0,05 €/Mo au-delà). Carte SIM / eSIM facturée 10 € à la commande. Convient uniquement à un très petit usage d''internet.',
      null, 'https://mobile.free.fr/fiche-forfait-2-euros')
  ) as v(name, monthly, intro, after, data_gb, roaming, five_g, conditions, promo, url)
  where not exists (select 1 from public.offers o where o.url = v.url)
  returning id, url
)
insert into public.offer_sources (offer_id, url, label, evidence, checked_at)
select id, url, 'Fiche officielle Free Mobile', 'Prix, volume de data et engagement lus sur la fiche officielle le 20/11/2026.', date '2026-11-20' from ins
union all
select id, 'https://mobile.free.fr/docs/bt/tarifs.pdf', 'Brochure tarifaire Free Mobile (en vigueur au 21/07/2026)', '« La Carte SIM/eSIM est facturée 10€ (paiement à la commande). »', date '2026-11-20' from ins;

-- Brouillons : prix d'appel lu sur la page officielle, mais frais ou caractéristiques non confirmés → non publiés.
insert into public.offers (provider_id, category, name, monthly_cents, intro_months, after_cents, data_gb, roaming_gb, five_g, host_network, technology, activation_fee_cents, conditions, url, status)
select p.id, v.category::public.offer_category, v.name, v.monthly, 0, v.monthly, v.data_gb, v.roaming, v.five_g, v.network, v.technology, v.activation, v.conditions, v.url, 'draft'::public.offer_status
from (values
  ('bouygues-telecom', 'mobile', 'Série spéciale B&You Pack Amazon Prime 170 Go 5G', 1499, 170::numeric, 60::numeric, true, 'Bouygues Telecom', null, 0,
    'BROUILLON — prix de 14,99 €/mois lu sur la page officielle le 20/11/2026. Prix de la carte SIM, durée de la remise et conditions à vérifier avant publication.',
    'https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement'),
  ('free', 'internet', 'Série Spéciale Freebox Pop S', 2499, null::numeric, null::numeric, false, null, 'fibre', 4900,
    'BROUILLON — 24,99 €/mois sans engagement lu sur la page officielle le 20/11/2026. Débits, frais de résiliation et conditions de remboursement des 49 € de mise en service à vérifier avant publication.',
    'https://www.free.fr/freebox/')
) as v(slug, category, name, monthly, data_gb, roaming, five_g, network, technology, activation, conditions, url)
join public.providers p on p.slug = v.slug
where not exists (select 1 from public.offers o where o.name = v.name);
