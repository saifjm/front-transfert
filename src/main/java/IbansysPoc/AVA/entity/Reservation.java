package IbansysPoc.AVA.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "RESERVATION")
public class Reservation {
    @Id
    @Column(name = "REFERENCE_RES", nullable = false)
    private String referenceRes;

    @Column(name = "NUMERO_DOSSIER", nullable = false)
    private Long numeroDossier;

    @NotNull
    @Column(name = "DATE_RESA", nullable = false)
    private LocalDate dateResa;

    @Size(max = 100)
    @Column(name = "ORIGINE", length = 100)
    private String origine;

    @Column(name = "MNT_UTILISE", precision = 18, scale = 3)
    private BigDecimal mntUtilise;

    @Column(name = "MNT_RESERVE", precision = 18, scale = 3)
    private BigDecimal mntReserve;

    @Column(name = "MNT_ANNULATION", precision = 18, scale = 3)
    private BigDecimal mntAnnulation;


    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OperationsDelegueesMvt> operationsDelegueesMvts = new ArrayList<>();


}