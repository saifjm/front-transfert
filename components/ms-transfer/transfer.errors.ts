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
