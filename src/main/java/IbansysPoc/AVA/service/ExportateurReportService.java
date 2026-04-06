package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.ExportateurReportRequestDTO;

public interface ExportateurReportService {
    byte[] generateReport(ExportateurReportRequestDTO requestDTO) throws Exception;
}
