import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasDisableAllModelsRule } from '@/components/providers/utils';
import { getMultiProtocolProviderDefinition } from '../../multiProtocolDefinitions';
import type {
  MultiProtocolKeyEntryInput,
  MultiProtocolProviderBrand,
  MultiProtocolProviderProtocol,
  MultiProtocolProviderRaw,
  ProviderEntryFormInput,
  ProviderResource,
} from '../../types';
import styles from './sharedForm.module.scss';

interface Props {
  brand: MultiProtocolProviderBrand;
  resource: ProviderResource | null;
  mode: 'create' | 'edit';
  mutating: boolean;
  formId: string;
  onSubmit: (input: ProviderEntryFormInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const emptyEntry = (
  brand: MultiProtocolProviderBrand,
  protocol?: MultiProtocolProviderProtocol
): MultiProtocolKeyEntryInput => {
  const definition = getMultiProtocolProviderDefinition(brand);
  return {
    protocol: protocol ?? definition.defaultProtocol,
    apiKey: '',
    existingApiKey: '',
    baseUrl: definition.baseUrlOptions[0]?.baseUrl ?? '',
    proxyUrl: '',
    prefix: '',
    disabled: false,
    disableCooling: false,
    priority: undefined,
    models: [],
  };
};

const fromRaw = (
  brand: MultiProtocolProviderBrand,
  resource: ProviderResource | null
): MultiProtocolKeyEntryInput[] => {
  if (!resource || resource.brand !== brand) return [emptyEntry(brand)];
  const definition = getMultiProtocolProviderDefinition(brand);
  const raw = resource.raw as MultiProtocolProviderRaw;
  const mapKey = (
    protocol: Exclude<MultiProtocolProviderProtocol, 'openai'>,
    config: MultiProtocolProviderRaw['claude'][number]['config']
  ): MultiProtocolKeyEntryInput => ({
    ...emptyEntry(brand, protocol),
    existingApiKey: config.apiKey ?? '',
    baseUrl: definition.resolveBaseUrl(config.baseUrl),
    proxyUrl: config.proxyUrl ?? '',
    prefix: config.prefix ?? '',
    disabled: hasDisableAllModelsRule(config.excludedModels),
    disableCooling: config.disableCooling === true,
    priority: config.priority,
    models: config.models?.map((model) => ({ ...model })) ?? [],
  });
  const entries: MultiProtocolKeyEntryInput[] = [];
  const openai = raw.openai[0]?.config;
  if (openai) {
    const key = openai.apiKeyEntries?.[0];
    entries.push({
      ...emptyEntry(brand, 'openai'),
      existingApiKey: key?.apiKey ?? '',
      baseUrl: definition.resolveBaseUrl(openai.baseUrl),
      proxyUrl: key?.proxyUrl ?? '',
      prefix: openai.prefix ?? '',
      disabled: openai.disabled === true,
      disableCooling: openai.disableCooling === true,
      priority: openai.priority,
      models: openai.models?.map((model) => ({ ...model })) ?? [],
    });
  }
  const claude = raw.claude[0]?.config;
  const codex = raw.codex[0]?.config;
  const gemini = raw.gemini[0]?.config;
  if (claude) entries.push(mapKey('claude', claude));
  if (gemini) entries.push(mapKey('gemini', gemini));
  if (codex) entries.push(mapKey('codex', codex));
  return entries.length ? entries : [emptyEntry(brand)];
};

export function MultiProtocolProviderForm({
  brand,
  resource,
  mode,
  mutating,
  formId,
  onSubmit,
  onDirtyChange,
}: Props) {
  const { t } = useTranslation();
  const definition = getMultiProtocolProviderDefinition(brand);
  const initial = useMemo(() => fromRaw(brand, resource), [brand, resource]);
  const initialSignature = useMemo(() => JSON.stringify(initial), [initial]);
  const [entries, setEntries] = useState(initial);
  const dirty = JSON.stringify(entries) !== initialSignature;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const update = (index: number, patch: Partial<MultiProtocolKeyEntryInput>) => {
    setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <form
      id={formId}
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          apiKey: '', name: '', baseUrl: '', proxyUrl: '', prefix: '', disabled: false,
          models: [], headers: [], excludedModelsText: '', multiProtocolKeyEntries: entries,
        });
      }}
    >
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{definition.displayName}</h3>
        <p className={styles.sectionHint}>{t('providersPage.multiProtocol.description')}</p>
        {entries.map((entry, index) => {
          const used = new Set(entries.filter((_, i) => i !== index).map((item) => item.protocol));
          return (
            <div className={styles.arrayItem} key={`${entry.protocol}:${index}`}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>{t('providersPage.multiProtocol.protocol')}</span>
                  <select
                    className={styles.input}
                    value={entry.protocol}
                    disabled={mutating}
                    onChange={(event) => update(index, { protocol: event.target.value as MultiProtocolProviderProtocol })}
                  >
                    {definition.protocols.map((protocol) => (
                      <option key={protocol} value={protocol} disabled={used.has(protocol)}>
                        {t(`providersPage.protocols.${protocol}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t('providersPage.form.apiKey')}</span>
                  <input
                    className={styles.input}
                    type="password"
                    value={entry.apiKey}
                    disabled={mutating}
                    required={mode === 'create' && !entry.existingApiKey}
                    placeholder={mode === 'edit' && entry.existingApiKey ? '••••••••' : ''}
                    onChange={(event) => update(index, { apiKey: event.target.value })}
                  />
                </label>
                {definition.baseUrlOptions.length > 1 ? (
                  <label className={styles.field}>
                    <span className={styles.label}>{t('providersPage.multiProtocol.endpoint')}</span>
                    <select className={styles.input} value={entry.baseUrl} disabled={mutating} onChange={(event) => update(index, { baseUrl: event.target.value })}>
                      {definition.baseUrlOptions.map((option) => <option key={option.id} value={option.baseUrl}>{option.id}</option>)}
                    </select>
                  </label>
                ) : null}
                <label className={styles.field}>
                  <span className={styles.label}>{t('providersPage.form.proxyUrl')}</span>
                  <input className={styles.input} value={entry.proxyUrl} disabled={mutating} onChange={(event) => update(index, { proxyUrl: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t('providersPage.form.prefix')}</span>
                  <input className={styles.input} value={entry.prefix} disabled={mutating} onChange={(event) => update(index, { prefix: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{t('providersPage.form.priority')}</span>
                  <input className={styles.input} type="number" value={entry.priority ?? ''} disabled={mutating} onChange={(event) => update(index, { priority: event.target.value === '' ? undefined : Number(event.target.value) })} />
                </label>
              </div>
              <label className={styles.checkboxRow}>
                <input className={styles.checkboxBox} type="checkbox" checked={entry.disabled} disabled={mutating} onChange={(event) => update(index, { disabled: event.target.checked })} />
                <span>{t('providersPage.form.disabled')}</span>
              </label>
              {entries.length > 1 ? <button className={styles.removeBtn} type="button" disabled={mutating} onClick={() => setEntries((current) => current.filter((_, i) => i !== index))}>{t('providersPage.actions.delete')}</button> : null}
            </div>
          );
        })}
        {entries.length < definition.protocols.length ? (
          <button className={styles.addBtn} type="button" disabled={mutating} onClick={() => {
            const used = new Set(entries.map((entry) => entry.protocol));
            const protocol = definition.protocols.find((candidate) => !used.has(candidate));
            if (protocol) setEntries((current) => [...current, emptyEntry(brand, protocol)]);
          }}>{t('providersPage.multiProtocol.addProtocol')}</button>
        ) : null}
      </div>
    </form>
  );
}
