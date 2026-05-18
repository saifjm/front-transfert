package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class ExportateurReportRowDTO {
    private String date;
    private String designation;
    private BigDecimal creditMontant;
    private String creditOrigineFonds;
    private BigDecimal debitMontant;
    private String debitPays;
    private BigDecimal droitsTransfertCumules;
    private BigDecimal montantsTransfertsCumules;
    private BigDecimal baseCalculDroitsTransfert;
    private String beneficiaireCodeType;
    private String beneficiaireCodeNumero;
    private String beneficiaireNomsPrenoms;
}
