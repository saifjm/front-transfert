# Intégration JasperReports — Guide rapide

But: Quand l'utilisateur remplit le formulaire d'"opération alimentation exportateur", on doit générer un PDF rempli à partir d'un template Jasper (.jrxml) et des données JSON de l'exportateur. La template .jrxml sera fournie par l'équipe.

**Prérequis**
- Projet Maven (Spring Boot) ou équivalent.
- Template Jasper (.jrxml) fournie et placée dans `src/main/resources/reports/`.
- Les données de l'exportateur sont disponibles en JSON (payload du formulaire).

**Dépendances Maven (extrait)**
Ajoutez dans le `pom.xml`:

```xml
<dependency>
  <groupId>net.sf.jasperreports</groupId>
  <artifactId>jasperreports</artifactId>
  <version>6.22.0</version>
</dependency>

<!-- Pour JSON -> Java mapping si nécessaire -->
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.15.2</version>
</dependency>
```

(Adaptez la version selon la compatibilité de votre stack.)

**Emplacement recommandé des templates**
- `src/main/resources/reports/mon_template.jrxml`
- Option: précompiler en `.jasper` pendant le build, ou compiler à l'exécution.

**Étapes d'intégration (haut niveau)**
1. Placer le fichier `.jrxml` dans `resources/reports/`.
2. Ajouter les dépendances Maven (jasperreports + jackson si besoin).
3. Définir le mapping JSON -> Java (DTO) ou utiliser `net.sf.jasperreports.engine.data.JRMapCollectionDataSource` ou `JsonDataSource`.
4. Implémenter un `ReportService` qui :
   - charge et compile le `.jrxml` (ou charge le `.jasper` précompilé),
   - prépare la `Map<String,Object>` des paramètres du rapport,
   - crée la datasource (JRBeanCollectionDataSource / JsonDataSource / JRMapCollectionDataSource),
   - remplit le rapport via `JasperFillManager.fillReport(...)`,
   - exporte en PDF via `JasperExportManager.exportReportToPdf(...)` ou `exportReportToPdfStream`.
5. Depuis le controller lié au formulaire d'alimentation exportateur :
   - recevoir/valider le JSON,
   - appeler le `ReportService` pour générer le PDF,
   - renvoyer le PDF au client (ResponseEntity<byte[]> avec `application/pdf` et header `Content-Disposition`) ou stocker le fichier et renvoyer un lien.
6. Gérer erreurs, logs, et limites de taille.
7. Tester avec des payloads JSON représentatifs et vérifier que tous les champs du template sont alimentés.

**Exemple concis de service (concept)**

- Charger et compiler :
```java
InputStream jrxml = resourceLoader.getResource("classpath:reports/mon_template.jrxml").getInputStream();
JasperReport jasperReport = JasperCompileManager.compileReport(jrxml);
```
- Préparer datasource (si vous mappez JSON -> DTOList) :
```java
JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(listDto);
Map<String,Object> params = new HashMap<>();
params.put("logo", logoInputStream);
JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
byte[] pdf = JasperExportManager.exportReportToPdf(jasperPrint);
```
- Retourner `byte[]` et envoyer `application/pdf`.

**Conseils pratiques**
- Si le template est stable, précompilez `.jrxml` en `.jasper` au build pour améliorer les performances.
- Utilisez `JsonDataSource` si vous fournissez directement un InputStream JSON, ou mappez vers DTO pour plus de contrôle.
- Testez localement avec des JSON minimaux et des cas extrêmes (champs manquants, listes vides).
- Prévoir un `fonts` bundle si templates utilisent des polices spécifiques (jasperreports-fonts ou embedding de polices).

**Sécurité & montée en charge**
- Limitez la taille du payload de formulaire.
- Si génération PDF peut être lourde, exécuter en tâche asynchrone (queue) et renvoyer un lien quand prêt.

**Exemples d'appels (cURL)**
- Endpoint Spring qui retourne le PDF :
```
curl -X POST -H "Content-Type: application/json" --data @sample-exportateur.json http://localhost:8080/api/exportateur/generatePdf --output exportateur.pdf
```

**Tests**
- Unit tests pour `ReportService` : injecter un petit JSON, vérifier que `exportReportToPdf` retourne un tableau non vide.
- Tests d'intégration pour le controller : vérifier code HTTP, headers, et contenu PDF minimal.

**Checklist avant livraison**
- [ ] Template `.jrxml` fournie et validée
- [ ] Dépendances ajoutées au `pom.xml`
- [ ] `ReportService` implémenté et testé
- [ ] Controller lié au formulaire connecté
- [ ] Tests unitaires & d'intégration ajoutés
- [ ] Documentation d'usage (ex: endpoint, paramètres attendus)

---

**Prompt prêt à l'emploi pour adapter le template (.jrxml) au JSON de l'exportateur**

Utilisez ce prompt pour demander à un développeur ou à une IA d'adapter le template fourni au format JSON que vous allez donner.

Prompt (en français) :

"Je te fournis deux éléments : (1) un fichier template JasperReports `.jrxml` (nom : TEMPLATE_FILE_PATH) et (2) un exemple de payload JSON provenant du formulaire d'alimentation exportateur (fichier : SAMPLE_JSON). Ta tâche :

- Lister tous les champs du template `.jrxml` (paramètres et champs de dataset) et expliquer à quel chemin JSON chacun doit être mappé.
- Si un champ du template n'a pas d'équivalent direct dans le JSON, proposer une expression de transformation (ex : concaténation, formatage date, montant avec séparateur décimal) et indiquer où effectuer la transformation (dans Java avant remplissage ou via une expression dans le template).
- Produire un mapping clair `templateField -> json.path` (ex : `exporter.name -> exporter.client.nom`).
- Si le rapport contient une sous-table (liste), indiquer la structure JSON attendue (ex : `items[]`) et fournir un exemple minimal de JSON pour la collection.
- Optionnel : proposer les modifications minimales dans le `.jrxml` (noms de champs/paramètres) pour qu'il accepte directement le JSON sans transformation lourde.

Fournis en sortie :
1) Le tableau de mapping `field | type | jsonPath | transformation`.
2) Un exemple de DTO Java (classe) correspondant au JSON si le mapping recommande de convertir en POJO.
3) Les modifications suggérées dans `.jrxml` (si nécessaires), présentées en diff/textuel.

Voici l'exemple JSON :

<<COLLER ICI LE SAMPLE_JSON>>

Et voici le template :

- TEMPLATE_FILE_PATH : <<DONNER_LE_CHEMIN_RELATIF_DU_JRXML>>

Merci — fournis la sortie structurée et concise, et indique si tu veux que je génère le code Java pour la conversion JSON->DTO et le `ReportService`." 

---

Si tu veux, je peux maintenant :
- ajouter la dépendance dans `pom.xml` (commit proposé),
- créer un `ReportService` de base et un controller d'exemple,
- ou attendre que tu me fournisses la template `.jrxml` et un JSON d'exemple pour générer le mapping automatiquement.

Fichier créé : [Report.md](AVA1/Report.md)
