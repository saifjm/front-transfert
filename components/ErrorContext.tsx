import React, { createContext, useContext, useState, useCallback } from 'react';
import { setGlobalErrorHandler } from '../utils';

export interface ErrorState {
  isOpen: boolean;
  message: string;
  details?: string;
}

interface ErrorContextType {
  error: ErrorState;
  showError: (message: string, details?: string) => void;
  hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<ErrorState>({
    isOpen: false,
    message: '',
    details: undefined,
  });

  const showError = useCallback((message: string, details?: string) => {
    setError({
      isOpen: true,
      message,
      details,
    });
  }, []);

  const hideError = useCallback(() => {
    setError({
      isOpen: false,
      message: '',
      details: undefined,
    });
  }, []);

  // Enregistrer le handler global au montage du provider
  React.useEffect(() => {
    setGlobalErrorHandler(showError);
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ error, showError, hideError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}

// Export du contexte pour un accès direct si nécessaire
export { ErrorContext };