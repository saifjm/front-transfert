package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.AgenceDTO;
import IbansysPoc.AVA.DTO.DeclarationCAFHTDTO;
import IbansysPoc.AVA.DTO.DeclarationFiscaleDTO;
import IbansysPoc.AVA.DTO.EmailQueueDTO;
import IbansysPoc.AVA.DTO.NotificationClientRequest;
import IbansysPoc.AVA.DTO.PersonneDTO;

import java.util.Optional;

/**
 * Interface pour consommer les APIs externes.
 */
public interface ApiExterneService {

    /**
     * Recuperer l'etat et le CA fiscal annee N-1.
     * Endpoint: /api/declarations-fiscales/etat-ca-fiscal
     */
    DeclarationFiscaleDTO getEtatCaFiscal(String noPieceClient, Integer typePieceClient);

    /**
     * Recuperer l'etat et le CA fiscal annee N-2.
     * Endpoint: /api/declarations-fiscales/etat-ca-fiscal-2
     */
    DeclarationFiscaleDTO getEtatCaFiscal2(String noPieceClient, Integer typePieceClient);

    /**
     * Recuperer les informations d'une agence par code banque et code agence BCT.
     * Endpoint: /api/ref/agences/by-codes/{codeBanque}/{codeAgenceBct}
     * Microservice: REF (port 8443)
     */
    AgenceDTO getAgenceByCode(Integer codeBanque, Integer codeAgenceBct);



    /**
     * Vérifier l'existence d'une personne par type et numéro de pièce.
     * Endpoint: /api/ref/personnes/verif/{typePiecePersonne}/{noPiecePersonne}
     * Microservice: REF (port 8443)
     *
     * @param typePiecePersonne Type de pièce (ex: 1=CIN, 2=Passeport, etc.)
     * @param noPiecePersonne Numéro de la pièce
     * @return 0 si la personne existe, autre valeur sinon
     */
    Integer verifierPersonne(Integer typePiecePersonne, String noPiecePersonne);

    /**
     * Vérifier l'existence d'une personne par numéro de pièce uniquement.
     * Endpoint: /api/ref/personnes/by-nopiececlient/{noPiecePersonne}
     * Microservice: REF (port 8443)
     *
     * @param noPieceBenef Numéro de la pièce du bénéficiaire
     * @return true si au moins une personne est trouvée, false sinon
     */
    boolean existsPersonneByNoPiece(String noPieceBenef);

    /**
     * Récupérer la personne complète depuis le microservice REF.
     * Endpoint (REF): /api/ref/personnes/{typePiecePersonne}/{noPiecePersonne}
     * Remarque: la classe exacte de retour dépend du microservice REF ; ici on retourne Object
     * pour rester générique (le contrôleur peut caster si besoin).
     */
    Object getPersonne(Integer typePiecePersonne, String noPiecePersonne);

    /**
     * Récupérer les informations d'une personne par type et numéro de pièce.
     * Endpoint: /search/{typePiecePersonne}/{noPiecePersonne}
     *
     * @param typePiecePersonne Type de pièce
     * @param noPiecePersonne Numéro de pièce
     * @return DTO avec nom du client
     */
    PersonneDTO getPersonneInfo(Integer typePiecePersonne, String noPiecePersonne);

    /**
     * Contrôler le secteur d'activité.
     * Endpoint: /api/ref/secteur-activite/controler
     * Microservice: REF (port 8443)
     *
     * @param codeActivite Code de l'activité
     * @param activiteLabel Label de l'activité (défaut: "Principale")
     * @param blocage Indique si le contrôle est bloquant (défaut: true)
     * @param var Variable supplémentaire (défaut: "")
     * @return Le libellé du secteur d'activité si trouvé, null sinon
     */
    String controlerSecteurActivite(String codeActivite, String activiteLabel, boolean blocage, String var);

    /**
     * Vérifier l'existence d'une activité par son code.
     * Endpoint: /api/ref/activites/search/byCode/{codeActivite}
     * Microservice: REF (port 8443)
     *
     * @param codeActivite Code de l'activité
     * @return true si l'activité existe, false sinon
     */
    boolean verifierActiviteParCode(Integer codeActivite);

    /**
     * Vérifier l'existence d'une banque par son code.
     * Endpoint: /api/ref/banques/search/byCode/{codeBanque}
     * Microservice: REF (port 8443)
     *
     * @param codeBanque Code de la banque
     * @return true si la banque existe, false sinon
     */
    boolean verifierBanqueParCode(Short codeBanque);

    /**
     * Vérifier l'existence d'une combinaison compte (noPieceClient, codeAgenceBct, racineCompte, cleRib).
     * Endpoint: /api/ref/comptes/exists-combinaison
     * Microservice: REF (port 8443)
     *
     * @param noPieceClient Numéro de pièce client
     * @param codeAgenceBct Code agence BCT
     * @param racineCompte Racine du compte
     * @param cleRib Clé RIB
     * @return true si la combinaison existe, false sinon
     */
    boolean existsCompteByCombinaison(String noPieceClient, Integer codeAgenceBct, String racineCompte, Integer cleRib);

    Optional<Integer> getcodeBanque(Integer codeBanque);

    boolean existsOperationByProduitAndOperation(Integer codeProduitService, Integer codeOperation);


    /**
     * Créer ou mettre à jour une déclaration de CA Fiscal HT.
     * Endpoint: POST /api/declarations-caf-ht
     * Microservice: GEN (port 8085)
     *
     * @param declarationCAFHT la déclaration CA fiscal HT à sauvegarder
     * @return la déclaration sauvegardée, ou null en cas d'erreur
     */
    DeclarationCAFHTDTO saveDeclarationCAFHT(DeclarationCAFHTDTO declarationCAFHT);

    /**
     * Récupérer une déclaration CA Fiscal HT par numéro de pièce client et année.
     * Endpoint: GET /api/declarations-caf-ht/{noPieceClient}/{annee}
     * Microservice: GEN (port 8085)
     *
     * @param noPieceClient numéro de pièce du client
     * @param annee année de la déclaration
     * @return la déclaration trouvée, ou null si non trouvée
     */
    DeclarationCAFHTDTO getDeclarationCAFHT(String noPieceClient, Short annee);

    /**
     * Envoyer une notification client.
     * Endpoint: POST /api/notifications/client
     * Microservice: SWF-Mail
     *
     * Crée une notification client et l'ajoute à la file d'attente des emails.
     * Équivalent de la procédure PL/SQL NOTIF_CLIENT.
     *
     * Cette API effectue les opérations suivantes :
     * 1. Récupère le libellé de l'agence via l'API Référentiels
     * 2. Récupère le nom/prénom du client via l'API Référentiels
     * 3. Construit le message HTML avec le template standard
     * 4. Insère l'email dans la table EMAIL_QUEUE avec le statut 'PENDING'
     *
     * @param request les paramètres de la notification client
     * @return l'email créé dans la file d'attente, ou null en cas d'erreur
     */
    EmailQueueDTO notifierClient(NotificationClientRequest request);

    /**
     * Récupérer tous les emails expéditeurs reconnus.
     * Endpoint: GET /api/recognized-email-senders
     * Microservice: SWF-Mail (port 8097)
     *
     * @return la liste de tous les emails expéditeurs reconnus
     */
    java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO> getAllRecognizedEmailSenders();

    /**
     * Récupérer toutes les devises disponibles.
     * Endpoint: GET /api/ref/devises
     * Microservice: REF (port 8090)
     *
     * @return la liste de toutes les devises
     */
    java.util.List<Object> getDevises();

    /**
     * Récupérer tous les modes de paiement disponibles.
     * Endpoint: GET /api/ref/modes-paiement/getall
     * Microservice: REF (port 8090)
     *
     * @return la liste de tous les modes de paiement
     */
    java.util.List<Object> getModePaiements();

    /**
     * Récupérer tous les pays disponibles.
     * Endpoint: GET /api/ref/pays/getall
     * Microservice: REF (port 8090)
     *
     * @return la liste de tous les pays
     */
    java.util.List<Object> getPays();

}
