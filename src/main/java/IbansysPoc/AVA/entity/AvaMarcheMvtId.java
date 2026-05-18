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
public class AvaMarcheMvtId implements Serializable {
    private static final long serialVersionUID = -4826757794704661010L;
    @Column(name = "NUM_MARCHE", nullable = false, length = 50)
    private String numMarche;

    @Column(name = "CODE_PRODUIT_SERVICE", nullable = false)
    private Short codeProduitService;

    @Column(name = "CODE_OPERATION", nullable = false)
    private Integer codeOperation;

    @Column(name = "REF_OPERATION", nullable = false)
    private Integer refOperation;

    @Column(name = "DATE_OPERATION", nullable = false)
    private LocalDate dateOperation;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        AvaMarcheMvtId entity = (AvaMarcheMvtId) o;
        return Objects.equals(this.numMarche, entity.numMarche) &&
                Objects.equals(this.codeProduitService, entity.codeProduitService) &&
                Objects.equals(this.refOperation, entity.refOperation) &&
                Objects.equals(this.codeOperation, entity.codeOperation) &&
                Objects.equals(this.dateOperation, entity.dateOperation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(numMarche, codeProduitService, refOperation, codeOperation, dateOperation);
    }

}