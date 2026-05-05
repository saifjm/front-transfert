package tn.smi.workflow.util;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public class IdempotencyKeyFactory {

    /**
     * Build a stable idempotency key from workflow operation context.
     */
    public String generate(Long wfOpId, String taskId, String decisionTag, String businessKey) {
        String raw = wfOpId + "|" + taskId + "|" + decisionTag + "|" + businessKey;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
