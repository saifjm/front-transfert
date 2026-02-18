# AVA-gen-service

Small microservice exposing generated entities (DOCUMENTS) from the original project.

Run:

```bash
cd "C:\Users\Alaa\Desktop\AVA-gen-service"
mvn spring-boot:run
```

Service runs on port `8085` by default and exposes the Documents API under `/api/documents`.

**APIs**

- **GET /api/documents**: Returns a JSON array of all `Document` records.

	Example response (200):

	```json
	[
		{
			"id": {
				"codeProduitService": 1,
				"codeOperation": 2,
				"refOperation": 123456,
				"dateOperation": "2025-12-31",
				"numLigne": 1
			},
			"uniteOperation": 10,
			"typeDossier": "ABC",
			"numDossier": 1000,
			"dateDossier": "2025-12-31",
			"referenceFichierJoint": "file-ref",
			"pathAnnee": "2025",
			"pathMois": "12",
			"extention": "pdf"
		}
	]
	```

- **POST /api/documents**: Create a new `Document`. Expects a `Document` JSON in request body. Returns the saved `Document`.

	Example request body:

	```json
	{
		"id": {
			"codeProduitService": 1,
			"codeOperation": 2,
			"refOperation": 123456,
			"dateOperation": "2025-12-31",
			"numLigne": 1
		},
		"uniteOperation": 10,
		"typeDossier": "ABC",
		"numDossier": 1000,
		"dateDossier": "2025-12-31",
		"referenceFichierJoint": "file-ref",
		"pathAnnee": "2025",
		"pathMois": "12",
		"extention": "pdf"
	}
	```

	cURL example:

	```bash
	curl -X POST http://localhost:8085/api/documents \
		-H "Content-Type: application/json" \
		-d '@document.json'
	```

- **GET /api/documents/id**: Returns a single `Document` matching the provided `DocumentId`.

	NOTE: The current controller expects a `DocumentId` object in the request body for this endpoint (non-standard for GET). Example request body:

	```json
	{
		"codeProduitService": 1,
		"codeOperation": 2,
		"refOperation": 123456,
		"dateOperation": "2025-12-31",
		"numLigne": 1
	}
	```

	cURL example:

	```bash
	curl -X GET http://localhost:8085/api/documents/id \
		-H "Content-Type: application/json" \
		-d '@id.json'
	```

Entity fields

- **Document** (see `src/main/java/com/example/avagen/entity/gen/Document.java`):
	- `id` (embedded `DocumentId`)
	- `uniteOperation` (Short)
	- `typeDossier` (String)
	- `numDossier` (Long)
	- `dateDossier` (LocalDate)
	- `referenceFichierJoint` (String)
	- `pathAnnee` (String)
	- `pathMois` (String)
	- `extention` (String)

- **DocumentId** (see `src/main/java/com/example/avagen/entity/gen/DocumentId.java`):
	- `codeProduitService` (Short)
	- `codeOperation` (Short)
	- `refOperation` (Long)
	- `dateOperation` (LocalDate)
	- `numLigne` (Short)

Notes and recommendations

- The `GET /api/documents/id` endpoint currently expects a JSON body; consider changing it to `GET /api/documents/{...}` or use `POST /api/documents/search` for better REST semantics.
- Database configuration is in `src/main/resources/application.properties`.

If you want, I can:
- update the controller to accept `GET /api/documents/{...}` for lookups, or
- add an H2 profile for local testing while keeping the Oracle config.
