package IbansysPoc.AVA.DTO;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;


@Getter
@Setter
public class ReservationResponseDTO {


    private String referenceRes;
    private Long numeroDossier;
    private LocalDate dateResa;
    private  String origine;
    private BigDecimal mntReserve;
    private BigDecimal mntUtilise;
    private BigDecimal mntAnnulation;



}
