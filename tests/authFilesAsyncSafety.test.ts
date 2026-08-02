import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const dataHook = readFileSync('src/features/authFiles/hooks/useAuthFilesData.ts', 'utf8');
const modelsHook = readFileSync('src/features/authFiles/hooks/useAuthFilesModels.ts', 'utf8');
const page = readFileSync('src/pages/AuthFilesPage.tsx', 'utf8');

describe('auth files async safety', () => {
  test('guards upload entry points with a synchronous pending ref', () => {
    expect(dataHook).toContain('const uploadPendingRef = useRef(false)');
    expect(dataHook).toContain('if (uploadPendingRef.current) return');
    expect(dataHook).toContain('uploadPendingRef.current = true');
    expect(dataHook).toContain('uploadPendingRef.current = false');
    expect(page).toMatch(/disabled=\{[^}]*uploading/);
  });

  test('only the latest auth-files list request may publish state', () => {
    expect(dataHook).toContain('const loadRequestIdRef = useRef(0)');
    expect(dataHook).toContain('const requestId = ++loadRequestIdRef.current');
    expect(dataHook).toContain('if (requestId !== loadRequestIdRef.current) return');
    expect(dataHook).toContain('if (requestId === loadRequestIdRef.current)');
  });

  test('isolates model modal requests and invalidates stale cache entries', () => {
    expect(modelsHook).toContain('activeModelsRequestIdRef');
    expect(modelsHook).toContain('modelsCacheVersionRef');
    expect(modelsHook).toContain('modelsFileVersionRef');
    expect(modelsHook).toContain('invalidateModels');
    expect(modelsHook).toContain('if (isCacheCurrent() && isRequestCurrent()) setModelsList(models)');
    expect(modelsHook).toContain('if (isRequestCurrent()) setModelsLoading(false)');
  });

  test('wires auth-file mutations to model cache invalidation', () => {
    expect(dataHook).toContain('onFilesMutated');
    expect(page).toContain('onFilesMutated: invalidateModels');
  });
});
