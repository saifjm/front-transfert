# Cas d'Utilisation - Système AVA (Diagramme)

Ce document fournit les prompts et les codes sources nécessaires pour générer les diagrammes de cas d'utilisation du système de gestion des dossiers AVA.
Il englobe toutes les opérations métier définies dans la documentation du projet (Ouverture, Alimentations diverses, Bénéficiaires, Suspsensions, Rétrocessions, Réservations, etc.).

---

## 1. Prompt Générique pour l'IA (Eraser AI, ChatGPT, Claude)
*Copiez-collez ce texte dans votre outil IA de prédilection pour initier ou modifier la génération du diagramme textuellement.*

```text
Génère-moi un diagramme de cas d'utilisation pour une application bancaire (Système AVA) qui gère les dossiers d'allocation de devises.

### Acteur(s) :
- Utilisateur (Agent Bancaire ou Système) : C'est le seul acteur principal qui interagit avec le système pour déclencher les opérations.

### Cas d'Utilisation (Opérations) :
L'acteur principal peut effectuer les opérations suivantes sur un dossier AVA :
1. "Ouverture d'un dossier"
2. "Mise à jour d'un bénéficiaire" (Lié aux règles Beneficiaire)
3. "Réservation"
4. "Générer les Frais de Voyage (FV)"
5. "Gérer les Alimentations" (Opération générique), avec les spécialisations suivantes (relation UML d'extension ou d'héritage) :
    - "Alimentation Marché Réalisable"
    - "Alimentation Exportateur"
    - "Alimentation AA"
    - "Alimentation BCT"
6. "Gérer les Rétrocessions" (Opération générique), avec les spécialisations suivantes :
    - "Rétrocession RAV"
    - "Rétrocession RRV"
7. "Suspendre un dossier" (Suspension)
8. "Lever la suspension d'un dossier" (Levée de suspension)
9. "Renouvellement d'un dossier"
10. "Clôture du dossier"

### Contraintes de styles :
- Place tous les cas d'utilisation dans une boîte de délimitation (System Boundary) nommée "Système de Gestion AVA".
- L'acteur est à l'extérieur, connecté aux fonctionnalités principales.
- Fais en sorte de relier les sous-menus "Alimentation" et "Rétrocession" de manière hiérarchique avec la mention "<<extends>>".
```

---

## 2. Code Mermaid.js
*Aperçu directement disponible dans un visualiseur Markdown compatible ou éditeur Mermaid.*

```mermaid
flowchart LR
    %% Définition de l'Acteur avec une icône visuelle
    User(("👤 Utilisateur"))

    %% Délimitation du système principal
    subgraph Systeme_AVA ["📦 Système de Gestion AVA"]
        direction TB
        
        %% Liste des Cas d'Utilisation Principaux
        UC_Ouverture(["Ouverture Dossier"])
        UC_Maj_Benef(["MàJ Bénéficiaire"])
        UC_Reservation(["Réservation"])
        UC_FV(["FV (Frais de Voyage)"])
        UC_Suspension(["Suspension"])
        UC_Levee(["Levée de suspension"])
        UC_Renouvellement(["Renouvellement"])
        UC_Cloture(["Clôture"])
        
        %% Regroupement Alimentations
        UC_Alim(["Gestion des Alimentations"])
        UC_Alim_MR(["Alimentation Marché Réalisable"])
        UC_Alim_Exp(["Alimentation Exportateur"])
        UC_Alim_AA(["Alimentation AA"])
        UC_Alim_BCT(["Alimentation BCT"])
        
        %% Regroupement Rétrocessions
        UC_Retro(["Rétrocession"])
        UC_Retro_RAV(["Rétrocession RAV"])
        UC_Retro_RRV(["Rétrocession RRV"])
    end

    %% Interactions Acteur -> Système
    User --> UC_Ouverture
    User --> UC_Maj_Benef
    User --> UC_Reservation
    User --> UC_Alim
    User --> UC_Retro
    User --> UC_FV
    User --> UC_Suspension
    User --> UC_Levee
    User --> UC_Renouvellement
    User --> UC_Cloture

    %% Liens d'Extension (Héritage/Variantes de Cas d'Utilisation)
    UC_Alim_MR -. "<<extends>>" .-> UC_Alim
    UC_Alim_Exp -. "<<extends>>" .-> UC_Alim
    UC_Alim_AA -. "<<extends>>" .-> UC_Alim
    UC_Alim_BCT -. "<<extends>>" .-> UC_Alim

    UC_Retro_RAV -. "<<extends>>" .-> UC_Retro
    UC_Retro_RRV -. "<<extends>>" .-> UC_Retro

    %% Styling Optionnel pour mieux différencier les éléments
    classDef actor fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef usecase fill:#e1f5fe,stroke:#2b8bd6,stroke-width:1px;
    classDef abstract fill:#fff3e0,stroke:#f57c00,stroke-width:2px,stroke-dasharray: 4 4;
    
    class User actor;
    class UC_Ouverture,UC_Maj_Benef,UC_Reservation,UC_FV,UC_Suspension,UC_Levee,UC_Renouvellement,UC_Cloture usecase;
    class UC_Alim,UC_Retro abstract;
    class UC_Alim_MR,UC_Alim_Exp,UC_Alim_AA,UC_Alim_BCT,UC_Retro_RAV,UC_Retro_RRV usecase;
```

---

## 3. Code Eraser.io
*Copiez le bloc de code suivant et collez-le directement dans l'interface de diagramme "as code" sur [Eraser.io](https://app.eraser.io).*

```eraser
// Acteur principal
User [shape: actor, icon: user, label: "Utilisateur"]

// Limite et modules du système AVA
Systeme AVA [shape: group] {
    Ouverture [shape: oval, label: "Ouverture Dossier"]
    MAJ_Beneficiaire [shape: oval, label: "MàJ Bénéficiaire"]
    Reservation [shape: oval, label: "Réservation"]
    FV [shape: oval, label: "Générer FV"]
    Suspension [shape: oval, label: "Suspension"]
    Levee [shape: oval, label: "Levée de suspension"]
    Renouvellement [shape: oval, label: "Renouvellement"]
    Cloture [shape: oval, label: "Clôture"]

    // Modules contenant des sous-types (Extends)
    Alimentation [shape: oval, label: "Alimentation", color: blue]
    Alimentation_MR [shape: oval, label: "Alim. Marché Réalisable"]
    Alimentation_Exp [shape: oval, label: "Alim. Exportateur"]
    Alimentation_AA [shape: oval, label: "Alim. AA"]
    Alimentation_BCT [shape: oval, label: "Alim. BCT"]

    Retrocession [shape: oval, label: "Rétrocession", color: orange]
    Retrocession_RAV [shape: oval, label: "Rétrocession RAV"]
    Retrocession_RRV [shape: oval, label: "Rétrocession RRV"]
}

// Associations principales
User > Ouverture
User > MAJ_Beneficiaire
User > Reservation
User > Alimentation
User > Retrocession
User > FV
User > Suspension
User > Levee
User > Renouvellement
User > Cloture

// Extensions pour les Alimentations
Alimentation_MR > Alimentation : extends [style: dashed]
Alimentation_Exp > Alimentation : extends [style: dashed]
Alimentation_AA > Alimentation : extends [style: dashed]
Alimentation_BCT > Alimentation : extends [style: dashed]

// Extensions pour les Rétrocessions
Retrocession_RAV > Retrocession : extends [style: dashed]
Retrocession_RRV > Retrocession : extends [style: dashed]
```
