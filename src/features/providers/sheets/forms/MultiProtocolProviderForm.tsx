import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasDisableAllModelsRule } from '@/components/providers/utils';
import { Select } from '@/components/ui/Select';
import { IconCopy } from '@/components/ui/icons';
import { useNotificationStore } from '@/stores';
import { copyToClipboard } from '@/utils/clipboard';
import { getMultiProtocolAggregationConflict } from '../../multiProtocolAggregation';
import { getMultiProtocolProviderDefinition } from '../../multiProtocolDefinitions';
import type {
  MultiProtocolKeyEntryInput,
  MultiProtocolProviderBrand,
  MultiProtocolProviderProtocol,
  MultiProtocolProviderRaw,
  ProviderEntryFormInput,
  ProviderResource,
} from '../../types';
import { resolveCopyableProviderKey } from './providerKeyClipboard';
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
  const showNotification = useNotificationStore((state) => state.showNotification);
  const definition = getMultiProtocolProviderDefinition(brand);
  const initial = useMemo(() => fromRaw(brand, resource), [brand, resource]);
  const initialSignature = useMemo(() => JSON.stringify(initial), [initial]);
  const [entries, setEntries] = useState(initial);
  const dirty = JSON.stringify(entries) !== initialSignature;
  const aggregationConflict =
    mode === 'edit'
      ? getMultiProtocolAggregationConflict(resource?.raw as MultiProtocolProviderRaw | undefined)
      : null;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const update = (index: number, patch: Partial<MultiProtocolKeyEntryInput>) => {
    setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  if (aggregationConflict) {
    return (
      <form id={formId} className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.errorBox}>
          {t('providersPage.multiProtocol.aggregationConflict', {
            defaultValue:
              'This provider has multiple configurations for one protocol and cannot be safely edited here.',
          })}
        </div>
      </form>
    );
  }

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
        <div className={styles.multiProtocolIntro}>
          <h3 className={styles.sectionTitle}>{definition.displayName}</h3>
          <p className={styles.sectionHint}>{t('providersPage.multiProtocol.description')}</p>
        </div>

        <div className={styles.multiProtocolList}>
          {entries.map((entry, index) => {
            const copyableKey = resolveCopyableProviderKey(entry.apiKey, entry.existingApiKey);
            const copyApiKey = async () => {
              const copied = await copyToClipboard(copyableKey);
              showNotification(
                copied ? t('providersPage.form.apiKeyCopied') : t('notification.copy_failed'),
                copied ? 'success' : 'error'
              );
            };
            const used = new Set(
              entries.filter((_, i) => i !== index).map((item) => item.protocol)
            );
            return (
              <div className={styles.multiProtocolCard} key={`${entry.protocol}:${index}`}>
                <div className={styles.multiProtocolCardHeader}>
                  <div className={styles.multiProtocolProtocolField}>
                    <span className={styles.label} id={`${formId}-protocol-${index}-label`}>
                      {t('providersPage.multiProtocol.protocol')}
                    </span>
                    <Select
                      value={entry.protocol}
                      disabled={mutating}
                      ariaLabelledBy={`${formId}-protocol-${index}-label`}
                      options={definition.protocols
                        .filter((protocol) => protocol === entry.protocol || !used.has(protocol))
                        .map((protocol) => ({
                          value: protocol,
                          label: t(`providersPage.protocols.${protocol}`),
                        }))}
                      onChange={(protocol) =>
                        update(index, {
                          protocol: protocol as MultiProtocolProviderProtocol,
                        })
                      }
                    />
                  </div>
                  {entries.length > 1 ? (
                    <button
                      className={styles.removeBtn}
                      type="button"
                      disabled={mutating}
                      onClick={() =>
                        setEntries((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      {t('providersPage.actions.delete')}
                    </button>
                  ) : null}
                </div>

                <div className={`${styles.field} ${styles.multiProtocolApiKey}`}>
                  <span className={styles.label}>{t('providersPage.form.apiKey')}</span>
                  <div className={styles.passwordField}>
                    <input
                      className={`${styles.passwordInput} ${styles.passwordInputSingleAction}`}
                      type="password"
                      autoComplete="new-password"
                      value={entry.apiKey}
                      disabled={mutating}
                      required={mode === 'create' && !entry.existingApiKey}
                      placeholder={
                        mode === 'edit' && entry.existingApiKey
                          ? t('providersPage.form.apiKeyEditPlaceholder')
                          : t('providersPage.form.apiKeyCreatePlaceholder')
                      }
                      onChange={(event) => update(index, { apiKey: event.target.value })}
                    />
                    <button
                      type="button"
                      className={`${styles.passwordToggle} ${styles.passwordCopyOnly}`}
                      onClick={() => void copyApiKey()}
                      disabled={mutating || !copyableKey}
                      aria-label={t('providersPage.form.copyApiKey')}
                      title={t('providersPage.form.copyApiKey')}
                    >
                      <IconCopy size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.multiProtocolGrid}>
                  {definition.baseUrlOptions.length > 1 ? (
                    <div className={styles.field}>
                      <span className={styles.label} id={`${formId}-endpoint-${index}-label`}>
                        {t('providersPage.multiProtocol.endpoint')}
                      </span>
                      <Select
                        value={entry.baseUrl}
                        disabled={mutating}
                        ariaLabelledBy={`${formId}-endpoint-${index}-label`}
                        options={definition.baseUrlOptions.map((option) => ({
                          value: option.baseUrl,
                          label: t(`providersPage.multiProtocol.${option.descriptionKey ?? option.id}`, {
                            defaultValue: option.id,
                          }),
                        }))}
                        onChange={(baseUrl) => update(index, { baseUrl })}
                      />
                    </div>
                  ) : null}
                  <label className={styles.field}>
                    <span className={styles.label}>{t('providersPage.form.proxyUrl')}</span>
                    <input
                      className={styles.input}
                      value={entry.proxyUrl}
                      disabled={mutating}
                      onChange={(event) => update(index, { proxyUrl: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t('providersPage.form.prefix')}</span>
                    <input
                      className={styles.input}
                      value={entry.prefix}
                      disabled={mutating}
                      onChange={(event) => update(index, { prefix: event.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t('providersPage.form.priority')}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={entry.priority ?? ''}
                      disabled={mutating}
                      onChange={(event) =>
                        update(index, {
                          priority:
                            event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className={styles.multiProtocolCardFooter}>
                  <label className={styles.checkboxRow}>
                    <input
                      className={styles.checkboxBox}
                      type="checkbox"
                      checked={entry.disabled}
                      disabled={mutating}
                      onChange={(event) => update(index, { disabled: event.target.checked })}
                    />
                    <span className={styles.checkboxText}>
                      {t('providersPage.form.disabled')}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {entries.length < definition.protocols.length ? (
          <div className={styles.multiProtocolActions}>
            <button
              className={styles.addBtn}
              type="button"
              disabled={mutating}
              onClick={() => {
                const used = new Set(entries.map((entry) => entry.protocol));
                const protocol = definition.protocols.find((candidate) => !used.has(candidate));
                if (protocol) {
                  setEntries((current) => [...current, emptyEntry(brand, protocol)]);
                }
              }}
            >
              {t('providersPage.multiProtocol.addProtocol')}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
