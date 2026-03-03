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
public class OperationsDelegueesMvtId implements Serializable {
    private static final long serialVersionUID = 7644827541083844995L;

    @Column(name = "REF_OPERATION", nullable = false)
    private Long refOperation;

    @Column(name = "DATE_OPERATION", nullable = false)
    private LocalDate dateOperation;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        OperationsDelegueesMvtId entity = (OperationsDelegueesMvtId) o;
        return Objects.equals(this.refOperation, entity.refOperation) &&
                Objects.equals(this.dateOperation, entity.dateOperation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(refOperation, dateOperation);
    }

}