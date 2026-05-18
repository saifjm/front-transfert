package IbansysPoc.AVA.entity;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

import org.hibernate.Hibernate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Embeddable
public class BeneficiairesMvtId implements Serializable {
    private static final long serialVersionUID = 329468397400883341L;
    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Short codeProduitService;

    @Column(name = "CODE_OPERATION", nullable = false)
    private Integer codeOperation;

    @Column(name = "REF_OPERATION", nullable = false)
    private Long refOperation;

    @Column(name = "DATE_OPERATION", nullable = false)
    private LocalDate dateOperation;

    @Column(name = "NUM_DOSSIER", nullable = false)
    private Integer numDossier;

    @Column(name = "DATE_DOSSIER", nullable = false)
    private LocalDate dateDossier;

    @Column(name = "TYPE_PIECE_BENEF", nullable = false)
    private Integer typePieceBenef;

    @Column(name = "NO_PIECE_BENEF", nullable = false, length = 13)
    private String noPieceBenef;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        BeneficiairesMvtId entity = (BeneficiairesMvtId) o;
        return Objects.equals(this.codeProduitService, entity.codeProduitService) &&
                Objects.equals(this.noPieceBenef, entity.noPieceBenef) &&
                Objects.equals(this.refOperation, entity.refOperation) &&
                Objects.equals(this.dateDossier, entity.dateDossier) &&
                Objects.equals(this.codeOperation, entity.codeOperation) &&
                Objects.equals(this.numDossier, entity.numDossier) &&
                Objects.equals(this.typePieceBenef, entity.typePieceBenef) &&
                Objects.equals(this.dateOperation, entity.dateOperation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(codeProduitService, noPieceBenef, refOperation, dateDossier, codeOperation, numDossier, typePieceBenef, dateOperation);
    }

}