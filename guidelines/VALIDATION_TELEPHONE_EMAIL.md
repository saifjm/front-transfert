# 📞 Validation Téléphone et Email - Formulaire AVA

## Date : 14 Février 2026

---

## 📋 Modifications Effectuées

### 1. Ajout du champ Email

**Interface DTO mise à jour :**
```typescript
interface InitiationOuvertureDTO {
  // ... autres champs
  tel?: string;
  email?: string;  // ✅ NOUVEAU
  // ... autres champs
}
```

### 2. Validation du Téléphone Tunisien

**Formats acceptés :**
- ✅ **8 chiffres** : `12345678`
- ✅ **+216 + 8 chiffres** : `+21612345678`
- ✅ **00216 + 8 chiffres** : `0021612345678`

**Exemples valides :**
```
12345678          ✓
20123456          ✓
+21620123456      ✓
+21612345678      ✓
0021620123456     ✓
0021612345678     ✓
```

**Exemples invalides :**
```
1234567           ✗ (7 chiffres)
123456789         ✗ (9 chiffres)
+215XXXXXXXX      ✗ (mauvais code pays)
+216 12345678     ✗ (espace)
21612345678       ✗ (manque + ou 00)
```

### 3. Validation de l'Email

**Format standard RFC :**
```
utilisateur@domaine.extension
```

**Exemples valides :**
```
jean.dupont@email.com        ✓
contact@entreprise.tn        ✓
info@site.co.uk              ✓
user123@service.fr           ✓
```

**Exemples invalides :**
```
email                        ✗ (pas de @)
@domaine.com                 ✗ (pas d'utilisateur)
user@                        ✗ (pas de domaine)
user @email.com              ✗ (espace)
user@domaine                 ✗ (pas d'extension)
```

---

## 🎨 Interface Utilisateur

### Champ Téléphone

```
Téléphone
┌─────────────────────────────────────┐
│ +21612345678 ou 12345678            │ ← Placeholder explicite
└─────────────────────────────────────┘
✓ Format valide                         ← Message de confirmation vert
```

**Avec erreur :**
```
Téléphone
┌─────────────────────────────────────┐
│ 123456                          [!] │ ← Bordure rouge
└─────────────────────────────────────┘
⚠️ Numéro de téléphone invalide...      ← Message d'erreur rouge
```

### Champ Email

```
Email
┌─────────────────────────────────────┐
│ exemple@email.com                   │ ← Placeholder standard
└─────────────────────────────────────┘
✓ Email valide                          ← Message de confirmation vert
```

**Avec erreur :**
```
Email
┌─────────────────────────────────────┐
│ email@invalide                  [!] │ ← Bordure rouge
└─────────────────────────────────────┘
⚠️ Adresse email invalide               ← Message d'erreur rouge
```

---

## 🔍 Validation en Temps Réel

### Comportement du Téléphone

1. **Saisie utilisateur** → Validation immédiate
2. **Format invalide** :
   - Bordure rouge sur le champ
   - Message d'erreur en rouge sous le champ
3. **Format valide** :
   - Bordure normale
   - Message "✓ Format valide" en vert

### Comportement de l'Email

1. **Saisie utilisateur** → Validation immédiate
2. **Format invalide** :
   - Bordure rouge sur le champ
   - Message "Adresse email invalide"
3. **Format valide** :
   - Bordure normale
   - Message "✓ Email valide" en vert

---

## ✅ Validation à la Soumission

### Vérifications Effectuées

```typescript
// 1. Si téléphone renseigné → doit être valide
if (formData.tel) {
  const telValidation = validateTelephoneTunisien(formData.tel);
  if (telValidation) {
    toast.error('Téléphone invalide', {
      description: telValidation,
    });
    return; // ❌ Bloque la soumission
  }
}

// 2. Si email renseigné → doit être valide
if (formData.email) {
  const emailValidation = validateEmail(formData.email);
  if (emailValidation) {
    toast.error('Email invalide', {
      description: emailValidation,
    });
    return; // ❌ Bloque la soumission
  }
}
```

### Messages d'Erreur

**Téléphone invalide :**
```
❌ Téléphone invalide
Numéro de téléphone invalide. Format attendu : 8 chiffres, +216XXXXXXXX ou 00216XXXXXXXX
```

**Email invalide :**
```
❌ Email invalide
Adresse email invalide
```

---

## 📊 Structure des Données

### Nouveaux États

```typescript
const [telError, setTelError] = useState<string>('');
const [emailError, setEmailError] = useState<string>('');
```

### Nouvelles Fonctions de Validation

```typescript
// Validation téléphone tunisien
validateTelephoneTunisien(tel: string): string

// Validation email
validateEmail(email: string): string
```

---

## 🧪 Scénarios de Test

### Test 1 : Téléphone 8 Chiffres

1. Saisir : `12345678`
2. ✅ Vérifier : Message "✓ Format valide"
3. ✅ Soumettre → Devrait fonctionner

### Test 2 : Téléphone +216

1. Saisir : `+21620123456`
2. ✅ Vérifier : Message "✓ Format valide"
3. ✅ Soumettre → Devrait fonctionner

### Test 3 : Téléphone 00216

1. Saisir : `0021620123456`
2. ✅ Vérifier : Message "✓ Format valide"
3. ✅ Soumettre → Devrait fonctionner

### Test 4 : Téléphone Invalide

1. Saisir : `123456` (6 chiffres)
2. ✅ Vérifier : Bordure rouge
3. ✅ Vérifier : Message d'erreur affiché
4. ✅ Soumettre → Bloqué avec toast d'erreur

### Test 5 : Email Valide

1. Saisir : `contact@entreprise.tn`
2. ✅ Vérifier : Message "✓ Email valide"
3. ✅ Soumettre → Devrait fonctionner

### Test 6 : Email Invalide

1. Saisir : `email@invalide`
2. ✅ Vérifier : Bordure rouge
3. ✅ Vérifier : Message "Adresse email invalide"
4. ✅ Soumettre → Bloqué avec toast d'erreur

### Test 7 : Champs Vides (Optionnels)

1. Laisser téléphone et email vides
2. ✅ Remplir les autres champs obligatoires
3. ✅ Soumettre → Devrait fonctionner (pas obligatoires)

### Test 8 : Téléphone avec Espaces

1. Saisir : `+216 20 123 456` (avec espaces)
2. ✅ Vérifier : Erreur de format
3. Note : Les espaces ne sont pas acceptés

---

## 📝 Règles Métier

### Téléphone

- **Obligatoire** : ❌ NON (optionnel)
- **Format** : Numéro tunisien uniquement
- **Validation** : En temps réel + à la soumission
- **Pays accepté** : Tunisie (+216) uniquement

### Email

- **Obligatoire** : ❌ NON (optionnel)
- **Format** : Email standard RFC
- **Validation** : En temps réel + à la soumission
- **Cas** : Sensible (minuscules/majuscules acceptées)

---

## 🎯 Expressions Régulières Utilisées

### Téléphone Tunisien

```javascript
// 8 chiffres
const regex8Digits = /^\d{8}$/;

// +216 suivi de 8 chiffres
const regexPlus216 = /^\+216\d{8}$/;

// 00216 suivi de 8 chiffres
const regex00216 = /^00216\d{8}$/;
```

### Email

```javascript
// Format standard : xxx@xxx.xxx
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

---

## 💡 Conseils d'Utilisation

### Pour l'Utilisateur

1. **Téléphone** :
   - Saisir directement 8 chiffres (ex: 20123456)
   - Ou utiliser le format international (+21620123456)
   - Pas d'espaces ni de tirets

2. **Email** :
   - Format standard : nom@domaine.extension
   - Vérifier l'orthographe avant de soumettre
   - Pas d'espaces

### Pour le Développeur

1. La validation est **non-bloquante** en temps réel
2. La validation **bloque** la soumission si erreur
3. Les champs restent **optionnels** (pas d'astérisque)
4. Messages clairs et explicites

---

## 📋 Checklist de Vérification

- [x] Champ email ajouté à l'interface DTO
- [x] Fonction de validation téléphone tunisien
- [x] Fonction de validation email
- [x] Validation en temps réel (onChange)
- [x] Messages d'erreur affichés sous les champs
- [x] Bordure rouge en cas d'erreur
- [x] Message de confirmation vert si valide
- [x] Validation à la soumission
- [x] Toast d'erreur si soumission avec erreur
- [x] Placeholders informatifs
- [x] Documentation complète

---

## 🔄 Layout Modifié

### Avant

```
┌────────────┬────────────┬────────────────┐
│  Compte    │ Téléphone  │ Code Activité  │
└────────────┴────────────┴────────────────┘
```

### Après

```
┌────────────┬────────────┬───────┐
│  Compte    │ Téléphone  │ Email │
└────────────┴────────────┴───────┘

┌──────────────────────────────────┐
│       Code Activité *            │
└──────────────────────────────────┘
```

**Note** : Code Activité déplacé dans une nouvelle ligne pour accommoder l'email

---

## ✨ Améliorations UX

1. **Feedback Immédiat** : Validation instantanée pendant la saisie
2. **Indicateurs Visuels** : Bordures colorées (rouge/normal)
3. **Messages Clairs** : Explications précises des formats attendus
4. **Confirmation Positive** : Coche verte pour formats valides
5. **Placeholders Explicites** : Exemples de formats corrects

---

## 🎉 Résultat Final

✅ **Téléphone** : Validation stricte pour numéros tunisiens
✅ **Email** : Validation standard RFC
✅ **UX** : Retour visuel immédiat
✅ **Validation** : En temps réel + à la soumission
✅ **Optionnel** : Les deux champs restent facultatifs

---

*Document généré le 14 février 2026 - IBANSYS v1.0*
*Module : Ouverture Dossier AVA*
*Société le Monde Informatique*
