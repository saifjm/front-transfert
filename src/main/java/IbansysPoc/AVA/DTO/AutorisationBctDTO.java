package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AutorisationBctDTO {
    @NotNull(message = "Le numéro BCT est obligatoire")
    private Integer numeroBct;

    @NotNull(message = "La date BCT est obligatoire")
    private LocalDate dateBct;

    @NotNull(message = "Le type BCT est obligatoire")
    private String typeBct;

    @NotNull(message = "Le montant du mouvement AVA est obligatoire")
    @DecimalMin(value = "0.01", message = "Le montant du mouvement AVA doit être supérieur à 0")
    private BigDecimal mntMvtAva;
}