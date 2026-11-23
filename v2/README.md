# YAPR Studio 0.9 — beta technique (23 novembre 2026)

Une vraie application web/PWA responsive Dark + Light, avec la marque YAPR validée, y compris le A fendu dans le wordmark approuvé. Les originaux du logo sont sous `web/assets`. Le code est fourni pour audit et hébergement; **ce n'est pas un binaire iOS soumis ni une application approuvée par Apple**.

## Fonctionnalités réellement développées

- Parcours mobile-first, 8 espaces : Accueil, Découverte/swipe, Studio, Bibliothèque, Taste DNA, Résultats, Projets, Réglages.
- 12 styles *décrits par leurs caractéristiques*, découverts via swipes ou duels; apprentissage progressif de six préférences avec sauvegarde locale et synchronisation Supabase pour utilisateurs connectés.
- Inscription / connexion par e-mail et mot de passe avec Supabase Auth ; consultation démo sans compte.
- Import MP4/MOV/WEBM, limite **40 Mo / 90 secondes** pour le **moteur bêta**.
- **Vrai montage vidéo :** coupes des longues plages de silence détectées, transcodage vertical H.264 (540×960 ou 720×1280), correction colorimétrique selon le style, compression du son, incrustation facultative de sous-titres **à partir d'un texte fourni** et avec minutage approximatif. Export MP4 fonctionnel.
- Avant / après, téléchargement MP4, retours en langage naturel *restreint* (« plus nerveux », « plus épuré », « moins de sous-titres ») qui modifient les paramètres et permettent un nouveau rendu.
- Projets avec fichiers sources et rendus dans les buckets Supabase **privés** `yapr-raw` et `yapr-renders`, propriétaires contrôlés par RLS, affichage d'une liste et suppression d'un projet.
- Enregistrement des **liens de références dont l'utilisateur confirme les droits**, sans extraction / scraping des plateformes externes.
- PWA installable et assets App Store (icônes 1024×1024), configuration d'amorce Capacitor pour la suite.

## Ce qui n'est PAS encore prêt ou garanti

- Les 12 aperçus sont des **simulations graphiques** et non des extraits réalistes licenciés de créateurs.
- Pas de transcription automatique ni d'alignement mot à mot ; les sous-titres fournis sont répartis approximativement sur la durée. Ne pas les présenter comme synchronisés à la voix.
- Pas de mise en scène sémantique, B-roll automatique, transitions complexes, voix IA ou moteur vidéo HyperFrames intégré.
- Aucun traitement IA payant activé (pas de clé Claude/Anthropic ni d'autre secret déployé).
- Pas de SDK d'achats intégrés, paiement, synchronisation native Apple, tests sur iPhone, suppression de compte dans l'application, politique de confidentialité validée, tests de charge ni modération.
- Le serveur Render Free est inadapté aux longs rendus commerciaux : service éphémère, 1 job à la fois, risques de timeouts, quotas à vérifier.
- Le nom YAPR n'est pas garanti juridiquement disponible.

## Installation locale

Python 3.12+, FFmpeg, fonts-dejavu-core :

```bash
python -m pip install -r requirements.txt
uvicorn api.server:app --host 127.0.0.1 --port 8000
# http://127.0.0.1:8000
```

Tester sans connecter Supabase : découvrir des styles, ajuster le Taste DNA et l'interface. Un compte Supabase valide est requis pour le rendu via `/api/render` et pour le stockage; le jeton est validé par **Supabase Auth** avant chaque rendu. Les deux buckets privés doivent exister, avec contrôle d'accès par dossier `user_id/` (ils existent dans le projet YAPR actuel).

```bash
python -m pip install pytest
PYTHONPATH=. pytest -q
```

Configuration sans secret :

- `SUPABASE_URL` : URL du projet YAPR. Valeur par défaut actuelle `https://gbaixzezxvkosxltngbh.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY` : clé Supabase publique, sans accès admin. Les **clés de service** et les clés de fournisseurs IA ne doivent jamais se trouver dans le code navigateur ou GitHub.

**RGPD / protection des rushs :** les fichiers sont écrits dans un dossier temporaire isolé, supprimés après réponse; les fichiers que le client sauvegarde dans Supabase sont privés au compte. Les conditions finales de conservation, résiliation et suppression doivent être approuvées et intégrées avant un lancement public.

## Détails de mise en production

1. Déployer `Dockerfile` sur un service Render spécifique à YAPR (ne jamais réutiliser la branche `main` du projet Econom ni un service GLPoche).
2. Tester `GET /api/health`, puis login, swipe, sauvegarde des goûts, upload, export, historique, suppression sur un vrai compte test.
3. Mettre en place une file de traitements dédiée avec quotas utilisateur et monitoring avant d'augmenter la limite de durée/taille.
4. Faire produire/licencier les vidéos du catalogue; vérifier les droits et ne les activer dans la table que lorsque la licence est validée.
5. Intégrer l'ASR timecodée, la planification éditoriale IA, un moteur motion (Remotion/HyperFrames) et les transitions; benchmarker coût et qualité sur des rushs variés.
6. Sécuriser le lancement Apple (voir `appstore/APP_STORE_READINESS.md`).

## Sécurité

- Supabase RLS activé, politiques `auth.uid() = user_id`, stockage privé et dossier sous UUID. **Le backend ne reçoit que le jeton utilisateur, jamais la service role.**
- Validation côté serveur des formats par `ffprobe`, durée, taille, style, paramètres, et refus des rendus anonymes.
- Limite de 1 rendu simultané sur la machine, 40 Mo et 90 secondes; ce n'est **pas** une facturation ni un quota durable.
- Pas de fonction d'import automatique de TikTok/YouTube; l'utilisateur garde la responsabilité de ses références.

## Sources externes à vérifier avant la mise en ligne

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Ionic Capacitor](https://capacitorjs.com/docs/ios)
