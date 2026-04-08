package IbansysPoc.AVA.service;

import java.io.InputStream;
import java.util.Collection;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import net.sf.jasperreports.engine.JRDataSource;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

@Service
public class ReportService {

    private final ResourceLoader resourceLoader;

    public ReportService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    /**
     * Génère un rapport PDF à partir d'un template .jrxml et d'une map de paramètres.
     *
     * @param templatePath Le chemin vers le fichier .jrxml (ex: "classpath:reports/exportateur.jrxml")
     * @param parameters   Les paramètres (nom du champ -> valeur) à injecter dans le rapport
     * @return Le PDF sous forme de tableau d'octets (byte[])
     */
    public byte[] generatePdfReport(String templatePath, Map<String, Object> parameters) {
        try {
            Resource resource = resourceLoader.getResource(templatePath);
            InputStream jrxmlStream = resource.getInputStream();

            JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlStream);

            // JREmptyDataSource() est utilisé s'il n'y a pas de liste (Dataset)
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, new JREmptyDataSource());

            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du rapport Jasper", e);
        }
    }
    /**
     * Genere un rapport PDF avec une collection de donnees pour le tableau.
     *
     * @param templatePath Le chemin vers le fichier .jrxml
     * @param parameters   Les parametres a injecter dans le rapport
     * @param dataCollection La collection de donnees pour remplir le tableau du rapport
     * @return Le PDF sous forme de tableau d'octets (byte[])
     */
    public byte[] generatePdfReport(String templatePath, Map<String, Object> parameters, Collection<?> dataCollection) {
        try {
            Resource resource = resourceLoader.getResource(templatePath);
            InputStream jrxmlStream = resource.getInputStream();

            JasperReport jasperReport = JasperCompileManager.compileReport(jrxmlStream);

            // JRBeanCollectionDataSource pour les donnees du tableau
            JRDataSource dataSource = new JRBeanCollectionDataSource(dataCollection);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la generation du rapport Jasper avec datasource", e);
        }
    }}
