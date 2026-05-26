# 📦 Guide d'Installation Complet - IBANSYS

## 🎯 Objectif
Ce guide vous permettra d'installer et d'exécuter le projet IBANSYS sur votre machine locale en quelques minutes.

---

## ✅ Prérequis

### 1. Node.js et npm
Vérifiez que Node.js est installé (version 18 ou supérieure) :
```bash
node --version
npm --version
```

Si Node.js n'est pas installé, téléchargez-le depuis : https://nodejs.org/

### 2. Éditeur de code (Recommandé)
- Visual Studio Code : https://code.visualstudio.com/
- WebStorm
- Sublime Text

---

## 📥 Installation Pas à Pas

### Méthode 1 : Installation Complète (Recommandée)

#### Étape 1 : Extraire le projet
Si vous avez reçu un fichier ZIP, extrayez-le dans un dossier de votre choix :
```
C:\Projets\ibansys\
```
ou
```
~/Projets/ibansys/
```

#### Étape 2 : Ouvrir un terminal
- **Windows** : Clic droit dans le dossier → "Ouvrir dans le terminal" ou "Git Bash Here"
- **Mac/Linux** : Terminal → cd vers le dossier
```bash
cd chemin/vers/ibansys
```

#### Étape 3 : Installer les dépendances
```bash
npm install
```

⏱️ Cette opération prend environ 2-5 minutes selon votre connexion internet.

Vous devriez voir :
```
added 1234 packages in 3m
```

#### Étape 4 : Lancer l'application
```bash
npm run dev
```

Vous devriez voir :
```
  VITE v5.4.10  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

#### Étape 5 : Ouvrir dans le navigateur
L'application devrait s'ouvrir automatiquement dans votre navigateur.
Sinon, ouvrez manuellement : **http://localhost:3000**

---

## 🔧 Configuration Alternative

### Utiliser un port différent
Si le port 3000 est déjà utilisé, modifiez `vite.config.ts` :

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001, // Changez ici
    open: true
  }
});
```

### Installer avec Yarn (Alternative à npm)
```bash
yarn install
yarn dev
```

### Installer avec pnpm (Alternative rapide)
```bash
pnpm install
pnpm dev
```

---

## 📁 Vérification de la Structure

Assurez-vous que votre projet contient ces fichiers essentiels :

```
ibansys/
├── 📄 package.json          ✅ Dépendances du projet
├── 📄 vite.config.ts        ✅ Configuration Vite
├── 📄 tsconfig.json         ✅ Configuration TypeScript
├── 📄 index.html            ✅ Point d'entrée HTML
├── 📄 App.tsx               ✅ Composant principal
├── 📄 utils.ts              ✅ Utilitaires (fonction cn)
├── 📂 src/
│   ├── main.tsx             ✅ Bootstrap React
│   └── vite-env.d.ts        ✅ Types Vite
├── 📂 components/
│   ├── AVAMiseAJourBeneficiaires.tsx
│   ├── Sidebar.tsx
│   └── ui/                  ✅ Composants UI
├── 📂 styles/
│   └── globals.css          ✅ Styles Tailwind
└── 📂 node_modules/         ✅ (créé après npm install)
```

---

## 🐛 Résolution des Problèmes

### Problème 1 : "Cannot find module 'react'"
**Solution** :
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problème 2 : Port 3000 déjà utilisé
**Solution Option A** - Changer le port (voir section "Configuration Alternative")

**Solution Option B** - Arrêter le processus qui utilise le port :
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <numero_du_PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Problème 3 : Erreur "EACCES" (Permissions)
**Solution** :
```bash
# Mac/Linux
sudo npm install
# ou
npm install --unsafe-perm
```

### Problème 4 : Erreur de compilation TypeScript
**Solution** :
```bash
npm run build
```
Lisez les erreurs dans la console et corrigez-les.

### Problème 5 : "Module not found: Can't resolve './utils'"
**Solution** : Vérifiez que le fichier `/utils.ts` existe à la racine du projet.

### Problème 6 : Page blanche après le lancement
**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Vérifiez les erreurs
3. Relancez avec `npm run dev`

---

## 🧪 Test de l'Installation

### 1. Vérifier la page d'accueil
- Ouvrez http://localhost:3000
- Vous devriez voir le logo "Société le Monde Informatique"
- La sidebar devrait être visible

### 2. Tester la navigation
- Cliquez sur "AVA" dans le menu
- Ouvrez "Ouverture de Dossier"
- Le formulaire avec 4 onglets devrait s'afficher

### 3. Tester "Mise à jour Bénéficiaires"
- Menu AVA → Mise à jour Bénéficiaires
- Un tableau de recherche devrait s'afficher

---

## 📊 Performances Attendues

| Métrique | Valeur Attendue |
|----------|----------------|
| Installation | 2-5 minutes |
| Démarrage serveur | < 1 seconde |
| Rechargement à chaud | < 500 ms |
| Build production | 15-30 secondes |

---

## 🚀 Build pour la Production

### Compiler le projet
```bash
npm run build
```

Le build sera créé dans le dossier `/dist`

### Tester le build
```bash
npm run preview
```

### Déployer
Uploadez le contenu du dossier `/dist` sur votre serveur web.

---

## 📞 Support et Assistance

### En cas de problème persistant :

1. **Vérifier les logs** :
   ```bash
   npm run dev > logs.txt 2>&1
   ```

2. **Vérifier la version de Node** :
   ```bash
   node --version
   npm --version
   ```
   Minimum requis : Node.js 18.x

3. **Nettoyer complètement** :
   ```bash
   rm -rf node_modules package-lock.json dist
   npm cache clean --force
   npm install
   ```

4. **Contacter l'équipe de développement** avec :
   - Système d'exploitation
   - Version de Node.js
   - Message d'erreur complet
   - Fichier logs.txt

---

## ✅ Checklist Finale

- [ ] Node.js 18+ installé
- [ ] Projet extrait dans un dossier
- [ ] `npm install` exécuté sans erreur
- [ ] `npm run dev` démarre le serveur
- [ ] http://localhost:3000 accessible
- [ ] Interface affichée correctement
- [ ] Navigation fonctionnelle
- [ ] Formulaires s'affichent

---

## 🎉 Félicitations !

Si tous les points de la checklist sont cochés, votre installation est réussie !

Vous pouvez maintenant utiliser IBANSYS pour gérer vos collections.

**Bonne utilisation ! 🚀**

---

*Guide créé pour IBANSYS - Société le Monde Informatique*
