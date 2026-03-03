package IbansysPoc.AVA.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

@Getter
@Setter
@Embeddable
public class BeneficiaireId implements Serializable {
    private static final long serialVersionUID = 7906302020638483228L;
    @Column(name = "NUM_DOSSIER", nullable = false)
    private Integer numDossier;

    @Column(name = "DATE_DOSSIER", nullable = false)
    private LocalDate dateDossier;

    @Column(name = "TYPE_PIECE_BENEF", nullable = false)
    private Boolean typePieceBenef = false;

    @Column(name = "NO_PIECE_BENEF", nullable = false, length = 13)
    private String noPieceBenef;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        BeneficiaireId entity = (BeneficiaireId) o;
        return Objects.equals(this.noPieceBenef, entity.noPieceBenef) &&
                Objects.equals(this.dateDossier, entity.dateDossier) &&
                Objects.equals(this.numDossier, entity.numDossier) &&
                Objects.equals(this.typePieceBenef, entity.typePieceBenef);
    }

    @Override
    public int hashCode() {
        return Objects.hash(noPieceBenef, dateDossier, numDossier, typePieceBenef);
    }

}