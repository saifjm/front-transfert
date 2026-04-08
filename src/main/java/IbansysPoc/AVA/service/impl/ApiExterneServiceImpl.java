package IbansysPoc.AVA.service.impl;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import IbansysPoc.AVA.DTO.AgenceDTO;
import IbansysPoc.AVA.DTO.DeclarationCAFHTDTO;
import IbansysPoc.AVA.DTO.DeclarationFiscaleDTO;
import IbansysPoc.AVA.DTO.EmailQueueDTO;
import IbansysPoc.AVA.DTO.NotificationClientRequest;
import IbansysPoc.AVA.service.ApiExterneService;
import lombok.extern.slf4j.Slf4j;

/**
 * Implementation du service pour consommer les APIs externes.
 * - restClient : API Declarations Fiscales (port 8085)
 * - refRestClient : API Referentiels (port 8443)
 *
 *     - secRestClient : API Securite (port 8082)
 */
@Service
@Slf4j
public class ApiExterneServiceImpl implements ApiExterneService {

    private final RestClient restClient;
    private final RestClient refRestClient;
    private final RestClient secRestClient;
    private final RestClient swfRestClient;


    public ApiExterneServiceImpl(
            @Qualifier("restClient") RestClient restClient,
            @Qualifier("refRestClient") RestClient refRestClient,
            @Qualifier("secRestClient") RestClient secRestClient,
            @Qualifier("swfRestClient") RestClient swfRestClient) {
        this.restClient = restClient;
        this.refRestClient = refRestClient;
        this.secRestClient = secRestClient;
        this.swfRestClient = swfRestClient;
    }

    @Override
    public DeclarationFiscaleDTO getEtatCaFiscal(String noPieceClient, Integer typePieceClient) {
        log.info("Appel API externe: /api/declarations-fiscales/etat-ca-fiscal - noPieceClient: {}, typePieceClient: {}",
                noPieceClient, typePieceClient);

        try {
            DeclarationFiscaleDTO response = restClient
                    .get()
                    .uri("/api/declarations-fiscales/etat-ca-fiscal?noPieceClient={noPieceClient}&typePieceClient={typePieceClient}",
                            noPieceClient, typePieceClient)
                    .retrieve()
                    .body(DeclarationFiscaleDTO.class);

            log.debug("Reponse API: etat={}, mntCaFiscal={}",
                    response != null ? response.getEtat() : null,
                    response != null ? response.getMntCaFiscal() : null);

            return response;

        } catch (Exception e) {
            log.warn("Declaration fiscale non trouvee ou erreur API: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public DeclarationFiscaleDTO getEtatCaFiscal2(String noPieceClient, Integer typePieceClient) {
        log.info("Appel API externe: /api/declarations-fiscales/etat-ca-fiscal-2 - noPieceClient: {}, typePieceClient: {}",
                noPieceClient, typePieceClient);

        try {
            DeclarationFiscaleDTO response = restClient
                    .get()
                    .uri("/api/declarations-fiscales/etat-ca-fiscal-2?noPieceClient={noPieceClient}&typePieceClient={typePieceClient}",
                            noPieceClient, typePieceClient)
                    .retrieve()
                    .body(DeclarationFiscaleDTO.class);

            log.debug("Reponse API-2: etat={}, mntCaFiscal={}",
                    response != null ? response.getEtat() : null,
                    response != null ? response.getMntCaFiscal() : null);

            return response;

        } catch (Exception e) {
            log.warn("Declaration fiscale N-2 non trouvee ou erreur API: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public AgenceDTO getAgenceByCode(Integer codeBanque, Integer codeAgenceBct) {
        log.info("Appel API REF: /api/ref/agences/by-codes/{}/{}", codeBanque, codeAgenceBct);

        try {
            AgenceDTO response = refRestClient
                    .get()
                    .uri("/api/ref/agences/by-codes/{codeBanque}/{codeAgenceBct}",
                            codeBanque, codeAgenceBct)
                    .retrieve()
                    .body(AgenceDTO.class);

            log.debug("Reponse API REF: codeBanque={}, codeAgenceBct={}, libelleAgence={}",
                    response != null ? response.getCodeBanque() : null,
                    response != null ? response.getCodeAgenceBct() : null,
                    response != null ? response.getLibelleAgence() : null);

            return response;

        } catch (Exception e) {
            log.warn("Agence non trouvee ou erreur API REF: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public Optional<Integer> getcodeBanque(Integer codeBanque) {
        log.info("Appel API REF: /api/ref/donnees-generales/{}", codeBanque);

        try {
            // Récupérer la réponse brute et tenter plusieurs stratégies d'extraction
            Object raw = refRestClient
                    .get()
                    .uri("/api/ref/donnees-generales/" + codeBanque)
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API REF getcodeBanque (classe={}): {}",
                    raw != null ? raw.getClass().getName() : null, raw);

            if (raw == null) {
                return Optional.empty();
            }

            // Si le corps est déjà un nombre
            if (raw instanceof Number) {
                return Optional.of(((Number) raw).intValue());
            }

            // Si c'est une map / objet JSON -> tenter d'extraire un champ commun
            if (raw instanceof java.util.Map) {
                java.util.Map<?, ?> map = (java.util.Map<?, ?>) raw;
                // Clés potentiellement utilisées par le microservice REF
                String[] keys = {"code", "codeBanque", "value", "data", "result", "id"};
                for (String k : keys) {
                    if (map.containsKey(k)) {
                        Object v = map.get(k);
                        if (v instanceof Number) return Optional.of(((Number) v).intValue());
                        if (v instanceof String) {
                            try { return Optional.of(Integer.parseInt(((String) v).trim())); } catch (Exception ex) { /*ignore*/ }
                        }
                    }
                }
                // Si la map contient un seul champ numérique, retourner celui-ci
                for (Object v : map.values()) {
                    if (v instanceof Number) return Optional.of(((Number) v).intValue());
                }
                return Optional.empty();
            }

            // Si c'est une String (peut être un JSON ou un nombre en string)
            if (raw instanceof String) {
                String s = ((String) raw).trim();
                // tenter parse direct
                try { return Optional.of(Integer.parseInt(s)); } catch (Exception ignored) {}
                // tenter d'extraire nombre via regex
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(-?\\d+)").matcher(s);
                if (m.find()) {
                    try { return Optional.of(Integer.parseInt(m.group(1))); } catch (Exception ignored) {}
                }
                return Optional.empty();
            }

            // Sinon, impossible d'extraire
            log.warn("Impossible d'extraire un code banque numérique depuis la réponse REF: classe={}", raw.getClass().getName());
            return Optional.empty();

         } catch (Exception e) {
             log.warn("Erreur API REF getcodeBanque: {}", e.getMessage());
             return Optional.empty();
         }

    }


    @Override
    public Integer verifierPersonne(Integer typePiecePersonne, String noPiecePersonne) {
        log.info("Appel API REF: /api/ref/personnes/verif/{}/{}", typePiecePersonne, noPiecePersonne);

        try {
            Integer response = refRestClient
                    .get()
                    .uri("/api/ref/personnes/verif/{typePiecePersonne}/{noPiecePersonne}",
                            typePiecePersonne, noPiecePersonne)
                    .retrieve()
                    .body(Integer.class);

            log.debug("Reponse API REF verifierPersonne: {}", response);

            return response;

        } catch (Exception e) {
            log.warn("Erreur API REF verifierPersonne: {}", e.getMessage());
            return -1; // Retourne -1 en cas d'erreur (personne non trouvée)
        }
    }

    @Override
    public boolean existsPersonneByNoPiece(String noPieceBenef) {
        log.info("Appel API REF: /api/ref/personnes/by-nopiececlient/{}", noPieceBenef);

        try {
            Object[] response = refRestClient
                    .get()
                    .uri("/api/ref/personnes/by-nopiececlient/{noPiecePersonne}", noPieceBenef)
                    .retrieve()
                    .body(Object[].class);

            boolean exists = response != null && response.length > 0;
            log.debug("Reponse API REF existsPersonneByNoPiece: {} personne(s) trouvée(s)", response != null ? response.length : 0);
            return exists;

        } catch (Exception e) {
            log.warn("Erreur API REF existsPersonneByNoPiece: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public Object getPersonne(Integer typePiecePersonne, String noPiecePersonne) {
        log.info("Appel API REF: /api/ref/personnes/{}/{}", typePiecePersonne, noPiecePersonne);

        try {
            Object response = refRestClient
                    .get()
                    .uri("/api/ref/personnes/search/{typePiecePersonne}/{noPiecePersonne}", typePiecePersonne, noPiecePersonne)
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse API REF getPersonne: {}", response);
            return response;

        } catch (Exception e) {
            log.warn("Erreur API REF getPersonne: {}", e.getMessage());
            return null;
        }
    }




    @Override
    public String controlerSecteurActivite(String codeActivite, String activiteLabel, boolean blocage, String var) {
        log.info("Appel API REF: /api/ref/secteur-activite/controler - codeActivite: {}, activiteLabel: {}, blocage: {}, var: {}",
                codeActivite, activiteLabel, blocage, var);

        try {
            String response = refRestClient
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/ref/secteur-activite/controler")
                            .queryParam("codeActivite", codeActivite)
                            .queryParam("activiteLabel", activiteLabel)
                            .queryParam("blocage", blocage)
                            .queryParam("var", var)
                            .build())
                    .retrieve()
                    .body(String.class);

            log.debug("Reponse API REF controlerSecteurActivite: {}", response);

            return response;

        } catch (Exception e) {
            log.warn("Erreur API REF controlerSecteurActivite: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public boolean verifierActiviteParCode(Integer codeActivite) {
        log.info("Appel API REF: /api/ref/activites/search/byCode/{}", codeActivite);

        try {
            Object response = refRestClient
                    .get()
                    .uri("/api/ref/activites/search/byCode/{codeActivite}", codeActivite)
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse API REF verifierActiviteParCode: {}", response);

            // Si on obtient une réponse (pas d'exception 404), l'activité existe
            return response != null;

        } catch (Exception e) {
            log.warn("Activité non trouvée ou erreur API REF: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean verifierBanqueParCode(Short codeBanque) {
        log.info("Appel API REF: /api/ref/banques/search/byCode/{}", codeBanque);

        try {
            Object response = refRestClient
                    .get()
                    .uri("/api/ref/banques/search/byCode/{codeBanque}", codeBanque)
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse API REF verifierBanqueParCode: {}", response);

            // Si on obtient une réponse (pas d'exception 404), la banque existe
            return response != null;

        } catch (Exception e) {
            log.warn("Banque non trouvée ou erreur API REF: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean existsCompteByCombinaison(String noPieceClient, Integer codeAgenceBct, String racineCompte, Integer cleRib) {
        log.info("Appel API REF: /api/ref/comptes/exists-combinaison - noPieceClient: {}, codeAgenceBct: {}, racineCompte: {}, cleRib: {}",
                noPieceClient, codeAgenceBct, racineCompte, cleRib);

        try {
            Boolean response = refRestClient
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/ref/comptes/exists-combinaison")
                            .queryParam("noPieceClient", noPieceClient)
                            .queryParam("codeAgenceBct", codeAgenceBct)
                            .queryParam("racineCompte", racineCompte)
                            .queryParam("cleRib", cleRib)
                            .build())
                    .retrieve()
                    .body(Boolean.class);

            log.debug("Reponse API REF existsCompteByCombinaison: {}", response);

            return response != null && response;

        } catch (Exception e) {
            log.warn("Erreur API REF existsCompteByCombinaison: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean existsOperationByProduitAndOperation(Integer codeProduitService, Integer codeOperation) {
        log.info("Appel API SEC: existence operation - produit={}, operation={}", codeProduitService, codeOperation);

        try {

            Object response = secRestClient
                    .get()
                    .uri("/api/operations/produit/{codeProduitService}/operation/{codeOperation}",
                            codeProduitService, codeOperation)
                    .retrieve()
                    .body(Object.class);

            return response != null;

        } catch (Exception e) {
            // 404 (non trouvé) ou autre erreur
            log.warn("Operation inexistante ou erreur API SEC (produit={}, operation={}): {}",
                    codeProduitService, codeOperation, e.getMessage());
            return false;
        }
    }


    @Override
    public DeclarationCAFHTDTO saveDeclarationCAFHT(DeclarationCAFHTDTO declarationCAFHT) {
        log.info("Appel API GEN: POST /api/declarations-caf-ht - noPieceClient: {}, annee: {}, etat: {}",
                declarationCAFHT != null ? declarationCAFHT.getNoPieceClient() : null,
                declarationCAFHT != null ? declarationCAFHT.getAnnee() : null,
                declarationCAFHT != null ? declarationCAFHT.getEtat() : null);

        try {
            DeclarationCAFHTDTO response = restClient
                    .post()
                    .uri("/api/declarations-caf-ht")
                    .body(declarationCAFHT)
                    .retrieve()
                    .body(DeclarationCAFHTDTO.class);

            log.debug("Reponse API GEN saveDeclarationCAFHT: noPieceClient={}, annee={}, etat={}, mntCaFiscal={}",
                    response != null ? response.getNoPieceClient() : null,
                    response != null ? response.getAnnee() : null,
                    response != null ? response.getEtat() : null,
                    response != null ? response.getMntCaFiscal() : null);

            return response;

        } catch (Exception e) {
            log.warn("Erreur API GEN saveDeclarationCAFHT: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public DeclarationCAFHTDTO getDeclarationCAFHT(String noPieceClient, Short annee) {
        log.info("Appel API GEN: GET /api/declarations-caf-ht/{}/{}", noPieceClient, annee);

        try {
            DeclarationCAFHTDTO response = restClient
                    .get()
                    .uri("/api/declarations-caf-ht/{noPieceClient}/{annee}", noPieceClient, annee)
                    .retrieve()
                    .body(DeclarationCAFHTDTO.class);

            log.debug("Reponse API GEN getDeclarationCAFHT: noPieceClient={}, annee={}, etat={}, mntCaFiscal={}",
                    response != null ? response.getNoPieceClient() : null,
                    response != null ? response.getAnnee() : null,
                    response != null ? response.getEtat() : null,
                    response != null ? response.getMntCaFiscal() : null);

            return response;

        } catch (Exception e) {
            log.warn("Declaration CAF HT non trouvee ou erreur API GEN: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public EmailQueueDTO notifierClient(NotificationClientRequest request) {
        log.info("Appel API SWF-Mail: POST /api/notifications/client - numDossier: {}, noPieceClient: {}, senderEmail: {}",
                request != null ? request.getNumDossier() : null,
                request != null ? request.getNoPieceClient() : null,
                request != null ? request.getSenderEmail() : null);

        try {
            // Récupérer la réponse brute pour éviter les problèmes de désérialisation
            Object rawResponse = swfRestClient
                    .post()
                    .uri("/api/notifications/client")
                    .body(request)
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API SWF-Mail (classe={}): {}",
                    rawResponse != null ? rawResponse.getClass().getName() : null, rawResponse);

            if (rawResponse == null) {
                log.warn("Réponse null de SWF-Mail");
                return null;
            }

            // Si c'est déjà un EmailQueueDTO (peu probable)
            if (rawResponse instanceof EmailQueueDTO) {
                return (EmailQueueDTO) rawResponse;
            }

            // Si c'est une Map (JSON désérialisé en LinkedHashMap)
            if (rawResponse instanceof java.util.Map) {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> map = (java.util.Map<String, Object>) rawResponse;

                EmailQueueDTO dto = new EmailQueueDTO();

                // Mapper les champs
                if (map.containsKey("id")) {
                    Object idVal = map.get("id");
                    if (idVal instanceof Number) dto.setId(((Number) idVal).longValue());
                }
                if (map.containsKey("toEmail")) dto.setToEmail((String) map.get("toEmail"));
                if (map.containsKey("fromEmail")) dto.setFromEmail((String) map.get("fromEmail"));
                if (map.containsKey("subject")) dto.setSubject((String) map.get("subject"));
                if (map.containsKey("body")) dto.setBody((String) map.get("body"));
                if (map.containsKey("status")) dto.setStatus((String) map.get("status"));
                if (map.containsKey("retryCount")) {
                    Object retryVal = map.get("retryCount");
                    if (retryVal instanceof Number) dto.setRetryCount(((Number) retryVal).intValue());
                }
                if (map.containsKey("errorMessage")) dto.setErrorMessage((String) map.get("errorMessage"));

                log.info("Email créé avec succès: id={}, status={}, toEmail={}",
                        dto.getId(), dto.getStatus(), dto.getToEmail());

                return dto;
            }

            log.warn("Type de réponse inattendu: {}", rawResponse.getClass().getName());
            return null;

        } catch (Exception e) {
            log.error("Erreur API SWF-Mail notifierClient: {}", e.getMessage(), e);
            return null;
        }
    }

    @Override
    public java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO> getAllRecognizedEmailSenders() {
        log.info("Appel API SWF-Mail: GET /api/recognized-email-senders");

        try {
            Object rawResponse = swfRestClient
                    .get()
                    .uri("/api/recognized-email-senders")
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API SWF-Mail getAllRecognizedEmailSenders (classe={}): {}",
                    rawResponse != null ? rawResponse.getClass().getName() : null, rawResponse);

            if (rawResponse == null) {
                log.warn("Réponse null de SWF-Mail getAllRecognizedEmailSenders");
                return java.util.Collections.emptyList();
            }

            // Si c'est une liste
            if (rawResponse instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> list = (java.util.List<Object>) rawResponse;
                java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO> result = new java.util.ArrayList<>();

                for (Object item : list) {
                    if (item instanceof java.util.Map) {
                        @SuppressWarnings("unchecked")
                        java.util.Map<String, Object> map = (java.util.Map<String, Object>) item;

                        log.debug("Map reçue de SWF-Mail: {}", map);

                        IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO dto = new IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO();

                        if (map.containsKey("addressMail")) {
                            dto.setEmail((String) map.get("addressMail"));
                            log.debug("addressMail trouvé: {}", map.get("addressMail"));
                        } else if (map.containsKey("email")) {
                            dto.setEmail((String) map.get("email"));
                            log.debug("email trouvé: {}", map.get("email"));
                        }

                        if (map.containsKey("password")) {
                            dto.setPassword((String) map.get("password"));
                        }

                        log.info("RecognizedEmailSenderDTO créé: email={}", dto.getEmail());
                        result.add(dto);
                    }
                }

                log.info("Récupéré {} emails expéditeurs reconnus", result.size());
                return result;
            }

            log.warn("Type de réponse inattendu pour getAllRecognizedEmailSenders: {}", rawResponse.getClass().getName());
            return java.util.Collections.emptyList();

        } catch (Exception e) {
            log.error("Erreur API SWF-Mail getAllRecognizedEmailSenders: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    @Override
    public IbansysPoc.AVA.DTO.PersonneDTO getPersonneInfo(Integer typePiecePersonne, String noPiecePersonne) {
        log.info("Appel API externe: /by-nopiececlient/{}", noPiecePersonne);

        try {
            // L'API /api/ref/personnes/by-nopiececlient/{noPiecePersonne} retourne une List<Personne>
            IbansysPoc.AVA.DTO.PersonneDTO[] responseList = refRestClient
                    .get()
                    .uri("/api/ref/personnes/by-nopiececlient/{noPiecePersonne}", noPiecePersonne)
                    .retrieve()
                    .body(IbansysPoc.AVA.DTO.PersonneDTO[].class);

            if (responseList != null && responseList.length > 0) {
                log.debug("Réponse API /by-nopiececlient: Trouvé {} personnes", responseList.length);
                return responseList[0]; // On prend la première personne de la liste
            }
            log.debug("Réponse API /by-nopiececlient: Aucune personne trouvée");
            return null;

        } catch (Exception e) {
            log.error("Erreur API /by-nopiececlient/{}: {}", noPiecePersonne, e.getMessage(), e);
            return null;
        }
    }

    @Override
    public java.util.List<Object> getDevises() {
        log.info("Appel API REF: GET /api/ref/devises/getall");

        try {
            Object rawResponse = refRestClient
                    .get()
                    .uri("/api/ref/devises/getall")
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API REF getDevises (classe={}): {}",
                    rawResponse != null ? rawResponse.getClass().getName() : null, rawResponse);

            if (rawResponse == null) {
                log.warn("Réponse null de REF getDevises");
                return java.util.Collections.emptyList();
            }

            // Si c'est une liste
            if (rawResponse instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> list = (java.util.List<Object>) rawResponse;
                log.info("Récupéré {} devises", list.size());
                return list;
            }

            log.warn("Type de réponse inattendu pour getDevises: {}", rawResponse.getClass().getName());
            return java.util.Collections.emptyList();

        } catch (Exception e) {
            log.error("Erreur API REF getDevises: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    @Override
    public java.util.List<Object> getModePaiements() {
        log.info("Appel API REF: GET /api/ref/modes-paiement/getall");

        try {
            Object rawResponse = refRestClient
                    .get()
                    .uri("/api/ref/modes-paiement/getall")
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API REF getModePaiements (classe={}): {}",
                    rawResponse != null ? rawResponse.getClass().getName() : null, rawResponse);

            if (rawResponse == null) {
                log.warn("Réponse null de REF getModePaiements");
                return java.util.Collections.emptyList();
            }

            // Si c'est une liste
            if (rawResponse instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> list = (java.util.List<Object>) rawResponse;
                log.info("Récupéré {} modes de paiement", list.size());
                return list;
            }

            log.warn("Type de réponse inattendu pour getModePaiements: {}", rawResponse.getClass().getName());
            return java.util.Collections.emptyList();

        } catch (Exception e) {
            log.error("Erreur API REF getModePaiements: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    @Override
    public java.util.List<Object> getPays() {
        log.info("Appel API REF: GET /api/ref/pays/getall");

        try {
            Object rawResponse = refRestClient
                    .get()
                    .uri("/api/ref/pays/getall")
                    .retrieve()
                    .body(Object.class);

            log.debug("Reponse brute API REF getPays (classe={}): {}",
                    rawResponse != null ? rawResponse.getClass().getName() : null, rawResponse);

            if (rawResponse == null) {
                log.warn("Réponse null de REF getPays");
                return java.util.Collections.emptyList();
            }

            // Si c'est une liste
            if (rawResponse instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> list = (java.util.List<Object>) rawResponse;
                log.info("API REF getPays retourné {} pays", list.size());
                return list;
            }

            log.warn("Type de réponse inattendu pour getPays: {}", rawResponse.getClass().getName());
            return java.util.Collections.emptyList();

        } catch (Exception e) {
            log.error("Erreur API REF getPays: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }

    @Override
    public IbansysPoc.AVA.DTO.BanqueDTO getBanqueByCode(Short codeBanque) {
        log.info("Appel API externe: /api/ref/banques/search/byCode/{}", codeBanque);

        try {
            IbansysPoc.AVA.DTO.BanqueDTO response = refRestClient
                    .get()
                    .uri("/api/ref/banques/search/byCode/{codeBanque}", codeBanque)
                    .retrieve()
                    .body(IbansysPoc.AVA.DTO.BanqueDTO.class);

            log.debug("Réponse API /banques/search/byCode/{}: {}", codeBanque, response);
            return response;

        } catch (Exception e) {
            log.error("Erreur API REF /banques/search/byCode/{}: {}", codeBanque, e.getMessage(), e);
            return null;
        }
    }
}
