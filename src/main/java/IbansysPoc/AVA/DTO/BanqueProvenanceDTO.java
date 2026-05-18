package IbansysPoc.AVA.DTO;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BanqueProvenanceDTO {
    private Integer codeBanqueProvenance;
    private BigDecimal mntAvance;
    private BigDecimal mntUtilise;
    private BigDecimal mntAutorise;
    private BigDecimal mntAutoriseBct;
    private BigDecimal solde;
    private BigDecimal mntReserve;
    private BigDecimal mntBlocage;

    public BanqueProvenanceDTO(Integer codeBanqueProvenance, BigDecimal mntAvance, BigDecimal mntUtilise,
                               BigDecimal mntAutorise, BigDecimal mntAutoriseBct, BigDecimal solde, BigDecimal mntReserve, BigDecimal mntBlocage) {
        this.codeBanqueProvenance = codeBanqueProvenance;
        this.mntAvance = mntAvance;
        this.mntUtilise = mntUtilise;
        this.mntAutorise = mntAutorise;
        this.mntAutoriseBct = mntAutoriseBct;
        this.solde = solde;
        this.mntReserve = mntReserve;
        this.mntBlocage = mntBlocage;
    }
}

