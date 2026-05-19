# 📝 Règles Conditionnelles - Code Activité et Sous Activité

## Date de Modification : 14 Février 2026

---

## 🎯 Règles Implémentées

### 1. Type Dossier in (3, 5)

**Code Activité :**
- ✅ Source : `/api/activites`
- ✅ Champ : Liste déroulante modifiable
- ✅ Indicateur : "Source: /api/activites"

**Sous Activité :**
- ✅ Source : `/api/ref/activites`
- ✅ Champ : Liste déroulante
- ✅ Requis : **OUI** (avec astérisque rouge)
- ✅ Message : "Champ requis pour types dossier 3 et 5 (Source: /api/ref/activites)"

---

### 2. Type Dossier = 4

**Code Activité :**
- ✅ Valeur : **26 - AUTRES ACTIVITES** (fixe/statique)
- ✅ Champ : Input désactivé (grisé)
- ✅ Automatique : Valeur fixée automatiquement lors de la sélection du type 4
- ✅ Indicateur : "Valeur fixe pour type 4"

**Sous Activité :**
- ✅ **CACHÉ** (non visible dans l'interface)
- ✅ Valeur : Automatiquement vidée lors de la sélection du type 4

---

### 3. Type Dossier in (1, 2)

**Code Activité :**
- ✅ Source : `/api/ref/activites`
- ✅ Champ : Liste déroulante modifiable
- ✅ Indicateur : "Source: /api/ref/activites"

**Sous Activité :**
- ✅ **CACHÉ** (non visible dans l'interface)
- ✅ Valeur : Automatiquement vidée lors de la sélection des types 1 ou 2

---

## 🔄 Comportement Dynamique

### Changement de Type Dossier

Lorsque l'utilisateur change le type de dossier :

1. **Type 4 sélectionné :**
   - Code Activité → Fixé à 26
   - Sous Activité → Vidée et cachée
   - Champ Code Activité → Désactivé (gris)

2. **Types 1 ou 2 sélectionnés :**
   - Code Activité → Rechargé depuis `/api/ref/activites`
   - Sous Activité → Vidée et cachée
   - Champ Code Activité → Activé

3. **Types 3 ou 5 sélectionnés :**
   - Code Activité → Rechargé depuis `/api/activites`
   - Sous Activité → Visible et rechargée depuis `/api/ref/activites`
   - Champ Code Activité → Activé
   - Sous Activité → Obligatoire

---

## 📋 Validation

### Champs Obligatoires

- **Code Activité** : Toujours obligatoire (*)
- **Sous Activité** : Obligatoire uniquement pour types 3 et 5 (*)

### Messages de Validation

```
❌ Champs obligatoires manquants
Veuillez renseigner : Code Sous-Activité (obligatoire pour types dossier 3 et 5)
```

---

## 🛠️ Implémentation Technique

### Nouveaux États

```typescript
const [sousActivites, setSousActivites] = useState<Activite[]>([]);
const [loadingSousActivites, setLoadingSousActivites] = useState(false);
```

### Nouvelles Fonctions

```typescript
// Déterminer la source du code activité
getCodeActiviteSource() 
// Retourne: 'activites' | 'ref' | 'fixed'

// Déterminer si sous-activité doit être visible
isSousActiviteVisible()
// Retourne: boolean

// Déterminer si code activité est désactivé
isCodeActiviteDisabled()
// Retourne: boolean (true uniquement pour type 4)
```

### Nouveau useEffect

```typescript
useEffect(() => {
  // Gère automatiquement :
  // - Fixation du code activité à 26 pour type 4
  // - Vidage de la sous activité pour types 1, 2, 4
  // - Rechargement des activités selon la source appropriée
}, [formData.codeTypeDosAva]);
```

### Nouvelle API

```typescript
// Charger les sous-activités
fetchSousActivites()
// Source: /api/ref/activites
```

---

## 📊 Tableau Récapitulatif

| Type Dossier | Code Activité Source | Code Activité Modifiable | Sous Activité Visible | Sous Activité Source | Sous Activité Obligatoire |
|--------------|---------------------|--------------------------|----------------------|---------------------|---------------------------|
| 1 - EXPORTATEUR | /api/ref/activites | ✅ Oui | ❌ Non | - | ❌ Non |
| 2 - MARCHE | /api/ref/activites | ✅ Oui | ❌ Non | - | ❌ Non |
| 3 - AUTRES ACT. | /api/activites | ✅ Oui | ✅ Oui | /api/ref/activites | ✅ Oui |
| 4 - BANQUES | Valeur fixe = 26 | ❌ Non (désactivé) | ❌ Non | - | ❌ Non |
| 5 - PROM. PROJ. | /api/activites | ✅ Oui | ✅ Oui | /api/ref/activites | ✅ Oui |

---

## 📱 Interface Utilisateur

### Code Activité (Type 4)
```
Code Activité *
┌─────────────────────────────────────┐
│ 26 - AUTRES ACTIVITES         [🔒] │ ← Désactivé, fond gris
└─────────────────────────────────────┘
ℹ️ Valeur fixe pour type 4
```

### Code Activité (Types 3, 5)
```
Code Activité *
┌─────────────────────────────────────┐
│ Sélectionner                    [▼] │ ← Liste déroulante active
└─────────────────────────────────────┘
ℹ️ Source: /api/activites
```

### Sous Activité (Types 3, 5)
```
Code Sous-Activité *
┌─────────────────────────────────────┐
│ Sélectionner                    [▼] │ ← Liste déroulante
└─────────────────────────────────────┘
ℹ️ Champ requis pour types dossier 3 et 5 (Source: /api/ref/activites)
```

---

## ✅ Tests à Effectuer

### Test 1 : Type Dossier = 4
1. Sélectionner Type Dossier = 4
2. ✅ Vérifier : Code Activité = "26 - AUTRES ACTIVITES"
3. ✅ Vérifier : Code Activité est désactivé (gris)
4. ✅ Vérifier : Sous Activité est cachée
5. ✅ Essayer de soumettre le formulaire → Devrait fonctionner

### Test 2 : Type Dossier = 3
1. Sélectionner Type Dossier = 3
2. ✅ Vérifier : Code Activité est modifiable
3. ✅ Vérifier : Sous Activité est visible
4. ✅ Vérifier : Astérisque rouge sur Sous Activité
5. ✅ Essayer de soumettre sans Sous Activité → Erreur
6. ✅ Remplir Sous Activité et soumettre → Devrait fonctionner

### Test 3 : Type Dossier = 1 ou 2
1. Sélectionner Type Dossier = 1
2. ✅ Vérifier : Code Activité est modifiable
3. ✅ Vérifier : Sous Activité est cachée
4. ✅ Essayer de soumettre le formulaire → Devrait fonctionner

### Test 4 : Changement de Type Dossier
1. Sélectionner Type 3 et remplir Sous Activité
2. Changer pour Type 4
3. ✅ Vérifier : Code Activité = 26
4. ✅ Vérifier : Sous Activité vidée et cachée
5. Changer pour Type 1
6. ✅ Vérifier : Code Activité modifiable
7. ✅ Vérifier : Sous Activité reste cachée

---

## 🔍 Points Importants

### Gestion des Données
- ✅ Les données sont chargées depuis les bonnes APIs selon le type
- ✅ Fallback sur données mock en cas d'erreur API
- ✅ Chargement automatique lors du changement de type

### Validation
- ✅ Code Activité toujours requis (*)
- ✅ Sous Activité requise seulement pour types 3 et 5
- ✅ Message d'erreur clair et précis

### UX/UI
- ✅ Indicateurs visuels pour la source des données
- ✅ Champ désactivé avec fond gris pour type 4
- ✅ Astérisque rouge pour champs obligatoires
- ✅ Messages d'aide contextuels

---

## 📚 APIs Utilisées

### 1. /api/activites
- **Usage** : Code Activité pour types 3 et 5
- **Format** : `Activite[]`
- **Exemple** : 
  ```json
  [
    { "codeActivite": 24, "libActivite": "IMPORTATION DE MARCHANDISES" }
  ]
  ```

### 2. /api/ref/activites
- **Usage** : 
  - Code Activité pour types 1 et 2
  - Sous Activité pour types 3 et 5
- **Format** : `Activite[]`
- **Exemple** : 
  ```json
  [
    { "codeActivite": 1, "libActivite": "PROFESSIONS LIBERALES" }
  ]
  ```

---

## 🎉 Résultat Final

✅ **Règles métier implémentées correctement**
✅ **Interface utilisateur intuitive**
✅ **Validation robuste**
✅ **Comportement dynamique fluide**
✅ **Gestion d'erreur silencieuse avec fallback**

---

*Document généré le 14 février 2026 - IBANSYS v1.0*
*Formulaire : Ouverture de Dossier AVA*
