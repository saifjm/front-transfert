# IBANSYS - Plateforme de Gestion de Collections

Plateforme complète de gestion de collections spécialisée dans le commerce extérieur, basée sur React, TypeScript et Tailwind CSS v4.

## 🚀 Fonctionnalités

- **Ouverture de dossier AVA** : Formulaire complet avec validation métier et intégration API
- **Mise à jour des bénéficiaires** : Gestion avancée des bénéficiaires avec règles conditionnelles
- **Design professionnel** : Interface moderne avec palette de couleurs #435B7B
- **APIs intégrées** : 6 APIs REST avec gestion d'erreur silencieuse et fallback
- **Responsive** : Interface adaptative pour desktop et mobile

## 📦 Installation

### Prérequis
- Node.js 18.x ou supérieur
- npm ou yarn

### Étapes d'installation

1. **Installer les dépendances**
```bash
npm install
```.

2. **Lancer le serveur de développement**
```bash
npm run dev
```

Le serveur démarrera automatiquement sur http://localhost:3000

## 🛠️ Scripts disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Compile le projet pour la production
- `npm run preview` - Prévisualise le build de production
- `npm run lint` - Vérifie le code avec ESLint

## 📁 Structure du projet

```
ibansys/
├── src/
│   ├── main.tsx              # Point d'entrée
│   └── vite-env.d.ts         # Types Vite
├── components/
│   ├── ui/                   # Composants UI réutilisables
│   ├── AVAMiseAJourBeneficiaires.tsx
│   ├── Sidebar.tsx
│   └── ...
├── styles/
│   └── globals.css           # Styles globaux Tailwind v4
├── utils.ts                  # Utilitaires (cn function)
├── App.tsx                   # Composant racine
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎨 Technologies utilisées

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS v4** - Framework CSS utility-first
- **Radix UI** - Composants accessibles
- **Lucide React** - Icônes
- **Sonner** - Toast notifications

## 🔌 Configuration API

Les URLs d'API sont configurées en chemins relatifs pour fonctionner avec localhost :
- `/api/agences`
- `/api/type-dossier-ava`
- `/api/type-piece-client`
- `/api/operations-deleguees/dossiers-valides-avec-nom`
- `/api/operations-deleguees/{numDossier}/summary`

## 🎯 Règles métier

### AVA - Mise à jour Bénéficiaires
- **Nouveaux bénéficiaires** : État fixé à "AA" (À activer), possibilité de suppression
- **Bénéficiaires actifs** : Seul état autorisé = "AD" (À désactiver)
- **Bénéficiaires inactifs** : Seul état autorisé = "AA" (À activer)

## 📝 License

Propriété de Société le Monde Informatique

## 👥 Support

Pour toute question ou support, contactez l'équipe de développement.

---

**Powered by Société le Monde Informatique**
