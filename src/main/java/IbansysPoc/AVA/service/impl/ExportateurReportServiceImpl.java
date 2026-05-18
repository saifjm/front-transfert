package IbansysPoc.AVA.service.impl;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import IbansysPoc.AVA.DTO.ExportateurReportRequestDTO;
import IbansysPoc.AVA.service.ExportateurReportService;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

@Service
@Slf4j
public class ExportateurReportServiceImpl implements ExportateurReportService {

    @Override
    public byte[] generateReport(ExportateurReportRequestDTO requestDTO) throws Exception {
        log.info("Generating Exportateur Report for Intermediaire: {}", requestDTO.getIntermediaireAgree());
        
        // 1. Load the template
        InputStream templateStream = new ClassPathResource("reports/exportateur_template.jrxml").getInputStream();
        JasperReport jasperReport = JasperCompileManager.compileReport(templateStream);

        // 2. Prepare parameters
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("intermediaireAgree", requestDTO.getIntermediaireAgree());
        parameters.put("codeIntermediaire", requestDTO.getCodeIntermediaire());
        parameters.put("agence", requestDTO.getAgence());
        parameters.put("codeAgence", requestDTO.getCodeAgence());
        parameters.put("typeAllocation", requestDTO.getTypeAllocation());
        parameters.put("anneeDeFonctionnementDu", requestDTO.getAnneeDeFonctionnementDu());
        parameters.put("anneeDeFonctionnementAu", requestDTO.getAnneeDeFonctionnementAu());
        parameters.put("chiffreAffairesHT", requestDTO.getChiffreAffairesHT());
        parameters.put("titulaireAllocation", requestDTO.getTitulaireAllocation());
        parameters.put("nomOuDenomination", requestDTO.getNomOuDenomination());
        parameters.put("codeIdentification", requestDTO.getCodeIdentification());
        parameters.put("adresse", requestDTO.getAdresse());
        parameters.put("numeroDateDemandeF2", requestDTO.getNumeroDateDemandeF2());

        // 3. Prepare data source (rows for the table)
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(
                requestDTO.getLignes() != null ? requestDTO.getLignes() : java.util.Collections.emptyList()
        );

        // 4. Fill report
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

        // 5. Export to PDF byte array
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }
}
