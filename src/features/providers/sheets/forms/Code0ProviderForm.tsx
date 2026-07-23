import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CODE0_BASE_URL, CODE0_PROTOCOL_LABELS, getCode0ProtocolUrls } from '../../code0';
import type {
  ProviderEntryFormInput,
  ProviderResource,
  SponsorKeyEntryInput,
  SponsorProtocol,
  SponsorProviderRaw,
} from '../../types';
import styles from './sharedForm.module.scss';

interface Props {
  resource: ProviderResource | null;
  mode: 'create' | 'edit';
  mutating: boolean;
  formId: string;
  onSubmit: (input: ProviderEntryFormInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const protocols: SponsorProtocol[] = ['openai', 'claude', 'gemini', 'codex'];

const emptyEntry = (protocol: SponsorProtocol): SponsorKeyEntryInput => ({
  protocol,
  apiKey: '',
  existingApiKey: '',
  baseUrl: CODE0_BASE_URL,
  proxyUrl: '',
  prefix: '',
  disabled: false,
  disableCooling: false,
  models: [],
});

const initialEntries = (resource: ProviderResource | null): SponsorKeyEntryInput[] => {
  if (!resource) return protocols.map(emptyEntry);
  const raw = resource.raw as SponsorProviderRaw;
  const openai = raw.openai[0]?.config;
  const firstOpenAIKey = openai?.apiKeyEntries?.[0];
  const records: Partial<Record<SponsorProtocol, SponsorKeyEntryInput>> = {
    openai: openai
      ? {
          ...emptyEntry('openai'),
          existingApiKey: firstOpenAIKey?.apiKey ?? '',
          proxyUrl: firstOpenAIKey?.proxyUrl ?? '',
          prefix: openai.prefix ?? '',
          disabled: openai.disabled === true,
        }
      : undefined,
    claude: raw.claude[0]
      ? {
          ...emptyEntry('claude'),
          existingApiKey: raw.claude[0].config.apiKey,
          proxyUrl: raw.claude[0].config.proxyUrl ?? '',
          prefix: raw.claude[0].config.prefix ?? '',
        }
      : undefined,
    gemini: raw.gemini[0]
      ? {
          ...emptyEntry('gemini'),
          existingApiKey: raw.gemini[0].config.apiKey,
          proxyUrl: raw.gemini[0].config.proxyUrl ?? '',
          prefix: raw.gemini[0].config.prefix ?? '',
        }
      : undefined,
    codex: raw.codex[0]
      ? {
          ...emptyEntry('codex'),
          existingApiKey: raw.codex[0].config.apiKey,
          proxyUrl: raw.codex[0].config.proxyUrl ?? '',
          prefix: raw.codex[0].config.prefix ?? '',
        }
      : undefined,
  };
  return protocols.map((protocol) => records[protocol] ?? emptyEntry(protocol));
};

const toForm = (entries: SponsorKeyEntryInput[]): ProviderEntryFormInput => ({
  apiKey: '',
  name: '',
  baseUrl: '',
  proxyUrl: '',
  prefix: '',
  disabled: false,
  models: [],
  headers: [],
  excludedModelsText: '',
  sponsorKeyEntries: entries,
});

export function Code0ProviderForm({ resource, mode, mutating, formId, onSubmit, onDirtyChange }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(() => initialEntries(resource));
  const [error, setError] = useState<string | null>(null);
  const initialSignature = useMemo(() => JSON.stringify(initialEntries(resource)), [resource]);
  const dirty = JSON.stringify(entries) !== initialSignature;
  const urls = getCode0ProtocolUrls(CODE0_BASE_URL);

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const update = (index: number, patch: Partial<SponsorKeyEntryInput>) =>
    setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const configured = entries.filter((entry) => entry.apiKey.trim() || entry.existingApiKey?.trim());
    if (!configured.length && mode === 'create') {
      setError(t('providersPage.form.validation.apiKeyRequired'));
      return;
    }
    setError(null);
    await onSubmit(toForm(configured));
  };

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.section}>
        {entries.map((entry, index) => {
          const labelKey = CODE0_PROTOCOL_LABELS[index];
          const endpoint = entry.protocol === 'openai' ? urls.openai : entry.protocol === 'claude' ? urls.anthropic : entry.protocol === 'codex' ? urls.codex : urls.gemini;
          return (
            <div key={entry.protocol} className={styles.entryCard}>
              <div className={styles.sectionTitle}>{t(`providersPage.sponsor.protocols.${labelKey}`, { defaultValue: labelKey })}</div>
              <div className={styles.labelHint}>{endpoint}</div>
              <div className={styles.field}>
                <label className={styles.label}>{t('providersPage.form.apiKey')}</label>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="new-password"
                  value={entry.apiKey}
                  placeholder={mode === 'edit' && entry.existingApiKey ? t('providersPage.form.apiKeyEditPlaceholder') : t('providersPage.form.apiKeyCreatePlaceholder')}
                  onChange={(event) => update(index, { apiKey: event.target.value })}
                  disabled={mutating}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>{t('providersPage.form.proxyUrl')}</label>
                  <input className={styles.input} value={entry.proxyUrl} onChange={(event) => update(index, { proxyUrl: event.target.value })} disabled={mutating} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t('providersPage.form.prefix')}</label>
                  <input className={styles.input} value={entry.prefix} onChange={(event) => update(index, { prefix: event.target.value })} disabled={mutating} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error ? <div className={styles.errorBox}>{error}</div> : null}
    </form>
  );
}