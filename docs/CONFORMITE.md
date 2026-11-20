# Sécurité, RGPD et points à faire valider

Ce document décrit ce qui est en place et, séparément, ce qui **exige une validation juridique** avant l'ouverture commerciale.
Rien ici ne vaut avis juridique.

## En place

| Sujet | Mise en œuvre |
|---|---|
| Cloisonnement des données | RLS sur toutes les tables ; tests `tests/integration/rls.test.ts` (lecture, écriture, élévation de privilèges) |
| Rôle administrateur | Table `admins` uniquement ; les métadonnées modifiables par l'utilisateur n'ont aucun effet |
| Droits Premium | Fonction SQL `has_plus` ; quotas atomiques ; limite d'abonnements suivis appliquée par un trigger |
| Secrets | Variables serveur uniquement (`src/lib/env.ts` marqué `server-only`) ; aucune clé dans le dépôt |
| Documents | Type vérifié par signature binaire, taille limitée, traitement en mémoire, **non conservés** |
| IA | Consentement explicite avant envoi ; sortie contrainte par schéma puis revalidée ; IBAN, cartes, téléphones, e-mails masqués |
| Injection dans un document | Document transmis comme donnée, aucun outil disponible pendant l'extraction, validation humaine avant tout calcul |
| Assistant | Outils en lecture seule ; identifiant utilisateur pris dans la session serveur, jamais dans la demande du modèle |
| Paiement | Aucune donnée de carte ne transite par l'application ; webhooks signés, idempotents, rejouables |
| Abus | Limitation de débit en base (connexion, inscription, analyse, assistant, partage), anti-fraude du parrainage |
| En-têtes | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Droits des personnes | Export JSON et suppression du compte en libre-service (cascade en base, résiliation Stripe) |
| Journaux | Codes et identifiants techniques uniquement ; consommation IA sans contenu |
| Mesure d'usage | Interne, sans cookie ni identifiant persistant ; liée au compte seulement avec accord explicite |
| Transparence du comparateur | Critères de classement affichés sous les résultats ; partenariats signalés et sans effet sur l'ordre |

## À faire valider par un juriste

1. **Mentions légales, CGU, CGV, confidentialité, cookies** : projets rédigés, champs société marqués « À COMPLÉTER ».
2. **Droit de rétractation** : le parcours recueille une demande expresse d'accès immédiat. Pour un abonnement, le régime
   applicable (renoncement de l'article L221-28 ou paiement au prorata de l'article L221-25) doit être tranché ; le libellé de
   la case à cocher de `/app/premium` et l'article correspondant des CGV devront suivre.
3. **Résiliation en ligne** (art. L215-1-1) : elle passe par le portail Stripe depuis « Mon compte ». Vérifier que le
   parcours satisfait l'exigence d'accès direct et facile.
4. **Comparateur** (art. L111-7 et D111-10 et suivants du Code de la consommation) : vérifier les mentions sur l'exhaustivité,
   la périodicité de mise à jour et les liens commerciaux — à réviser dès qu'un premier partenariat rémunéré existe.
5. **Sous-traitants et transferts hors UE** : Anthropic, Stripe, Supabase, Render, Resend. Signer les accords de traitement,
   documenter les mécanismes de transfert et vérifier la politique de conservation d'Anthropic pour l'API utilisée.
6. **Bases légales** : mesure d'usage interne sur intérêt légitime, cookie d'attribution du parrainage (posé au clic sur un
   lien `/r/CODE`, 30 jours) : confirmer la qualification et l'information fournie.
7. **Parrainage** : règlement du programme, plafonds, traitement de l'empreinte d'adresse IP (HMAC, anti-fraude).
8. **Publicité et créateurs** : mention « Collaboration commerciale » obligatoire pour tout contenu rémunéré (loi du 9 juin 2023) ;
   aucun script généré ne doit être publié sans relecture.
9. **Marque** : recherche d'antériorité INPI / EUIPO pour « ECONOM. » et le logo, disponibilité des domaines.
10. **Registre des traitements**, analyse d'impact si le volume de factures traitées le justifie, désignation éventuelle d'un DPO.
11. **TVA et facturation** : régime applicable, mentions des factures Stripe, activation de Stripe Tax si nécessaire.

## Limites connues

- La CSP autorise `'unsafe-inline'` pour les scripts (contrainte de Next.js sans nonce). Passer aux nonces est possible au prix
  du rendu dynamique de toutes les pages.
- La limitation de débit s'appuie sur `x-forwarded-for` : à vérifier derrière le proxy de l'hébergeur retenu.
- La liste des domaines d'e-mail jetables est courte ; à enrichir ou à remplacer par un service spécialisé.
- L'éligibilité d'une box à une adresse n'est pas vérifiée : l'interface le dit à chaque résultat.
