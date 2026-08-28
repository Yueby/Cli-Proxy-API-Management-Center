import { afterEach, describe, expect, test } from 'bun:test';
import { CODEX_CONFIG } from '@/components/quota/quotaConfigs';
import { CODEX_REQUEST_HEADERS } from '@/utils/quota/constants';
import { apiCallApi } from '@/services/api/apiCall';
import type { AuthFileItem } from '@/types/authFile';

const originalApiCallRequest = apiCallApi.request;

const dummyT = ((key: string) => key) as never;

afterEach(() => {
  apiCallApi.request = originalApiCallRequest;
});

describe('Codex quota request user-agent seam', () => {
  test('fetchCodexQuota dispatches request with updated CODEX_REQUEST_HEADERS User-Agent', async () => {
    let capturedHeader: Record<string, string> | undefined;

    apiCallApi.request = (async (options: { header?: Record<string, string> }) => {
      capturedHeader = options.header;
      return {
        statusCode: 200,
        body: {
          plan_type: 'pro',
          rate_limit: {
            allowed: true,
            limit_reached: false,
            primary_window: {
              used_percent: 10,
              reset_at: 1787880000,
              limit_window_seconds: 3600,
            },
          },
        },
      };
    }) as typeof apiCallApi.request;

    const file: AuthFileItem = {
      name: 'codex-auth.json',
      type: 'codex',
      auth_index: 'codex:1',
      authIndex: 'codex:1',
    };

    await CODEX_CONFIG.fetchQuota(file, dummyT);

    expect(capturedHeader).toBeDefined();
    expect(capturedHeader?.['User-Agent']).toBe(
      'codex-tui/0.149.1 (Mac OS 26.5.2; arm64) iTerm.app/3.6.11 (codex-tui; 0.149.1)'
    );
    expect(capturedHeader?.['User-Agent']).toBe(CODEX_REQUEST_HEADERS['User-Agent']);
    expect(capturedHeader?.['Authorization']).toBe('Bearer $TOKEN$');
    expect(capturedHeader?.['Content-Type']).toBe('application/json');
  });
});
