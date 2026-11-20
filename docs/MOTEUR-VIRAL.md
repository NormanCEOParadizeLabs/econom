# Moteur de croissance

Boucle d'acquisition : **diagnostic → économie potentielle → carte partageable → lien → nouveau diagnostic → parrainage qualifié → récompense**.
Boucle de fidélisation : **abonnement enregistré → surveillance quotidienne → rappel ou nouvelle opportunité → retour dans l'app**.

| Brique | Où | Garde-fous |
|---|---|---|
| Résultat avant / après | `src/components/comparator.tsx` | Montants du moteur sur 12 et 24 mois ; rien n'est affiché comme gain si le coût total est supérieur |
| Cartes d'économies | `src/components/savings-card.tsx` | 3 styles × 4 formats, QR code, image et vidéo ; statut « potentielle » ou « réalisée » toujours inscrit ; arrondi à l'euro inférieur ; aucune donnée personnelle |
| Lien de parrainage | `/r/CODE` → `/invitation` → `/diagnostic` | Diagnostic sans compte ; attribution par cookie httpOnly de 30 jours ; aperçus de messagerie non comptés |
| Qualification | `src/lib/services/referral.ts` | Nouveau compte, e-mail confirmé, diagnostic valide ; refus de l'auto-parrainage, des alias, des adresses jetables, des inscriptions en série ; plafond mensuel |
| Récompenses | Table `referral_rewards`, réglage `referral_rewards` | Paliers configurables ; une seule attribution par palier (contrainte d'unicité) ; les jours de Plus offerts ne créent aucun abonnement Stripe |
| Défi ECONOM. | `/app/defis`, lien `/d/TOKEN` | Privé ; seuls des totaux par participant sont visibles, masquables ; quitter ou supprimer |
| Bons plans partageables | `/bon-plan/[id]` | Un bon plan expiré n'est jamais montré comme valide |
| Rapport mensuel | `/app/rapport` | Économies réalisées et potentielles séparées |
| Analytics | `analytics_events`, fonction `growth_metrics` | L'ouverture de la feuille de partage (`share_sheet_opened`) n'est pas un partage ; `share_completed` n'est émis que si le système confirme |
| Tests A/B | Table `experiments`, `useExperiment` | Libellés et emplacements uniquement ; un libellé contenant un montant est refusé |
| Growth Studio | `/admin/growth` | Scripts générés à partir des offres vérifiées, montants contrôlés automatiquement, relecture humaine obligatoire, partenariats rémunérés signalés |

Ce qui n'a volontairement pas été repris de Glam Up : le parrainage obligatoire pour voir son résultat, les résultats floutés,
les faux délais d'analyse et les « avant » dégradés. Le résultat gratuit est toujours complet.

Liens d'attribution des contenus : `https://<domaine>/diagnostic?utm_source=tiktok&utm_campaign=<campagne>` — la campagne est
créée dans Growth Studio → Contenus, puis suivie jusqu'à l'inscription, au parrainage qualifié et à la conversion Premium.
