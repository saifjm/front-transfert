# Récupération des Codes Activité et Sous-Activité depuis la Base de Données

## Vue d'ensemble

Le système AVA gère les codes d'activité et de sous-activité selon des règles métier complexes qui dépendent du type de dossier. Ces codes sont récupérés depuis différentes sources de données selon le contexte d'utilisation.

## Sources des Données

### 1. Service REF (Référentiel Externe)
**Table principale** : `ACTIVITE`
- **Colonnes** : `CODE_ACTIVITE` (clé primaire), `LIB_ACTIVITE`
- **API** : `GET /api/ref/activites/search/byCode/{codeActivite}`
- **Utilisation** : Validation des codes d'activité et sous-activité pour les types de dossier 1, 2, 3 et 4

### 2. Table Locale AVA
**Table** : `AVA_ACTIVITE`
- **Colonnes** : `CODE_ACTIVITE` (clé primaire), `LIB_ACTIVITE`
- **Utilisation** : Validation des codes d'activité pour les types de dossier 3 et 5

## Logique de Validation par Type de Dossier

### Type de Dossier 1 (Exportateur)
- **Code Activité** : Validé via API REF `/api/ref/activites/search/byCode/{code}` *(lignes 293-300)*
- **Code Sous-Activité** : **Non autorisé** (exception si fourni) *(lignes 353-358)*

### Type de Dossier 2 (Marchés Réalisables à l'Étranger)
- **Code Activité** : Validé via API REF `/api/ref/activites/search/byCode/{code}` *(lignes 293-300)*
- **Code Sous-Activité** : **Non autorisé** (exception si fourni) *(lignes 353-358)*

### Type de Dossier 3 (Autres Activités)
- **Code Activité** : Validé dans table locale `AVA_ACTIVITE` *(lignes 303-311)*
- **Code Sous-Activité** : **Obligatoire** *(lignes 798-802)*, validé via API REF `/api/ref/activites/search/byCode/{code}` *(lignes 347-352)*

### Type de Dossier 4 (Type Spécifique)
- **Code Activité** : **Doit être 26** (valeur fixe obligatoire) *(lignes 314-322)*
- **Code Sous-Activité** : **Obligatoire** *(lignes 798-802)*, validé via API REF `/api/ref/activites/search/byCode/{code}` *(lignes 347-352)*

### Type de Dossier 5
- **Code Activité** : Validé dans table locale `AVA_ACTIVITE` *(lignes 303-311)*
- **Code Sous-Activité** : **Obligatoire** *(lignes 798-802)*, mais validation défaillante dans le code actuel *(lignes 353-358)*

## Preuves dans le Code Source

### Validation des Codes d'Activité
```java
// BusinessRulesServiceImpl.java - validateActiviteTypeDossier()

// Code activité obligatoire pour TOUS les types
if (codeActivite == null) {
    throw new BusinessException("CODE_ACTIVITE_OBLIGATOIRE", "Code activité obligatoire");
}

// Types 1 et 2 : validation via API REF
if (codeTypeDosAva == 1 || codeTypeDosAva == 2) {
    boolean activiteExiste = apiExterneService.verifierActiviteParCode(codeActivite);
    // ...
}

// Types 3 et 5 : validation dans table AVA_ACTIVITE
if (codeTypeDosAva == 3 || codeTypeDosAva == 5) {
    boolean activiteExiste = avaActiviteRepository.existsByCodeActivite(codeActivite);
    // ...
}

// Type 4 : valeur fixe obligatoire
if (codeTypeDosAva == 4) {
    if (codeActivite != CODE_ACTIVITE_TYPE4_OBLIGATOIRE) { // 26
        throw new BusinessException("CODE_ACTIVITE_INVALIDE_TYPE4", "...");
    }
}
```

### Validation des Codes Sous-Activité
```java
// OperationsDelegueeServiceImpl.java - contrôle d'ouverture

// Sous-activité obligatoire pour types 3, 4, 5
if (codeTypeDos != null && (codeTypeDos == 3 || codeTypeDos == 4 || codeTypeDos == 5)) {
    if (dto.getCodeSousActivite() == null) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_OBLIGATOIRE", "...");
    }
    businessRulesService.controlerCodeActiviteetSecondaire(dto.getCodeSousActivite(), ...);
}

// BusinessRulesServiceImpl.java - controlerCodeActiviteetSecondaire()

// Validation pour types 3 et 4
if (codeTypeDosAva == 3 || codeTypeDosAva == 4) {
    boolean activiteExiste = apiExterneService.verifierActiviteParCode(codeActiviteSecondaire);
    if (!activiteExiste) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_INEXISTANT", "...");
    }
    // Note: La condition else if pour rejeter 1,2,5 est mal placée
    else if ((codeTypeDosAva == 1|| codeTypeDosAva == 2|| codeTypeDosAva == 5)) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_NON_AUTORISE", "...");
    }
}
```

### 1. Lors de l'Ouverture d'un Dossier

```java
// Dans OperationsDelegueeServiceImpl.java
if (dto.getCodeSousActivite() == null) {
    if (codeTypeDos == 3 || codeTypeDos == 4 || codeTypeDos == 5) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_OBLIGATOIRE",
            "Code sous-activité obligatoire pour le type de dossier " + codeTypeDos);
    }
}

// Validation des codes
businessRulesService.validateActiviteTypeDossier(codeTypeDosAva, codeActivite);
businessRulesService.controlerCodeActiviteetSecondaire(codeSousActivite, codeTypeDosAva);
```

### 2. Validation des Codes d'Activité

```java
// BusinessRulesServiceImpl.validateActiviteTypeDossier()
if (codeTypeDosAva == 1 || codeTypeDosAva == 2) {
    // Appel API REF
    boolean existe = apiExterneService.verifierActiviteParCode(codeActivite);
}

if (codeTypeDosAva == 3 || codeTypeDosAva == 5) {
    // Vérification table locale
    boolean existe = avaActiviteRepository.existsByCodeActivite(codeActivite);
}

if (codeTypeDosAva == 4) {
    // Valeur fixe obligatoire
    if (codeActivite != 26) {
        throw new BusinessException("CODE_ACTIVITE_INVALIDE_TYPE4");
    }
}
```

### 3. Validation des Codes Sous-Activité

```java
// BusinessRulesServiceImpl.controlerCodeActiviteetSecondaire()
if (codeTypeDosAva == 3 || codeTypeDosAva == 4) {
    // Appel API REF pour validation
    boolean existe = apiExterneService.verifierActiviteParCode(codeActiviteSecondaire);
    if (!existe) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_INEXISTANT");
    }
}

// Note: Logique défaillante pour type 5
if (codeTypeDosAva == 1 || codeTypeDosAva == 2 || codeTypeDosAva == 5) {
    if (codeActiviteSecondaire != null) {
        throw new BusinessException("CODE_SOUS_ACTIVITE_NON_AUTORISE");
    }
}
```

## APIs Externes Impliquées

### Service REF (Port 8090)
```java
// ApiExterneServiceImpl.verifierActiviteParCode()
public boolean verifierActiviteParCode(Integer codeActivite) {
    ResponseEntity<Activite> response = refRestClient
        .get()
        .uri("/api/ref/activites/search/byCode/{codeActivite}", codeActivite)
        .retrieve()
        .body(Activite.class);

    return response != null;
}
```

### Endpoints REF Utilisés
- `GET /api/ref/activites/search/byCode/{codeActivite}` : Vérification existence code activité
- `GET /api/ref/activites` : Liste complète des activités (non utilisé dans la validation)

## Tables de Base de Données

### Table ACTIVITE (Service REF)
```sql
CREATE TABLE ACTIVITE (
    CODE_ACTIVITE INTEGER PRIMARY KEY,
    LIB_ACTIVITE VARCHAR(100)
);
```

### Table AVA_ACTIVITE (Locale AVA)
```sql
CREATE TABLE AVA_ACTIVITE (
    CODE_ACTIVITE INTEGER PRIMARY KEY,
    LIB_ACTIVITE VARCHAR(100)
);
```

## Problèmes Identifiés

### 1. Incohérence pour le Type 5
- **Documentation** : Code sous-activité obligatoire pour types 3, 4, 5 *(lignes 798-802)*
- **Code actuel** : La logique de rejet des sous-activités *(lignes 353-358)* ne s'applique qu'aux types 1, 2, 5, mais elle est imbriquée dans la condition des types 3-4, donc jamais exécutée pour le type 5
- **Impact** : Type 5 peut techniquement accepter des codes sous-activité (pas de rejet explicite), mais la validation d'existence n'est pas appelée

### 2. Source des Données Sous-Activité
- **Question ouverte** : Les sous-activités utilisent-elles la même table `ACTIVITE` que les activités principales ?
- **Validation actuelle** : Même API REF que pour les activités principales *(lignes 347-352)*

## Recommandations

1. **Corriger la logique de validation** pour le type 5 (autoriser et valider les codes sous-activité)
2. **Clarifier la distinction** entre codes d'activité et codes sous-activité dans la modélisation
3. **Documenter les codes disponibles** dans chaque environnement
4. **Ajouter des tests** pour valider la cohérence des règles métier

## Exemples d'Utilisation

### Dossier Type 3 (Autres Activités)
```json
{
    "codeTypeDosAva": 3,
    "codeActivite": 15,     // Validé dans AVA_ACTIVITE
    "codeSousActivite": 25  // Validé via API REF
}
```

### Dossier Type 4
```json
{
    "codeTypeDosAva": 4,
    "codeActivite": 26,     // Valeur fixe obligatoire
    "codeSousActivite": 30  // Validé via API REF
}
```

---

*Document généré le 20 avril 2026 - Mis à jour avec références de code source AVA1*</content>
<parameter name="filePath">c:\Users\anisb\OneDrive\Desktop\Refactor\AVA1\Ressources\Codes_Activite_SousActivite.md