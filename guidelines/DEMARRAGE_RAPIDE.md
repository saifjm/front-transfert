# 🚀 Démarrage Rapide - IBANSYS

## Installation et Exécution en 3 étapes

### Étape 1 : Installer les dépendances
```bash
npm install
```

Cette commande installera automatiquement toutes les dépendances nécessaires :
- React 18.3.1
- TypeScript 5.6.2
- Vite 5.4.10
- Tailwind CSS 4.0.0
- Toutes les bibliothèques UI (Radix UI, Lucide React, etc.)

### Étape 2 : Lancer l'application
```bash
npm run dev
```

L'application démarrera automatiquement sur **http://localhost:3000**

### Étape 3 : Accéder à l'application
Ouvrez votre navigateur et allez sur :
```
http://localhost:3000
```

---

## 🎯 Fonctionnalités principales

### 1. Ouverture de Dossier AVA
- Navigation : Menu "AVA" → "Ouverture de Dossier"
- 4 onglets de saisie avec validations métier
- Intégration de 6 APIs REST

### 2. Mise à jour Bénéficiaires
- Navigation : Menu "AVA" → "Mise à jour Bénéficiaires"
- Recherche et sélection de dossiers
- Gestion avancée des bénéficiaires avec règles conditionnelles

---

## ⚙️ Configuration

### Variables d'environnement (Optionnel)
Créez un fichier `.env` à la racine si nécessaire :
```env
VITE_API_BASE_URL=http://localhost:8080
```

### Port personnalisé
Pour changer le port, modifiez `vite.config.ts` :
```typescript
server: {
  port: 3000, // Changez ici
  open: true
}
```

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Compile pour la production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code |

---

## 🐛 Résolution des problèmes courants

### Erreur : "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 déjà utilisé
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erreur de compilation TypeScript
```bash
npm run build
```
Vérifiez les erreurs dans la console

---

## 📂 Structure des fichiers importants

```
ibansys/
├── src/main.tsx                          # Point d'entrée
├── App.tsx                               # Composant principal
├── components/
│   ├── AVAMiseAJourBeneficiaires.tsx    # Module bénéficiaires
│   ├── Sidebar.tsx                       # Navigation
│   └── ui/                               # Composants UI
├── styles/globals.css                    # Styles globaux
├── utils.ts                              # Fonction cn()
└── package.json                          # Dépendances
```

---

## 🎨 Palette de couleurs

- **Bleu Navy** : #435B7B (Couleur principale)
- **Navy Dark** : #2D3E54 (Accents sombres)
- **Ice Blue** : #D6E4F0 (Arrière-plans clairs)

---

## ✅ Checklist de vérification

- [ ] Node.js installé (v18+)
- [ ] Dépendances installées (`npm install`)
- [ ] Serveur démarré (`npm run dev`)
- [ ] Application accessible sur http://localhost:3000
- [ ] Navigation fonctionnelle
- [ ] Formulaires opérationnels

---

## 📞 Support

Pour toute assistance, référez-vous au fichier `README.md` ou contactez l'équipe de développement.

**Bon développement ! 🚀**
