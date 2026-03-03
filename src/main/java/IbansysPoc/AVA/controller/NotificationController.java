package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.EmailQueueDTO;
import IbansysPoc.AVA.DTO.NotificationClientRequest;
import IbansysPoc.AVA.service.ApiExterneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * Controller REST pour les notifications.
 * Proxy vers le microservice SWF-Mail.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "API pour l'envoi de notifications (proxy vers microservice SWF-Mail)")
public class NotificationController {

    private final ApiExterneService apiExterneService;

    // ==================== NOTIFICATION CLIENT ====================

    @Operation(
        summary = "Envoyer une notification client",
        description = """
                Crée une notification client et l'ajoute à la file d'attente des emails.
                
                **Équivalent de la procédure PL/SQL NOTIF_CLIENT**
                
                Cette API effectue les opérations suivantes :
                1. Récupère le libellé de l'agence via l'API Référentiels
                2. Récupère le nom/prénom du client via l'API Référentiels
                3. Construit le message HTML avec le template standard
                4. Insère l'email dans la table EMAIL_QUEUE avec le statut 'PENDING'
                """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "Email créé avec succès dans la file d'attente",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = EmailQueueDTO.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Requête invalide - Paramètres manquants ou incorrects",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(value = "{\"error\": \"Sender email non trouvé: xxx@example.com\"}")
            )
        ),
        @ApiResponse(
            responseCode = "500",
            description = "Erreur interne du serveur",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                examples = @ExampleObject(value = "{\"error\": \"Erreur lors de la création de la notification\"}")
            )
        )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Paramètres de la notification client",
        required = true,
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(implementation = NotificationClientRequest.class),
            examples = @ExampleObject(
                name = "Exemple de notification",
                summary = "Notification standard pour un dossier traité",
                value = """
                    {
                        "codeBanque": 10,
                        "codeAgenceBct": 100,
                        "typePieceClient": 1,
                        "noPieceClient": "12345678",
                        "numDossier": 2024001,
                        "dateDossier": "2024-02-02",
                        "racineCompte": 123456,
                        "objet": "Notification Dossier N° ",
                        "message": "Votre dossier a été traité avec succès",
                        "senderEmail": "noreply@ava.com.tn"
                    }
                    """
            )
        )
    )
    @PostMapping(value = "/client", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<EmailQueueDTO> notifierClient(
            @RequestBody NotificationClientRequest request) {
        log.info("POST /api/notifications/client - numDossier: {}, noPieceClient: {}",
                request.getNumDossier(), request.getNoPieceClient());

        EmailQueueDTO emailQueue = apiExterneService.notifierClient(request);

        if (emailQueue == null) {
            log.warn("Échec de la création de la notification client");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        return ResponseEntity
                .created(URI.create("/api/email-queues/" + emailQueue.getId()))
                .body(emailQueue);
    }

    @GetMapping(value = "/recognized-email-senders", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Récupérer tous les emails expéditeurs reconnus",
            description = "Retourne la liste de tous les emails expéditeurs reconnus enregistrés dans le système SWF-Mail"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste récupérée avec succès"),
            @ApiResponse(responseCode = "500", description = "Erreur interne du serveur")
    })
    public ResponseEntity<java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO>> getAllRecognizedEmailSenders() {
        log.info("GET /api/notifications/recognized-email-senders");
        
        java.util.List<IbansysPoc.AVA.DTO.RecognizedEmailSenderDTO> senders = apiExterneService.getAllRecognizedEmailSenders();
        
        return ResponseEntity.ok(senders);
    }

}

