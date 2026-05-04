/**
 * Authenticated API utility for AVA frontend
 * Handles JWT tokens, session IDs, and automatic token refresh
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface LoginResponse {
  email: string;
  access_token: string;
  roles: string[];
  userId?: number;
  orgNodeId?: number;
  roleCode?: string;
}

export interface RefreshResponse {
  access_token: string;
}

/**
 * Get current access token from sessionStorage
 */
export const getAccessToken = (): string | null => {
  return sessionStorage.getItem('accessToken');
};

/**
 * Get current session ID from sessionStorage
 */
export const getSessionId = (): string | null => {
  return sessionStorage.getItem('X-Session-Id');
};

/**
 * Generate a new session ID if none exists
 */
export const ensureSessionId = (): string => {
  let sessionId = sessionStorage.getItem('X-Session-Id');
  if (!sessionId) {
    sessionId = `session-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('X-Session-Id', sessionId);
  }
  return sessionId;
};

/**
 * Clear authentication data (logout)
 */
export const clearAuth = (): void => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('X-Session-Id');
  sessionStorage.removeItem('wf_user_id');
  sessionStorage.removeItem('wf_org_node_id');
  sessionStorage.removeItem('wf_role_code');
};

/**
 * Get WF engine user context from sessionStorage
 */
export const getWfUserContext = () => ({
  userId: sessionStorage.getItem('wf_user_id') ?? '1',
  orgNodeId: sessionStorage.getItem('wf_org_node_id'),
  roleCode: sessionStorage.getItem('wf_role_code') ?? 'ADMIN',
});

/**
 * Login function
 */
export const login = async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
  const sessionId = ensureSessionId();

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || 'Login failed',
        status: response.status,
      };
    }

    // Store the access token
    const token = data.access_token || data.accessToken;
    if (token) {
      sessionStorage.setItem('accessToken', token);
    }

    // Store WF user context (falls back to admin defaults for POC if backend doesn't return these)
    // TODO: wire up properly once the business-service login returns userId/orgNodeId/roleCode
    sessionStorage.setItem('wf_user_id', String(data.userId ?? 1));
    if (data.orgNodeId != null) {
      sessionStorage.setItem('wf_org_node_id', String(data.orgNodeId));
    }
    sessionStorage.setItem(
      'wf_role_code',
      data.roleCode ?? (data.roles?.[0] as string | undefined) ?? 'ADMIN',
    );

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error during login',
      status: 0,
    };
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (): Promise<ApiResponse<RefreshResponse>> => {
  const sessionId = getSessionId();
  if (!sessionId) {
    return {
      error: 'No session ID available',
      status: 401,
    };
  }

  try {
    const response = await fetch('/auth/refresh-token', {
      method: 'GET',
      headers: {
        'X-Session-Id': sessionId,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || 'Token refresh failed',
        status: response.status,
      };
    }

    // Store the new access token
    const token = data.access_token || data.accessToken;
    if (token) {
      sessionStorage.setItem('accessToken', token);
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error during token refresh',
      status: 0,
    };
  }
};

/**
 * Logout function
 */
export const logout = async (): Promise<ApiResponse<void>> => {
  const sessionId = getSessionId();

  try {
    if (sessionId) {
      await fetch('/auth/logout', {
        method: 'GET',
        headers: {
          'X-Session-Id': sessionId,
        },
        credentials: 'include',
      });
    }
  } catch (error) {
    // Ignore logout errors
  }

  clearAuth();

  return {
    status: 200,
  };
};

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization and X-Session-Id headers
 * Handles token refresh on 401 responses
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAccessToken();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Include cookies for refresh token
  };

  let response = await fetch(url, requestOptions);

  // If we get 401 and have a token, try to refresh once
  if (response.status === 401 && token) {
    const refreshResult = await refreshToken();
    if (refreshResult.data?.accessToken) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${refreshResult.data.accessToken}`;
      response = await fetch(url, requestOptions);
    }
  }

  return response;
};

/**
 * Authenticated GET request
 */
export const apiGet = async <T = any>(url: string): Promise<ApiResponse<T>> => {
  try {
    const response = await authenticatedFetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || `Request failed: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error',
      status: 0,
    };
  }
};

/**
 * Authenticated POST request
 */
export const apiPost = async <T = any>(
  url: string,
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || `Request failed: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error',
      status: 0,
    };
  }
};

/**
 * Authenticated PUT request
 */
export const apiPut = async <T = any>(
  url: string,
  body?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || `Request failed: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error',
      status: 0,
    };
  }
};

/**
 * Authenticated DELETE request
 */
export const apiDelete = async <T = any>(url: string): Promise<ApiResponse<T>> => {
  try {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        error: data?.message || `Request failed: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error',
      status: 0,
    };
  }
};