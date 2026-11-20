# ECONOM. — Ton argent. Tes règles.

Application web (PWA) du pouvoir d'achat : comparateur déterministe de forfaits mobiles et de box internet, analyse de factures par Claude, suivi des abonnements, bons plans locaux sourcés, suivi des économies, parrainage et abonnement ECONOM. Plus.

## Pile technique

| Couche | Choix |
|---|---|
| Frontend / backend | Next.js 16 (App Router, Server Actions, Route Handlers), TypeScript, Tailwind CSS v4 |
| Données et comptes | Supabase : PostgreSQL, Auth, Row Level Security sur toutes les tables |
| IA | API Anthropic (SDK officiel), serveur uniquement, sorties structurées validées par Zod |
| Paiement | Stripe Checkout (abonnement), Customer Portal, webhooks signés et idempotents |
| Tests | Vitest (unitaires + intégration sur Supabase local), Playwright (bout en bout), axe (accessibilité) |
| Hébergement | Render (`render.yaml`), tâche quotidienne via GitHub Actions |

## Démarrer en local

```bash
npm install
npx supabase start          # nécessite Docker ; applique supabase/migrations
cp .env.ci .env.local       # clés publiques de démonstration de la pile locale
npm run dev                 # http://localhost:3000
```

Devenir administrateur (le rôle ne vient que de la table `admins`) :

```sql
insert into public.admins (user_id) select id from auth.users where email = 'toi@exemple.fr';
```

## Tests

```bash
npm test                    # 97 tests : moteur, RLS, Stripe, IA (simulée), parrainage, défis, Growth
npm run build && npm run test:e2e   # 17 scénarios : iPhone, Android, petit écran, ordinateur
```

## Organisation du code

```
src/lib/engine.ts            Moteur de comparaison (aucune IA, montants en centimes)
src/lib/services/            Comparaison, analyse, parrainage, bons plans, tâches planifiées
src/lib/ai/                  Client Claude, extraction de facture, assistant à outils, scripts Growth
src/lib/stripe/              Client, synchronisation des abonnements (webhooks)
src/app/(site)/              Site public, comparateurs sans compte, pages légales
src/app/app/                 Application connectée
src/app/admin/               Administration et Growth Studio
src/app/api/                 Routes API (validation Zod, limitation de débit)
supabase/migrations/         Schéma, RLS, fonctions, catalogue vérifié
tests/                       unit · integration · e2e
docs/                        Déploiement, conformité, moteur viral
```

## Principes non négociables

- Les prix viennent d'un catalogue d'offres vérifiées, sourcées et datées ; une offre expirée disparaît d'elle-même.
- Les calculs sont faits par le moteur déterministe. Claude lit, explique et rédige : il ne fixe jamais un tarif.
- Une économie n'est jamais présentée comme garantie ; « potentielle », « lancée », « confirmée » et « constatée » sont séparées.
- Les factures ne sont pas conservées : seuls les champs extraits le sont.
- Les droits Premium sont vérifiés en base à chaque opération (`has_plus`), jamais déduits de l'interface.

Voir `docs/DEPLOIEMENT.md` pour la mise en ligne et `docs/CONFORMITE.md` pour les points à faire valider.
