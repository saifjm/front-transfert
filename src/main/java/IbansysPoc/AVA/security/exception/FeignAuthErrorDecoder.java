package IbansysPoc.AVA.security.exception;

import feign.Response;
import feign.codec.ErrorDecoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Translates Feign HTTP errors from SWF-Auth into proper Spring exceptions
 * so a 401/403 from SWF-Auth propagates cleanly as a 401 to the AVA client
 * instead of surfacing as a 500.
 */
@Component
public class FeignAuthErrorDecoder implements ErrorDecoder {

    private static final Logger log = LoggerFactory.getLogger(FeignAuthErrorDecoder.class);
    private final ErrorDecoder defaultDecoder = new Default();

    @Override
    public Exception decode(String methodKey, Response response) {
        log.warn("SWF-Auth call [{}] returned HTTP {}", methodKey, response.status());
        return switch (response.status()) {
            case 401 -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Invalid or expired token");
            case 403 -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied");
            case 404 -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Auth resource not found");
            default  -> defaultDecoder.decode(methodKey, response);
        };
    }
}
