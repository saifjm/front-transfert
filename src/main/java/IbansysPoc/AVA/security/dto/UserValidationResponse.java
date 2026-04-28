package IbansysPoc.AVA.security.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * User info returned by SWF-Auth GET /auth/users/me — used to validate a token
 * and populate the SecurityContext.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserValidationResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private Boolean isEnabled;
    private List<String> roles;
}
