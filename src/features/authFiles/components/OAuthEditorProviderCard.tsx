import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { Card } from '@/components/ui/Card';
import { IconCheck, IconNetwork } from '@/components/ui/icons';
import { useThemeStore } from '@/stores';
import { getAuthFileIcon, getTypeLabel, normalizeProviderKey } from '../constants';
import styles from './OAuthEditor.module.scss';

interface OAuthEditorProviderCardProps {
  provider: string;
  options: string[];
  onChange: (provider: string) => void;
  disabled: boolean;
  translationPrefix: 'oauth_excluded' | 'oauth_model_alias';
}

export function OAuthEditorProviderCard({
  provider,
  options,
  onChange,
  disabled,
  translationPrefix,
}: OAuthEditorProviderCardProps) {
  const { t } = useTranslation();
  const id = useId();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return (
    <Card className={styles.settingsCard}>
      <div className={styles.editorHeader}>
        <div className={styles.sectionHeading}>
          <div className={styles.headingCopy}>
            <h2 className={styles.sectionTitle}>{t(`${translationPrefix}.provider_label`)}</h2>
            <p className={styles.description}>{t(`${translationPrefix}.provider_hint`)}</p>
          </div>
        </div>
      </div>
      <div className={styles.editorBody}>
        <div className={styles.providerControlRow}>
          <AutocompleteInput
            id={id}
            placeholder={t(`${translationPrefix}.provider_placeholder`)}
            value={provider}
            onChange={onChange}
            options={options}
            disabled={disabled}
            wrapperClassName={styles.providerControl}
          />
        </div>
        {options.length > 0 && (
          <div
            className={styles.providerOptions}
            role="group"
            aria-label={t(`${translationPrefix}.provider_label`)}
          >
            {options.map((option) => {
              const active = normalizeProviderKey(provider) === normalizeProviderKey(option);
              const icon = getAuthFileIcon(option, resolvedTheme);
              return (
                <button
                  key={option}
                  type="button"
                  className={`${styles.providerOption} ${active ? styles.providerOptionActive : ''}`}
                  aria-pressed={active}
                  onClick={() => onChange(option)}
                  disabled={disabled}
                >
                  {icon ? <img src={icon} alt="" /> : <IconNetwork size={16} aria-hidden="true" />}
                  <span>{getTypeLabel(t, option)}</span>
                  <IconCheck size={14} className={styles.providerCheck} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
