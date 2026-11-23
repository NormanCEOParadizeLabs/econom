# App Store readiness — YAPR

## Résultat de l'audit (23 novembre 2026)

**Statut : PAS PRÊT à être soumis comme app commerciale.** Le dépôt correspond à un bêta technique fonctionnel : la couche iOS native, la conformité légale et l'expérience vidéo IA avancée nécessitent encore du travail. « Prêt App Store façon de parler » signifie ici une base structurée, pas une garantie d'acceptation.

### Fonctions validées côté code (non testées sur iOS réel)
- [x] Navigation responsive, composants Dark/Light, splash/branding et icônes 1024 carrées.
- [x] Données personnelles séparées par RLS, Supabase Auth e-mail, stockage des vidéos privé.
- [x] Rendu FFmpeg court, codec H.264 / AAC, vertical 9:16, téléchargement du MP4.
- [x] Test de base automatisé pour refus anonyme et export vidéo réel.
- [x] Aucun faux avis, note App Store ou revenu affiché dans la vraie interface.

### Bloquants avant distribution App Store / public
- [ ] Vérifier la disponibilité et protéger juridiquement la marque **YAPR**.
- [ ] Compiler une application iOS native (Capacitor est fourni comme *amorce*, pas comme binaire validé). Tester la caméra/galerie, le lecteur, fichiers, clavier, upload, téléchargement, performances et orientation sur de vrais iPhone.
- [ ] Apple Developer Program et App Store Connect, signature, certificats, Bundle ID et tests TestFlight.
- [ ] Politique de confidentialité publique **exacte** (opérateur identifié, DPO/contact, finalités, durées de rétention, sous-traitants, droits, transferts) visible dans l'app et App Store Connect.
- [ ] Suppression du **compte utilisateur directement dans l'application**, y compris fichiers associés et révocation de session, selon Apple 5.1.1(v).
- [ ] CGU/CGV, droit d'auteur sur médias et contenus UGC, procédure de signalement/abuse et conditions fournisseurs.
- [ ] Données App Privacy App Store Connect renseignées avec honnêteté, tracking/consentement si analytics marketing ajouté.
- [ ] Fonction d'aide et contact réel, traitement des demandes de suppression/export de données.
- [ ] Vérifier les droits des musiques, samples SFX, modèles typographiques et clips du catalogue. **Ne pas scraper TikTok/YouTube.**
- [ ] Si abonnements numériques : StoreKit / In-App Purchase, logique d'entitlements, restauration, renouvellement, remboursements et prix clairement affichés.
- [ ] Tests d'abus de coûts, anti-bot/rate limits durables, quotas par utilisateur, throttling, queue de tâches et traitement vidéo durable hors processus web.
- [ ] Transcription timecodée correcte et tests qualité des montages sur un ensemble varié de vidéos; le style « automatique pro » ne doit pas être une promesse trompeuse.
- [ ] Tests de sécurité (auth, RLS, URL signées, XSS/CSRF, injection média, limites multipart, dépendances) et de fiabilité, accessibilité VoiceOver et Reduced Motion.
- [ ] Localiser les messages Apple d'autorisations photo/vidéo/fichiers selon APIs réellement utilisées.
- [ ] A/B tests des icônes et captures App Store avec de **vraies** fonctionnalités montrées, pas d'écrans purement prospectifs.

## Risques et coûts
- L'hébergement CPU gratuit n'est pas une chaîne de montage grand public. Rendus longs, parallélisme, stockage et sorties HD multiplient les coûts; modéliser le coût par export.
- Free tier Supabase : limites globales et de bucket peuvent empêcher certains uploads.
- Ne jamais publier une clé IA ou `service_role` dans le client / Git; contrôler facturation et budgets avant activation de providers.
- Apple peut refuser les simples wrappers WebView qui n'apportent pas suffisamment de valeur native. Le moteur doit être stable et utilisable.

## Sources publiques officielles
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://supabase.com/docs/guides/storage/security/access-control
