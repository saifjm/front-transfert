import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global handler wired in by ErrorProvider on mount
let globalShowError: ((message: string, details?: string, title?: string) => void) | null = null;

export function setGlobalErrorHandler(handler: (message: string, details?: string, title?: string) => void) {
  globalShowError = handler;
}

/**
 * Show an error modal from anywhere — no hook required.
 * title  : bold header  (optional, defaults to "Erreur")
 * message: main body text
 * details: collapsible technical detail (optional)
 */
export function showError(message: string, details?: string, title?: string) {
  if (globalShowError) {
    globalShowError(message, details, title);
  } else {
    console.error('[showError]', title ?? 'Erreur', message, details);
  }
}

/** @deprecated use showError() */
export function showTechnicalError(message: string, details?: string) {
  showError(message, details);
}

/**
 * Parse JSON de manière sécurisée et silencieuse
 * Vérifie le Content-Type avant de parser
 * Retourne null en cas d'erreur (pas de log d'erreur dans la console)
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T | null> {
  try {
    // Vérifier d'abord le Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Pas de JSON, retourner null silencieusement
      return null;
    }

    // Tenter de parser le JSON directement (sans cloner)
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Toute erreur retourne null silencieusement (pas de console.error)
    // Cela inclut les erreurs de parsing JSON et les erreurs de lecture du body
    return null;
  }
}

/**
 * Wrapper pour les appels API avec gestion d'erreur automatique
 * Affiche un popup d'erreur en cas de problème réseau ou serveur
 */
export async function apiCall<T = any>(
  url: string,
  options?: RequestInit,
  showErrorPopup: boolean = true
): Promise<{ data: T | null; error: boolean }> {
  try {
    const response = await fetch(url, options);

    // Vérifier le statut de la réponse
    if (!response.ok) {
      const errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`;
      const errorDetails = `URL: ${url}\nMéthode: ${options?.method || 'GET'}\nStatut: ${response.status}`;
      
      if (showErrorPopup) {
        showTechnicalError(errorMessage, errorDetails);
      }
      
      return { data: null, error: true };
    }

    // Parser la réponse JSON
    const data = await safeJsonParse<T>(response);
    
    if (data === null && showErrorPopup) {
      const errorMessage = 'Réponse invalide du serveur (JSON attendu)';
      const errorDetails = `URL: ${url}\nContent-Type: ${response.headers.get('content-type')}`;
      showTechnicalError(errorMessage, errorDetails);
      return { data: null, error: true };
    }

    return { data, error: false };
  } catch (error) {
    // Erreur réseau ou autre erreur inattendue
    const errorMessage = error instanceof Error ? error.message : 'Erreur réseau inconnue';
    const errorDetails = `URL: ${url}\nType: ${error instanceof Error ? error.name : 'Unknown'}\nStack: ${error instanceof Error ? error.stack : 'N/A'}`;
    
    if (showErrorPopup) {
      showTechnicalError(errorMessage, errorDetails);
    }
    
    return { data: null, error: true };
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[\\]+/g, '/').replace(/^\/+|\/+$/g, '');
}

export function getCurrentDocumentPathParts() {
  const now = new Date();
  return {
    pathAnnee: String(now.getFullYear()),
    pathMois: String(now.getMonth() + 1).padStart(2, '0'),
  };
}

export function buildDocumentPath(options: {
  fileName: string;
  basePath?: string;
  pathAnnee?: string;
  pathMois?: string;
}) {
  const fileName = (options.fileName || '').trim();
  const fallback = getCurrentDocumentPathParts();
  const pathAnnee = sanitizePathPart(options.pathAnnee || fallback.pathAnnee);
  const pathMois = sanitizePathPart(options.pathMois || fallback.pathMois);
  const cleanBase = sanitizePathPart((options.basePath || '').trim());

  const relativePath = `/${pathAnnee}/${pathMois}/${fileName}`;
  const fullPath = cleanBase ? `/${cleanBase}${relativePath}` : relativePath;

  return {
    pathAnnee,
    pathMois,
    relativePath,
    fullPath,
  };
}