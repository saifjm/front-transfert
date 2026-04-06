package IbansysPoc.AVA.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import IbansysPoc.AVA.DTO.ExportateurReportRequestDTO;
import IbansysPoc.AVA.service.ExportateurReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Reports", description = "Endpoints pour la génération de rapports PDF (JasperReports)")
public class ExportateurReportController {

    private final ExportateurReportService reportService;

    @Operation(summary = "Générer le PDF de l'Annexe N°5 (Allocation Exportateur)", 
               description = "Génère un PDF basé sur le template exportateur_template.jrxml et le payload JSON")
    @PostMapping(value = "/exportateur", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateExportateurReport(@RequestBody ExportateurReportRequestDTO request) {
        log.info("Appel POST /api/reports/exportateur pour la génération de l'Annexe N°5");
        try {
            byte[] pdfBytes = reportService.generateReport(request);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "annexe_5_exportateur.pdf");
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            log.error("Erreur lors de la génération du rapport exportateur", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
