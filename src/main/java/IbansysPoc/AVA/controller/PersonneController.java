package IbansysPoc.AVA.controller;

import IbansysPoc.AVA.service.ApiExterneService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@RestController
@RequestMapping("/api/ref/personnes")
@RequiredArgsConstructor
@Slf4j
public class PersonneController {

    private final ApiExterneService apiExterneService;

    @GetMapping("/search/{typePiecePersonne}/{noPiecePersonne}")
    public ResponseEntity<Object> getPersonneById(
            @PathVariable("typePiecePersonne") Short typePiecePersonne,
            @PathVariable("noPiecePersonne") String noPiecePersonne
    ) {
        if (Objects.isNull(typePiecePersonne) || noPiecePersonne == null || noPiecePersonne.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Object personne = apiExterneService.getPersonne(Integer.valueOf(typePiecePersonne), noPiecePersonne);
        if (personne == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(personne);
    }
}

