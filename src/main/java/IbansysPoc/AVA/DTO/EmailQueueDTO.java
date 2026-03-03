package IbansysPoc.AVA.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO pour la réponse de l'email dans la file d'attente.
 * Représente un email créé dans le microservice SWF-Mail.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmailQueueDTO {

    private Long id;

    private String toEmail;

    private String fromEmail;

    private String subject;

    private String body;

    private String status;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime sentAt;

    private Integer retryCount;

    private String errorMessage;

}

