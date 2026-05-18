package IbansysPoc.AVA.exception;

/**
 * Exception métier pour les erreurs de validation des règles business.
 * Utilisée pour bloquer les opérations invalides.
 */
public class BusinessException extends RuntimeException {

    private final String codeErreur;

    public BusinessException(String message) {
        super(message);
        this.codeErreur = "BUSINESS_ERROR";
    }

    public BusinessException(String codeErreur, String message) {
        super(message);
        this.codeErreur = codeErreur;
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
        this.codeErreur = "BUSINESS_ERROR";
    }

    public String getCodeErreur() {
        return codeErreur;
    }
}

