package IbansysPoc.AVA.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO pour retourner les données de suspension d'un dossier.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SuspensionDataDTO {
    
    private LocalDate dateEtat;
    private String motif;
    
}