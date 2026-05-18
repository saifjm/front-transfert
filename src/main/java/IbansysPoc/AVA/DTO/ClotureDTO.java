package IbansysPoc.AVA.DTO;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ClotureDTO {

    @NotBlank(message = "Le motif est obligatoire")
    private String motif;

    @NotNull(message = "La date de clôture est obligatoire")
    private LocalDate dateCloture;

    @NotBlank(message = "La référence est obligatoire")
    private String reference;

    private String observations;

    // Getters and Setters
    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public LocalDate getDateCloture() {
        return dateCloture;
    }

    public void setDateCloture(LocalDate dateCloture) {
        this.dateCloture = dateCloture;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }
}
