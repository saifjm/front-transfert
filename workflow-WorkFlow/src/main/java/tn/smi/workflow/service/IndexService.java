package tn.smi.workflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.smi.workflow.domain.entity.WfIndexMapping;
import tn.smi.workflow.domain.entity.WfOperation;
import tn.smi.workflow.domain.entity.WfOperationIndex;
import tn.smi.workflow.repo.WfIndexMappingRepository;
import tn.smi.workflow.repo.WfOperationIndexRepository;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IndexService {

    private final WfIndexMappingRepository indexMappingRepository;
    private final WfOperationIndexRepository operationIndexRepository;

    /**
     * Update operation index based on extracted variables and mapping configuration.
     */
    public void updateIndex(WfOperation operation, Map<String, Object> variables) {
        Long wfDefId = operation.getWfDefinition().getWfDefId();
        List<WfIndexMapping> mappings = indexMappingRepository.findByWfDefinition_WfDefId(wfDefId);

        WfOperationIndex index = operationIndexRepository.findById(operation.getWfOpId())
                .orElseGet(() -> {
                    WfOperationIndex newIndex = new WfOperationIndex();
                    newIndex.setWfOperation(operation);
                    return newIndex;
                });

        for (WfIndexMapping mapping : mappings) {
            Object value = variables.get(mapping.getVarName());
            if (value == null) continue;

            String strValue = String.valueOf(value);
            switch (mapping.getIndexColumn().toUpperCase()) {
                case "IDX_CLIENT_ID" -> index.setIdxClientId(strValue);
                case "IDX_REF" -> index.setIdxRef(strValue);
                case "IDX_AGENCE_ID" -> index.setIdxAgenceId(strValue);
                case "IDX_AMOUNT_TND" -> {
                    try {
                        index.setIdxAmountTnd(Double.parseDouble(strValue));
                    } catch (NumberFormatException e) {
                        log.warn("Cannot parse amount: {}", strValue);
                    }
                }
                case "IDX1" -> index.setIdx1(strValue);
                case "IDX2" -> index.setIdx2(strValue);
                case "IDX3" -> index.setIdx3(strValue);
                case "IDX4" -> index.setIdx4(strValue);
                case "IDX5" -> index.setIdx5(strValue);
                case "IDX6" -> index.setIdx6(strValue);
                case "IDX7" -> index.setIdx7(strValue);
                case "IDX8" -> index.setIdx8(strValue);
                case "IDX9" -> index.setIdx9(strValue);
                case "IDX10" -> index.setIdx10(strValue);
                default -> log.warn("Unknown index column: {}", mapping.getIndexColumn());
            }
        }

        operationIndexRepository.save(index);
    }
}

