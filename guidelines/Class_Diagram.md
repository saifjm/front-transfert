# Class Diagram — Mermaid Prompt & Starter

This file provides a clear, high-quality prompt you can feed to Mermaid (or an LLM that emits Mermaid) to generate a class diagram for this project. It also includes a ready-to-use Mermaid `classDiagram` block illustrating the core entities and relations inferred from the codebase (adjust fields as needed).

---

## How to use
- Paste the Mermaid block below into any Mermaid renderer (e.g., Live Editor, VS Code Mermaid preview, or an LLM-to-Mermaid tool).
- Or give the natural-language prompt under "Mermaid Prompt (natural language)" to an LLM that outputs Mermaid.

---

## Mermaid Prompt (natural language)

"Produce a Mermaid `classDiagram` that models the core domain entities and relationships for the AVA project.
- Include classes for `OperationsDeleguee`, `OperationsDelegueesMvt`, `Beneficiaire`, `Document`, and `AvaMarche`.
- For each class list primary key fields and the most relevant attributes (infer typical fields if missing: amounts, dates, status flags, references).
- Show associations with cardinalities: a dossier (`OperationsDeleguee`) has many `Beneficiaire` and many `Document`, has one optional `AvaMarche`, and is related to many `OperationsDelegueesMvt` (movement history).
- Annotate one-to-many and one-to-one relationships and mark aggregate roots where applicable.
- Add short notes next to relationships where concurrency concerns matter (e.g., `mntAutorise` updated under pessimistic lock).
- Keep the diagram readable: group attributes logically, and show navigation arrows and multiplicities.
- Use explicit types (String, BigDecimal/Decimal, LocalDate/DateTime, Long/Integer) for attributes.

Return the output as a Mermaid `classDiagram` code block only, ready to render."

---

## Mermaid Starter (copy-paste)

```mermaid
classDiagram
  %% Entities
  class OperationsDeleguee {
    +String numDossier
    +LocalDate dateDossier
    +String numeroCompte
    +BigDecimal mntAutorise
    +BigDecimal mntUtilise
    +BigDecimal solde
    +BigDecimal mntAutoriseBct
    +String etatDossier
    +Long dernierNumMvtAva
  }

  class OperationsDelegueesMvt {
    +Long refOperation
    +String numDossier
    +LocalDateTime dateOperation
    +String codeOperation
    +BigDecimal montant
    +String status
  }

  class Beneficiaire {
    +String id.numDossier
    +LocalDate id.dateDossier
    +Integer id.numeroBenef
    +String nom
    +String adresse
    +String qualite
  }

  class Document {
    +Long id
    +String numDossier
    +String typeDocument
    +String reference
  }

  class AvaMarche {
    +Long id
    +String numDossier
    +String marcheRef
    +String description
  }

  %% Relationships and cardinalities
  OperationsDeleguee "1" -- "0..*" Beneficiaire : contains
  OperationsDeleguee "1" -- "0..*" Document : has
  OperationsDeleguee "1" -- "0..1" AvaMarche : uses
  OperationsDeleguee "1" -- "0..*" OperationsDelegueesMvt : history

  %% Notes / annotations
  note right of OperationsDeleguee : Aggregate root; write operations
  note right of OperationsDeleguee : `mntAutorise` updates guarded by
  note right of OperationsDeleguee : pessimistic locks in services

  %% Example directional relation if needed
  OperationsDelegueesMvt --> OperationsDeleguee : references
```

---

If you'd like, I can:
- Render this Mermaid and save an SVG/PNG preview, or
- Enrich the diagram by scanning all `@Entity` classes in the workspace and adding exact attributes and associations automatically.

Which would you prefer next?