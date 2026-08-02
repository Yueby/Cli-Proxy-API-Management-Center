export type AsyncSessionGuard = {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (sessionId: number) => boolean;
};

export const createAsyncSessionGuard = (): AsyncSessionGuard => {
  let currentSessionId = 0;
  return {
    begin: () => ++currentSessionId,
    invalidate: () => {
      currentSessionId += 1;
    },
    isCurrent: (sessionId) => sessionId === currentSessionId,
  };
};