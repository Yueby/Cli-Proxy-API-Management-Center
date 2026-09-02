import { afterEach, describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { claudeApiToResource, claudeToResource } from '../src/features/providers/adapters';
import { apiClient } from '../src/services/api/client';
import { providersApi } from '../src/services/api/providers';
import { normalizeConfigResponse } from '../src/services/api/transformers';
import { BaseProviderForm } from '../src/features/providers/sheets/forms/BaseProviderForm';
import { ProviderResourceTable } from '../src/features/providers/components/ProviderResourceTable';
import type { ProviderResource } from '../src/features/providers/types';

const originalGet = apiClient.get;
const originalPut = apiClient.put;

const callerOwnedConfig = {
  apiKey: 'claude-secret',
  baseUrl: 'https://api.anthropic.com',
};

afterEach(() => {
  apiClient.get = originalGet;
  apiClient.put = originalPut;
});

describe('Claude fingerprint profile semantic port', () => {
  test('normalizes the backend field and exposes the CLI profile resource flag for both claude and claudeApi', () => {
    const config = normalizeConfigResponse({
      'claude-api-key': [
        {
          'api-key': 'claude-secret',
          'base-url': 'https://api.anthropic.com',
          'fingerprint-profile': 'claude-code-cli',
        },
      ],
    });

    expect(config.claudeApiKeys).toEqual([
      {
        apiKey: 'claude-secret',
        baseUrl: 'https://api.anthropic.com',
        fingerprintProfile: 'claude-code-cli',
      },
    ]);
    expect(claudeToResource(config.claudeApiKeys![0], 0).flags.claudeCodeCliProfile).toBe(true);
    expect(claudeApiToResource(config.claudeApiKeys![0], 0).flags.claudeCodeCliProfile).toBe(true);
  });

  test('does not flag non-cli or arbitrary future profiles as claudeCodeCliProfile', () => {
    const config = normalizeConfigResponse({
      'claude-api-key': [
        {
          'api-key': 'claude-secret-future',
          'base-url': 'https://api.anthropic.com',
          'fingerprint-profile': 'future-custom-profile',
        },
      ],
    });

    expect(config.claudeApiKeys![0].fingerprintProfile).toBe('future-custom-profile');
    expect(claudeToResource(config.claudeApiKeys![0], 0).flags.claudeCodeCliProfile).toBe(false);
    expect(claudeApiToResource(config.claudeApiKeys![0], 0).flags.claudeCodeCliProfile).toBe(false);
  });

  test('serializes the opt-in profile when saving Claude configs', async () => {
    const calls: Array<{ url: string; data?: unknown }> = [];
    apiClient.get = (async () => ({ 'claude-api-key': [] })) as typeof apiClient.get;
    apiClient.put = (async (url: string, data?: unknown) => {
      calls.push({ url, data });
      return undefined;
    }) as typeof apiClient.put;

    await providersApi.saveClaudeConfigs([
      {
        ...callerOwnedConfig,
        fingerprintProfile: 'claude-code-cli',
      },
    ]);

    expect(calls).toEqual([
      {
        url: '/claude-api-key',
        data: [
          {
            'api-key': 'claude-secret',
            'base-url': 'https://api.anthropic.com',
            'fingerprint-profile': 'claude-code-cli',
          },
        ],
      },
    ]);
  });

  test('clears the profile and deprecated CCH field when saving caller-owned mode while preserving unknown future fields', async () => {
    const calls: Array<{ url: string; data?: unknown }> = [];
    apiClient.get = (async () => ({
      'claude-api-key': [
        {
          'api-key': 'claude-secret',
          'base-url': 'https://api.anthropic.com',
          'fingerprint-profile': 'claude-code-cli',
          'experimental-cch-signing': true,
          'future-field': 'preserved',
        },
      ],
    })) as typeof apiClient.get;
    apiClient.put = (async (url: string, data?: unknown) => {
      calls.push({ url, data });
      return undefined;
    }) as typeof apiClient.put;

    await providersApi.saveClaudeConfigs([callerOwnedConfig]);

    expect(calls).toEqual([
      {
        url: '/claude-api-key',
        data: [
          {
            'api-key': 'claude-secret',
            'base-url': 'https://api.anthropic.com',
            'future-field': 'preserved',
          },
        ],
      },
    ]);
  });

  test('renders CLI profile tag in ProviderResourceTable for claude and claudeApi resources', () => {
    const resources: ProviderResource[] = [
      {
        id: 'claude:0:sk-ant',
        brand: 'claude',
        originalIndex: 0,
        name: null,
        identifier: 'sk-ant-***',
        apiKeyPreview: 'sk-ant-***',
        apiKey: 'sk-ant-secret',
        authIndex: null,
        baseUrl: 'https://api.anthropic.com',
        proxyUrl: null,
        prefix: null,
        modelCount: 0,
        models: [],
        headerCount: 0,
        excludedModelCount: 0,
        apiKeyEntryCount: 0,
        disabled: false,
        flags: {
          claudeCodeCliProfile: true,
          cloakEnabled: false,
        },
        selector: {
          brand: 'claude',
          apiKey: 'sk-ant-secret',
          baseUrl: 'https://api.anthropic.com',
          index: 0,
        },
        raw: {},
      },
      {
        id: 'claudeApi:1:sk-api',
        brand: 'claudeApi',
        originalIndex: 1,
        name: 'ClaudeAPI',
        identifier: 'sk-api-***',
        apiKeyPreview: 'sk-api-***',
        apiKey: 'sk-api-secret',
        authIndex: null,
        baseUrl: 'https://gw.apito.ai',
        proxyUrl: null,
        prefix: null,
        modelCount: 0,
        models: [],
        headerCount: 0,
        excludedModelCount: 0,
        apiKeyEntryCount: 0,
        disabled: false,
        flags: {
          claudeCodeCliProfile: true,
          cloakEnabled: true,
        },
        selector: {
          brand: 'claudeApi',
          apiKey: 'sk-api-secret',
          baseUrl: 'https://gw.apito.ai',
          index: 1,
        },
        raw: {},
      },
      {
        id: 'claude:2:sk-default',
        brand: 'claude',
        originalIndex: 2,
        name: null,
        identifier: 'sk-def-***',
        apiKeyPreview: 'sk-def-***',
        apiKey: 'sk-def-secret',
        authIndex: null,
        baseUrl: 'https://api.anthropic.com',
        proxyUrl: null,
        prefix: null,
        modelCount: 0,
        models: [],
        headerCount: 0,
        excludedModelCount: 0,
        apiKeyEntryCount: 0,
        disabled: false,
        flags: {
          claudeCodeCliProfile: false,
        },
        selector: {
          brand: 'claude',
          apiKey: 'sk-def-secret',
          baseUrl: 'https://api.anthropic.com',
          index: 2,
        },
        raw: {},
      },
    ];

    const html = renderToStaticMarkup(
      createElement(ProviderResourceTable, {
        resources,
        brand: 'claude',
        onEdit: () => {},
        onDelete: () => {},
        onToggleDisabled: () => {},
      })
    );

    expect(html).toContain('Claude Code CLI');
    expect(html).toContain('sk-ant-***');
    expect(html).toContain('sk-api-***');
  });

  test('BaseProviderForm renders project Select for fingerprint profile and removes experimental CCH checkbox for claude brand', () => {
    const html = renderToStaticMarkup(
      createElement(BaseProviderForm, {
        brand: 'claude',
        mode: 'create',
        resource: null,
        mutating: false,
        formId: 'base-provider-form-create',
        onSubmit: async () => {},
      })
    );

    expect(html).toContain('指纹 Profile');
    expect(html).toContain('默认 (调用方自带)');
    expect(html).toContain('为 Claude 请求设置客户端设备与平台指纹请求头');
    expect(html).not.toContain('实验性 CCH 签名');
    expect(html).not.toContain('experimentalCchSigning');

    const htmlWithCli = renderToStaticMarkup(
      createElement(BaseProviderForm, {
        brand: 'claude',
        mode: 'edit',
        formId: 'base-provider-form-edit',
        mutating: false,
        resource: {
          id: 'claude:0:sk-ant',
          brand: 'claude',
          originalIndex: 0,
          name: null,
          identifier: 'sk-ant-***',
          apiKeyPreview: 'sk-ant-***',
          apiKey: '«reda...…»',
          authIndex: null,
          baseUrl: 'https://api.anthropic.com',
          proxyUrl: null,
          prefix: null,
          modelCount: 0,
          models: [],
          headerCount: 0,
          excludedModelCount: 0,
          apiKeyEntryCount: 0,
          disabled: false,
          flags: {
            claudeCodeCliProfile: true,
          },
          selector: {
            brand: 'claude',
            apiKey: '«reda...…»',
            baseUrl: 'https://api.anthropic.com',
            index: 0,
          },
          raw: {
            apiKey: 'sk-ant',
            baseUrl: 'https://api.anthropic.com',
            fingerprintProfile: 'claude-code-cli',
          },
        },
        onSubmit: async () => {},
      })
    );

    expect(htmlWithCli).toContain('Claude Code CLI');
  });
});
