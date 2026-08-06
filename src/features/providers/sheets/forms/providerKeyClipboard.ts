export const resolveCopyableProviderKey = (
  enteredKey: string | null | undefined,
  existingKey: string | null | undefined
): string => enteredKey?.trim() || existingKey?.trim() || '';
