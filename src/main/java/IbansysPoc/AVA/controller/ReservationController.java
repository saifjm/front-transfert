package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.DTO.ReservationResponseDTO;
import IbansysPoc.AVA.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Reservations", description = "API pour la gestion des réservations")
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * Récupère les réservations par numéro de dossier uniquement si mntAnnulation == 0
     * Exemple: GET /api/reservations/numdossier/{numeroDossier}
     */
    @Operation(summary = "Récupérer les réservations par numéro de dossier where mnt reserve - mnt utilise - mnt annule diff de 0", description = "Retourne les réservations du dossier dont mnt reserve - mnt utilise - mnt annule diff de 0")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réservations récupérée",
                    content = @Content(schema = @Schema(implementation = ReservationResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Aucune réservation trouvée")
    })
    @GetMapping(value = "/numdossier/{numeroDossier}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<ReservationResponseDTO>> getByNumeroDossierAndMntAnnulationZero(
            @Parameter(description = "Numéro du dossier") @PathVariable("numeroDossier") Long numeroDossier) {
        log.info("GET /api/reservations/numdossier/{} - Recherche réservations si mnt reserve - mnt utilise - mnt annule diff de 0", numeroDossier);
        List<ReservationResponseDTO> reservations = reservationService.getByNumeroDossierOrderForBalance(numeroDossier);
        return ResponseEntity.ok(reservations);
    }

    @Operation(summary = "Récupérer les réservations (toutes) par numéro de dossier",
            description = "Retourne les réservations du dossier indépendamment de mntAnnulation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réservations récupérée",
                    content = @Content(schema = @Schema(implementation = ReservationResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Aucune réservation trouvée")
    })
    @GetMapping(value = "/numdossier/{numeroDossier}/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<ReservationResponseDTO>> getByNumeroDossierAll(
            @Parameter(description = "Numéro du dossier") @PathVariable("numeroDossier") Long numeroDossier) {

        log.info("GET /api/reservations/numdossier/{}/all - Recherche réservations (toutes)", numeroDossier);
        List<ReservationResponseDTO> reservations = reservationService.getByNumeroDossierAll(numeroDossier);
        return ResponseEntity.ok(reservations);
    }

        @Operation(summary = "Réinitialiser mntReserve à zéro pour un dossier",
                        description = "Met mntReserve = 0 pour les réservations du dossier spécifié (numéro de dossier)")
        @PutMapping(value = "/{numeroDossier}/reset-reserve")
        public ResponseEntity<Void> resetMntReserve(
                        @Parameter(description = "Numéro du dossier") @PathVariable("numeroDossier") Long numeroDossier) {

                log.info("PUT /api/reservations/{}/reset-reserve - Réinitialiser mntReserve à 0", numeroDossier);
                reservationService.resetMntReserveByNumeroDossier(numeroDossier);
                return ResponseEntity.noContent().build();
        }
}
