package IbansysPoc.AVA.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Audited
@Table(name = "TYPE_DOSSIER_AVA")
public class TypeDossierAva {
    @Id
    @Column(name = "NUMERO_CIRCULAIRE")
    private Short numeroCirculaire;

    @Column(name = "CODE_TYPE_DOS_AVA")
    private Short codeTypeDosAva;

    @Column(name = "LIB_TYPE_DOS_AVA", length = 30)
    private String libTypeDosAva;

    @Column(name = "SEUIL_MINIMUM", precision = 15, scale = 3)
    private BigDecimal seuilMinimum;

    @Column(name = "SEUIL_MAXIMUM", precision = 15, scale = 3)
    private BigDecimal seuilMaximum;

    @Column(name = "DROIT_MINIMUM", precision = 15, scale = 3)
    private BigDecimal droitMinimum;

    @Column(name = "TAUX_AVA", precision = 6, scale = 3)
    private BigDecimal tauxAva;

    @Column(name = "DROIT_MAXIMUM", precision = 15, scale = 3)
    private BigDecimal droitMaximum;

    @Column(name = "ANNEE_CIRCULAIRE")
    private Short anneeCirculaire;

    @Column(name = "DATE_APPLICATION")
    private LocalDate dateApplication;

    @Column(name = "DATE_FIN_APPLICATION")
    private LocalDate dateFinApplication;

    @Column(name = "STATUS", length = 1)
    private String status;

    @Column(name = "AVANCE_O_N", length = 1)
    private String avanceON;

    @Column(name = "TAUX_AVANCE_MAX", precision = 6, scale = 3)
    private BigDecimal tauxAvanceMax;

    @Column(name = "NBR_AVANCE")
    private Short nbrAvance;

    @Column(name = "DATE_AVANCE_MAX")
    private LocalDate dateAvanceMax;

    @Column(name = "DATE_ANNIVERSAIRE")
    private LocalDate dateAnniversaire;

    @Column(name = "DATE_ULTIME_DECL_CA")
    private LocalDate dateUltimeDeclCa;

    @Column(name = "ANNUEL_O_N", length = 1)
    private String annuelON;

    @Column(name = "RENOUVELLEMENT_AUTO_O_N", length = 1)
    private String renouvellementAutoON;

}