export class MultiProtocolPartialMutationError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('A multi-protocol provider update only completed partially. The latest server state was reloaded.');
    this.name = 'MultiProtocolPartialMutationError';
    this.cause = cause;
  }
}

export const isMultiProtocolPartialMutationError = (
  error: unknown
): error is MultiProtocolPartialMutationError => error instanceof MultiProtocolPartialMutationError;

export async function runMultiProtocolMutationWithRecovery<T>(
  mutate: () => Promise<T>,
  refresh: () => Promise<unknown>
): Promise<T> {
  try {
    return await mutate();
  } catch (cause) {
    try {
      await refresh();
    } catch {
      // Preserve the mutation failure; refresh is best-effort recovery.
    }
    throw new MultiProtocolPartialMutationError(cause);
  }
}
