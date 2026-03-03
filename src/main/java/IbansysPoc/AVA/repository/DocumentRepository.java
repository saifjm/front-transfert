package IbansysPoc.AVA.repository;

import IbansysPoc.AVA.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Trouver les documents par numéro de dossier
    List<Document> findByNumDossier(Integer numDossier);

    // Trouver les documents par référence d'opération
    List<Document> findByRefOperation(Long refOperation);

    // Trouver les documents par numéro de dossier et type de document
    List<Document> findByNumDossierAndTypeDocument(Integer numDossier, Long typeDocument);

    // Trouver les documents par code produit service et code opération
    List<Document> findByCodeProduitServiceAndCodeOperation(Short codeProduitService, Short codeOperation);
}

