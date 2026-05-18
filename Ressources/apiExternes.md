# Documentation des Appels d'API Externes (Microservice REF)

Ce document explique comment nous avons interagi avec le microservice global **REF** (depuis le projet `AVA`) pour récupérer les données manquantes nécessaires à la génération de notre fichier PDF (JasperReports), notamment le nom, le prénom et l'adresse du bénéficiaire.

## 1. Méthode utilisée dans `ApiExterneService`

Nous utilisons le service `ApiExterneService` qui effectue des requêtes HTTP (via un `RestTemplate` ou un client Feign) vers le microservice `REF`.

**Signature de la méthode :**
```java
PersonneDTO getPersonneInfo(Integer typePiece, String numeroPiece);
```

**Informations fournies par l'API :**
L'API prend en paramètre le type de la pièce d'identité (`typePieceBenef`) et le numéro de la pièce (`noPieceBenef`) pour retourner un objet `PersonneDTO`.

## 2. Mise à jour du `PersonneDTO`
À l'origine, le `PersonneDTO` de notre projet de test (`AVA1`) ne contenait que le champ `nom`. Nous l'avons mis à jour pour correspondre à l'entité `Personne` du microservice `REF` afin de pouvoir capturer l'adresse et le prénom :

```java
public class PersonneDTO {
    private String nom;
    private String prenom;
    private String adrRes1;
    private String adrRes2;
    private String adrRes3;
    // + getters et setters
}
```

## 3. Comment l'API est utilisée pour le rapport Jasper

Dans notre service principal d'exportateur (`OperationExportateurAVAServiceImpl`), lors de la préparation des paramètres (`parameters.put(...)`) pour le template Jasper `.jrxml`, nous appelons l'API de cette manière :

```java
// 1. Initialisation des variables avec des valeurs par défaut
String adresseBenef = ""; 
String nomTitulaire = dto.getNoPieceBenef() != null ? dto.getNoPieceBenef() : "";

try {
    // 2. Appel de l'API Externe pour récupérer les informations de la Personne
    Integer typePiece = dto.getTypePieceBenef() != null ? dto.getTypePieceBenef() : 1;
    String noPiece = dto.getNoPieceBenef() != null ? dto.getNoPieceBenef() : "";

    IbansysPoc.AVA.DTO.PersonneDTO pers = apiExterneService.getPersonneInfo(typePiece, noPiece);
    
    if (pers != null) {
        // 3. Construction du Nom Complet (Nom + Prénom)
        String nom = pers.getNom() != null ? pers.getNom() : "";
        String prenom = pers.getPrenom() != null ? pers.getPrenom() : "";
        String fullName = (nom + " " + prenom).trim();
        if (!fullName.isEmpty()) {
            nomTitulaire = fullName;
        }

        // 4. Construction de l'Adresse complète (Concaténation de Adr1, Adr2, Adr3)
        String adr1 = pers.getAdrRes1() != null ? pers.getAdrRes1() : "";
        String adr2 = pers.getAdrRes2() != null ? pers.getAdrRes2() : "";
        String adr3 = pers.getAdrRes3() != null ? pers.getAdrRes3() : "";
        adresseBenef = (adr1 + " " + adr2 + " " + adr3).trim();
    }
} catch (Exception e) {
    log.warn("Impossible de récupérer les informations du bénéficiaire via API REF", e);
}

// 5. Injection dans les paramètres Jasper (qui iront dans le PDF)
parameters.put("adresse", adresseBenef);
parameters.put("nomOuDenomination", nomTitulaire);
```

### Résumé Bilan
* **Nom Jasper :** `nomOuDenomination` -> Récupère `pers.getNom()` + `pers.getPrenom()`.
* **Adresse Jasper :** `adresse` -> Récupère `pers.getAdrRes1()` + `pers.getAdrRes2()` + `pers.getAdrRes3()`.
* **Titulaire Allocation :** `titulaireAllocation` -> Récupéré directement depuis le DTO entrant via `dto.getNumDossierAva()`.