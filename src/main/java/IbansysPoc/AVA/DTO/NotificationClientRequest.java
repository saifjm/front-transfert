package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * DTO pour la demande de notification client.
 * Utilisé pour envoyer une notification via le microservice SWF-Mail.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationClientRequest {

    private Integer codeBanque;

    private Integer codeAgenceBct;

    private Integer typePieceClient;

    private String noPieceClient;

    private Integer numDossier;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateDossier;

    private String racineCompte;

    private String objet;

    private String message;

    private String senderEmail;

}

