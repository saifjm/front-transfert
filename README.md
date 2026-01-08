(The file `c:\Users\Alaa\Desktop\IbansysPoc-Poc-Migration_Core\README.md` exists, but contains only whitespace)
# Poc-Migration (trimmed to SECURITE microservice)

This repository has been trimmed to keep only the `securite` module as a focused microservice. Other modules were moved to a backup folder on the desktop: `removed_services_backup_20260108`.

## SECURITE - Overview
The `securite` module exposes validation and employee-agency functionality.

### Entities
- `ValidationOperation` (table: `VALIDATION_OPERATION`, schema `SECURITE`)
	- `id` (embedded `ValidationOperationId`): `codeProduitService` (Integer), `codeOperation` (Integer), `numDossier` (String), `dateDossier` (LocalDate)
	- `matEmp` (Integer)
	- `dateValidation` (LocalDate)
	- `codeDevise` (Integer)
	- `montant` (BigDecimal)
	- `refOperation` (Long)
	- `dateOperation` (LocalDate)

- `ValidationOperationId` (embeddable id)

- `EmployeAgence` (table: `EMPLOYE_AGENCE`)
	- `id` (embedded `EmployeAgenceId`): `matEmp` (Long), `codeAgence` (Short)
	- `numeroCaisse` (String, LOB)

- `EmployeAgenceId` (embeddable id)

### DTOs
- `ValidationOperationRequest` - payload for creating a `ValidationOperation` (fields mirrored from `ValidationOperationId` and other columns)

### Repositories
- `EmployeAgenceRepository` extends `JpaRepository<EmployeAgence, EmployeAgenceId>` with custom finders:
	- `findById_CodeAgence(Short codeAgence)`
	- `findById_MatEmp(Long matEmp)`

- `ValidationOperationRepository` extends `JpaRepository<ValidationOperation, ValidationOperationId>` and includes a finder `findByMatEmpAndDateValidation(Integer matEmp, LocalDate dateValidation)`.

### Services
- `EmployeAgenceService`
	- `getAll()`
	- `getByCodeAgence(Short)`
	- `getByMatEmp(Long)`
	- `getCodesAgenceByMatEmp(Long)` — returns distinct non-null/non-zero agency codes for an employee.

### Controllers / API Endpoints
All endpoints are under `/api`.

- `EmployeAgenceController` (base path `/api/employes-agence`)
	- `GET /api/employes-agence` — returns all `EmployeAgence` records
	- `GET /api/employes-agence/agence/{codeAgence}` — find records by `codeAgence` (Short)
	- `GET /api/employes-agence/{matEmp}` — find records for `matEmp` (Long); returns 404 if none
	- `GET /api/employes-agence/{matEmp}/codes-agence` — returns distinct agency codes (Short) for `matEmp`; 404 if none

- `ValidationOperationController` (base path `/api/securite/validations`)
	- `POST /api/securite/validations` — create a `ValidationOperation` from `ValidationOperationRequest`
	- `GET /api/securite/validations?matEmp={matEmp}&dateValidation={yyyy-MM-dd}` — find validations by employee and date
	- `GET /api/securite/validations/all` — return all validation records

For a machine-readable list, see `SECURITE_APIS.html` in the repository root.

## Run (local)
```bash
mvn spring-boot:run
# service listens on port 8080 by default (see application.properties)
```

## Notes
- The original multi-module project was separated — non-securite modules are backed up in `removed_services_backup_20260108` on the desktop.
- If you want DTOs instead of entities in responses, I can add them and update controllers.


