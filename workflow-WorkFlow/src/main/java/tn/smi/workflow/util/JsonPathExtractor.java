package tn.smi.workflow.util;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class JsonPathExtractor {

    public Map<String, Object> extract(String jsonPayload, Map<String, String> pathMappings) {
        Map<String, Object> result = new HashMap<>();
        if (jsonPayload == null || jsonPayload.isBlank()) {
            return result;
        }
        Object document = com.jayway.jsonpath.Configuration.defaultConfiguration().jsonProvider().parse(jsonPayload);
        for (Map.Entry<String, String> entry : pathMappings.entrySet()) {
            try {
                Object value = JsonPath.read(document, entry.getValue());
                result.put(entry.getKey(), value);
            } catch (PathNotFoundException e) {
                log.debug("JSONPath not found: {} for variable {}", entry.getValue(), entry.getKey());
            } catch (Exception e) {
                log.warn("Error extracting JSONPath {} for variable {}: {}", entry.getValue(), entry.getKey(), e.getMessage());
            }
        }
        return result;
    }
}
