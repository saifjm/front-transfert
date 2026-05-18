package IbansysPoc.AVA.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les emails expéditeurs reconnus.
 * Représente un sender email autorisé dans le système SWF-Mail.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecognizedEmailSenderDTO {



    private String email;

    private String password;


}

