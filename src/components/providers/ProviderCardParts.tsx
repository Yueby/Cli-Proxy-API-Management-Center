/**
 * Shared presentational components for provider cards.
 * Uses unified ItemCard styles for consistent appearance.
 */

import { useTranslation } from 'react-i18next';
import { ItemCard } from '@/components/ui/ItemCard';

const styles = ItemCard.styles;

// ─── FieldRow ───────────────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string | number | boolean | undefined | null;
}

export function FieldRow({ label, value }: FieldRowProps) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}:</span>
      <span className={styles.fieldValue}>{String(value)}</span>
    </div>
  );
}

// ─── HeaderBadgeList ────────────────────────────────────

interface HeaderBadgeListProps {
  headers: Record<string, string> | undefined | null;
}

export function HeaderBadgeList({ headers }: HeaderBadgeListProps) {
  if (!headers) return null;
  const entries = Object.entries(headers);
  if (entries.length === 0) return null;
  return (
    <div className={styles.headerBadgeList}>
      {entries.map(([key, value]) => (
        <span key={key} className={styles.headerBadge}>
          <strong>{key}:</strong> {value}
        </span>
      ))}
    </div>
  );
}

// ─── ModelTagList ───────────────────────────────────────

interface ModelItem {
  name: string;
  alias?: string;
}

interface ModelTagListProps {
  models: ModelItem[] | undefined | null;
  countLabel: string;
}

export function ModelTagList({ models, countLabel }: ModelTagListProps) {
  if (!models || models.length === 0) return null;
  return (
    <div className={styles.modelTagList}>
      <span className={styles.modelCountLabel}>
        {countLabel}: {models.length}
      </span>
      {models.map((model) => (
        <span key={`${model.name}-${model.alias || ''}`} className={styles.modelTag}>
          <span className={styles.modelName}>{model.name}</span>
          {model.alias && model.alias !== model.name && (
            <span className={styles.modelAlias}>{model.alias}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── ExcludedModelsList ─────────────────────────────────

interface ExcludedModelsListProps {
  models: string[] | undefined | null;
}

export function ExcludedModelsList({ models }: ExcludedModelsListProps) {
  const { t } = useTranslation();
  if (!models || models.length === 0) return null;
  return (
    <div className={styles.excludedModelsSection}>
      <div className={styles.excludedModelsLabel}>
        {t('ai_providers.excluded_models_count', { count: models.length })}
      </div>
      <div className={styles.modelTagList}>
        {models.map((model) => (
          <span key={model} className={`${styles.modelTag} ${styles.excludedModelTag}`}>
            <span className={styles.modelName}>{model}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── StatsPills ─────────────────────────────────────────

interface StatsPillsProps {
  success: number;
  failure: number;
}

export function StatsPills({ success, failure }: StatsPillsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.stats}>
      <div className={`${styles.statPill} ${styles.statSuccess}`}>
        <span className={styles.statLabel}>{t('stats.success')}</span>
        <span className={styles.statValue}>{success}</span>
      </div>
      <div className={`${styles.statPill} ${styles.statFailure}`}>
        <span className={styles.statLabel}>{t('stats.failure')}</span>
        <span className={styles.statValue}>{failure}</span>
      </div>
    </div>
  );
}
