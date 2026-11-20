# Mise en ligne d'ECONOM.

Ordre conseillé. Chaque étape indique ce qui est gratuit et ce qui engage une dépense.

## 1. Supabase (gratuit pour démarrer)

1. Créer un projet **dédié** (région `eu-west-3` Paris ou `eu-central-1`) sur supabase.com — ne pas réutiliser un projet existant.
2. Appliquer le schéma : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.
3. Authentication → URL Configuration : *Site URL* = URL publique ; *Redirect URLs* = `https://<domaine>/**`.
4. Authentication → Providers → Email : activer **Confirm email**. Dans les modèles d'e-mail, utiliser de préférence
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` (et `type=recovery` pour la réinitialisation).
5. Configurer un SMTP d'envoi (le service intégré est limité à quelques e-mails par heure).
6. Relever `Project URL`, la clé publique (anon / publishable) et la clé secrète (service_role).
7. Après la première inscription, se déclarer administrateur (voir README).
8. Sauvegardes : le plan gratuit n'inclut pas de sauvegarde quotidienne restaurable. Avant l'ouverture commerciale : plan Pro
   (sauvegardes quotidiennes, PITR en option) **ou** export planifié `supabase db dump`. Tester une restauration sur un projet vide.

## 2. Stripe en mode Test (gratuit)

```bash
STRIPE_SECRET_KEY=sk_test_… APP_URL=https://<domaine> node scripts/stripe-setup.mjs
```

Le script crée le produit ECONOM. Plus, les tarifs 4,99 €/mois et 39,99 €/an (TTC, modifiables par variables), la configuration
du portail client (factures, moyen de paiement, changement de formule, résiliation en fin de période) et le webhook. Il affiche
`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` et `STRIPE_WEBHOOK_SECRET`.

Scénarios à rejouer en mode Test : carte `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refus),
`4000 0000 0000 0341` (échec au renouvellement), horloges de test Stripe pour le renouvellement et l'expiration,
`stripe events resend <evt>` pour le doublon. La logique correspondante est couverte par `tests/integration/stripe.test.ts`.

## 3. Claude

Créer une clé sur console.anthropic.com et la saisir **uniquement** dans les secrets de l'hébergeur (`ANTHROPIC_API_KEY`).
Si une ancienne clé a déjà été collée dans une conversation ou un fichier : la révoquer d'abord.
Plafond mensuel, quotas et taille maximale des documents se règlent dans Administration → Paramètres.

## 4. Render

1. New → Blueprint → sélectionner le dépôt : `render.yaml` crée le service web.
2. Saisir les variables marquées `sync: false` (voir `.env.example`). `NEXT_PUBLIC_APP_URL` = URL finale.
3. Le plan gratuit met le service en veille après inactivité (premier chargement lent) : acceptable pour valider, pas pour ouvrir.
4. Domaine personnalisé : Settings → Custom Domains, puis mettre à jour `NEXT_PUBLIC_APP_URL`, les URL Supabase et le webhook Stripe.

## 5. Tâche quotidienne

Dans GitHub → Settings → Secrets and variables → Actions : `APP_URL` et `CRON_SECRET` (même valeur que sur Render).
Le workflow `.github/workflows/cron.yml` appelle `/api/cron/daily` chaque jour (rappels, échéances, nouvelles opportunités,
résumé mensuel, alerte d'expiration du catalogue).

## 6. Vérifications après déploiement

- `GET /api/health` → `{"ok":true,"database":true,"ai":…,"billing":…}`.
- Inscription, comparaison, enregistrement d'un abonnement, déconnexion / reconnexion.
- Paiement test → page de succès → statut Plus (c'est le webhook qui active les droits, pas l'URL de retour).
- Portail client : facture visible, résiliation → « résiliation programmée » dans Mon compte.
- Scanner une facture réelle (clé Claude requise).

## 7. Facultatif

- **E-mails** : `RESEND_API_KEY` + `EMAIL_FROM` (domaine vérifié) activent l'envoi des notifications par e-mail.
- **Google / Apple** : configurer les fournisseurs dans Supabase Auth puis `NEXT_PUBLIC_OAUTH_PROVIDERS=google,apple`.
- **Notifications push** : le service worker gère déjà `push` et `notificationclick`. Reste à générer des clés VAPID,
  enregistrer les abonnements (table à ajouter) et envoyer depuis la tâche quotidienne.
- **Application native** : avant toute vente d'abonnement dans une app iOS / Android, vérifier les règles de paiement des stores.

## Entretien du catalogue

Les offres vérifiées expirent d'elles-mêmes (14 jours par défaut). Administration → Offres : revérifier sur le site officiel,
« Prolonger la vérification » ; les administrateurs reçoivent une alerte quand des offres arrivent à expiration.
