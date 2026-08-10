/**
 * Error that is safe to display to an end user.
 * Technical errors must stay in logs and be replaced by a business fallback.
 */
export class UserMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserMessageError';
  }
}

export function getUserMessage(reason: unknown, fallback: string): string {
  return reason instanceof UserMessageError ? reason.message : fallback;
}

/**
 * Keeps the AVA-like "no result" state separate from a technical error without
 * coupling the UI to the transport implementation.
 *
 * The API layer currently exposes a safe business message but no structured
 * error code. When a code is added to UserMessageError this helper can be
 * reduced to a code comparison without changing ClientSection.
 */
export function isClientNotFoundError(reason: unknown): boolean {
  if (!(reason instanceof UserMessageError)) return false;

  const normalized = reason.message.trim().toLowerCase();
  return (
    normalized.includes('aucun client')
    || normalized.includes('client introuvable')
    || normalized.includes('aucune fiche client')
    || normalized.includes('aucune donn')
  );
}
