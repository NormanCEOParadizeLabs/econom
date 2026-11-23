# Amorce iOS (non compilée)

Le dépôt fournit une interface web statique et son backend Python. Pour l'App Store, il faut créer puis tester une application native; cette configuration Capacitor n'est qu'une base et n'a pas été synchronisée dans Xcode.

Sur un Mac avec Node, Xcode, compte Apple Developer :

```bash
cd mobile
npm install
mkdir -p www
cp -R ../web/* www/
npx cap add ios
npx cap sync ios
npx cap open ios
```

**Important :** la partie web appelle `/api/render` en relatif. En build natif, configure explicitement une URL HTTPS de backend et une politique CORS restrictive autorisant l'origine Capacitor, ou un domaine applicatif approuvé; sans cela l'export MP4 ne fonctionnera pas. Les vérifications de safe area, partage natif de fichiers, lecture vidéo, écouteurs, permissions et gestion des téléchargements sont obligatoires avant publication. Aucun Bundle ID n'est réservé ni enregistré.
