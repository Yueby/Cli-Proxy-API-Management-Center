/**
 * Generic quota section component.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { triggerHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import { getStatusFromError } from '@/utils/quota';
import {
  MIN_CARD_PAGE_SIZE,
  MAX_CARD_PAGE_SIZE,
  clampCardPageSize,
} from '@/features/authFiles/constants';
import { QuotaCard } from './QuotaCard';
import type { QuotaStatusState } from './QuotaCard';
import { useQuotaLoader } from './useQuotaLoader';
import type { QuotaConfig } from './quotaConfigs';
import { IconRefreshCw, IconSearch, IconX } from '@/components/ui/icons';
import styles from '@/pages/QuotaPage.module.scss';

type QuotaUpdater<T> = T | ((prev: T) => T);

type QuotaSetter<T> = (updater: QuotaUpdater<T>) => void;

type ViewMode = 'paged' | 'all';

const MAX_SHOW_ALL_THRESHOLD = 30;

interface QuotaPaginationState<T> {
  pageSize: number;
  totalPages: number;
  currentPage: number;
  pageItems: T[];
  setPageSize: (size: number) => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToPage: (page: number) => void;
  loading: boolean;
  loadingScope: 'page' | 'all' | null;
  setLoading: (loading: boolean, scope?: 'page' | 'all' | null) => void;
}

const useQuotaPagination = <T,>(items: T[], defaultPageSize = 6): QuotaPaginationState<T> => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [loading, setLoadingState] = useState(false);
  const [loadingScope, setLoadingScope] = useState<'page' | 'all' | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize]
  );

  const currentPage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const goToPrev = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const goToPage = useCallback(
    (target: number) => {
      setPage(Math.max(1, Math.min(totalPages, target)));
    },
    [totalPages]
  );

  const setLoading = useCallback((isLoading: boolean, scope?: 'page' | 'all' | null) => {
    setLoadingState(isLoading);
    setLoadingScope(isLoading ? (scope ?? null) : null);
  }, []);

  return {
    pageSize,
    totalPages,
    currentPage,
    pageItems,
    setPageSize,
    goToPrev,
    goToNext,
    goToPage,
    loading,
    loadingScope,
    setLoading,
  };
};

interface QuotaSectionProps<TState extends QuotaStatusState, TData> {
  config: QuotaConfig<TState, TData>;
  files: AuthFileItem[];
  loading: boolean;
  disabled: boolean;
}

export function QuotaSection<TState extends QuotaStatusState, TData>({
  config,
  files,
  loading,
  disabled,
}: QuotaSectionProps<TState, TData>) {
  const { t } = useTranslation();
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const setQuota = useQuotaStore((state) => state[config.storeSetter]) as QuotaSetter<
    Record<string, TState>
  >;

  const [viewMode, setViewMode] = useState<ViewMode>('paged');
  const [showTooManyWarning, setShowTooManyWarning] = useState(false);
  const [search, setSearch] = useState('');
  const [userPageSize, setUserPageSize] = useState<number>(18);
  const [pageSizeInput, setPageSizeInput] = useState<string>('18');
  const [resettingQuotaName, setResettingQuotaName] = useState<string | null>(null);

  const typeFilteredFiles = useMemo(
    () => files.filter((file) => config.filterFn(file)),
    [files, config]
  );

  const filteredFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return typeFilteredFiles;
    return typeFilteredFiles.filter((file) =>
      [file.name, file.type, file.provider].some(
        (value) => value && value.toLowerCase().includes(term)
      )
    );
  }, [typeFilteredFiles, search]);

  const showAllAllowed = filteredFiles.length <= MAX_SHOW_ALL_THRESHOLD;
  const effectiveViewMode: ViewMode = viewMode === 'all' && !showAllAllowed ? 'paged' : viewMode;

  const {
    pageSize,
    totalPages,
    currentPage,
    pageItems,
    setPageSize,
    goToPrev,
    goToNext,
    goToPage,
    loading: sectionLoading,
    setLoading,
  } = useQuotaPagination(filteredFiles);

  useEffect(() => {
    if (showAllAllowed) return;
    if (viewMode !== 'all') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setViewMode('paged');
      setShowTooManyWarning(true);
    });

    return () => {
      cancelled = true;
    };
  }, [showAllAllowed, viewMode]);

  // Update page size based on view mode
  useEffect(() => {
    if (effectiveViewMode === 'all') {
      setPageSize(Math.max(1, filteredFiles.length));
    } else {
      setPageSize(userPageSize);
    }
  }, [effectiveViewMode, userPageSize, filteredFiles.length, setPageSize]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPageSizeInput(String(userPageSize));
    }, 0);
    return () => window.clearTimeout(id);
  }, [userPageSize]);

  const commitPageSizeInput = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        setPageSizeInput(String(userPageSize));
        return;
      }

      const value = Number(trimmed);
      if (!Number.isFinite(value)) {
        setPageSizeInput(String(userPageSize));
        return;
      }

      const next = clampCardPageSize(value);
      setUserPageSize(next);
      setPageSizeInput(String(next));
    },
    [userPageSize]
  );

  const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.currentTarget.value;
    setPageSizeInput(rawValue);

    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;

    const rounded = Math.round(parsed);
    if (rounded < MIN_CARD_PAGE_SIZE || rounded > MAX_CARD_PAGE_SIZE) return;

    setUserPageSize(rounded);
  }, []);

  const { quota, loadQuota } = useQuotaLoader(config);

  const pendingQuotaRefreshRef = useRef(false);
  const prevFilesLoadingRef = useRef(loading);
  const [isRefreshQueued, setIsRefreshQueued] = useState(false);

  const isSectionQuotaLoading = sectionLoading;
  const showRefreshSpinner = isRefreshQueued || isSectionQuotaLoading;
  const disableRefreshButton = disabled || loading || showRefreshSpinner;

  const handleRefresh = useCallback(() => {
    if (disableRefreshButton) return;

    pendingQuotaRefreshRef.current = true;
    setIsRefreshQueued(true);
    void triggerHeaderRefresh();
  }, [disableRefreshButton]);

  useEffect(() => {
    const wasLoading = prevFilesLoadingRef.current;
    prevFilesLoadingRef.current = loading;

    if (!pendingQuotaRefreshRef.current) return;
    if (loading) return;
    if (!wasLoading) return;

    pendingQuotaRefreshRef.current = false;
    const scope = effectiveViewMode === 'all' ? 'all' : 'page';
    const targets = effectiveViewMode === 'all' ? filteredFiles : pageItems;
    if (targets.length === 0) {
      const id = window.setTimeout(() => setIsRefreshQueued(false), 0);
      return () => window.clearTimeout(id);
    }
    loadQuota(targets, scope, setLoading);
    const id = window.setTimeout(() => setIsRefreshQueued(false), 0);
    return () => window.clearTimeout(id);
  }, [loading, effectiveViewMode, filteredFiles, pageItems, loadQuota, setLoading]);

  const refreshQuotaForFile = useCallback(
    async (file: AuthFileItem) => {
      if (disabled || file.disabled) return;
      if (quota[file.name]?.status === 'loading') return;

      setQuota((prev) => ({
        ...prev,
        [file.name]: config.buildLoadingState(),
      }));

      try {
        const data = await config.fetchQuota(file, t);
        setQuota((prev) => ({
          ...prev,
          [file.name]: config.buildSuccessState(data),
        }));
        showNotification(t('auth_files.quota_refresh_success', { name: file.name }), 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknown_error');
        const status = getStatusFromError(err);
        setQuota((prev) => ({
          ...prev,
          [file.name]: config.buildErrorState(message, status),
        }));
        showNotification(
          t('auth_files.quota_refresh_failed', { name: file.name, message }),
          'error'
        );
      }
    },
    [config, disabled, quota, setQuota, showNotification, t]
  );

  const resetQuotaForFile = useCallback(
    (file: AuthFileItem) => {
      const resetQuota = config.resetQuota;
      if (!resetQuota) return;
      if (disabled || file.disabled) return;
      if (quota[file.name]?.status === 'loading') return;
      if (resettingQuotaName === file.name) return;

      showConfirmation({
        title: t('codex_quota.reset_confirm_title'),
        message: t('codex_quota.reset_confirm_message', { name: file.name }),
        confirmText: t('codex_quota.reset_confirm_button'),
        variant: 'primary',
        onConfirm: async () => {
          setResettingQuotaName(file.name);
          try {
            const data = await resetQuota(file, t);
            setQuota((prev) => ({
              ...prev,
              [file.name]: config.buildSuccessState(data),
            }));
            showNotification(t('codex_quota.reset_success', { name: file.name }), 'success');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('common.unknown_error');
            showNotification(
              t('codex_quota.reset_failed', { name: file.name, message }),
              'error'
            );
          } finally {
            setResettingQuotaName((current) => (current === file.name ? null : current));
          }
        },
      });
    },
    [
      config,
      disabled,
      quota,
      resettingQuotaName,
      setQuota,
      showConfirmation,
      showNotification,
      t,
    ]
  );

  const titleNode = (
    <div className={styles.titleWrapper}>
      <span>{t(`${config.i18nPrefix}.title`)}</span>
      {typeFilteredFiles.length > 0 && (
        <span className={styles.countBadge}>
          {filteredFiles.length !== typeFilteredFiles.length
            ? `${filteredFiles.length}/${typeFilteredFiles.length}`
            : typeFilteredFiles.length}
        </span>
      )}
    </div>
  );

  return (
    <Card
      title={titleNode}
      extra={
        <div className={styles.headerActions}>
          {typeFilteredFiles.length > 0 && (
            <div className={styles.searchWrapper}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('quota_management.search_placeholder')}
                className={styles.searchInput}
                rightElement={
                  search ? (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={() => setSearch('')}
                      title="Clear"
                      aria-label="Clear"
                    >
                      <IconX size={14} />
                    </button>
                  ) : (
                    <IconSearch size={14} className={styles.searchIcon} />
                  )
                }
              />
            </div>
          )}
          {effectiveViewMode === 'paged' && typeFilteredFiles.length > 0 && (
            <input
              className={styles.pageSizeSelect}
              type="number"
              min={MIN_CARD_PAGE_SIZE}
              max={MAX_CARD_PAGE_SIZE}
              step={1}
              value={pageSizeInput}
              onChange={handlePageSizeChange}
              onBlur={(e) => commitPageSizeInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              title={t('auth_files.page_size_label')}
              aria-label={t('auth_files.page_size_label')}
            />
          )}
          <SegmentedControl
            options={[
              { value: 'paged', label: t('auth_files.view_mode_paged') },
              { value: 'all', label: t('auth_files.view_mode_all') },
            ]}
            value={effectiveViewMode}
            onChange={(mode) => {
              if (mode === 'all' && filteredFiles.length > MAX_SHOW_ALL_THRESHOLD) {
                setShowTooManyWarning(true);
              } else {
                setViewMode(mode as ViewMode);
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className={styles.refreshAllButton}
            onClick={handleRefresh}
            disabled={disableRefreshButton}
            loading={showRefreshSpinner}
            title={t('quota_management.refresh_all_credentials')}
            aria-label={t('quota_management.refresh_all_credentials')}
          >
            {!showRefreshSpinner && <IconRefreshCw size={16} />}
            {t('quota_management.refresh_all_credentials')}
          </Button>
        </div>
      }
    >
      {typeFilteredFiles.length === 0 ? (
        <EmptyState
          title={t(`${config.i18nPrefix}.empty_title`)}
          description={t(`${config.i18nPrefix}.empty_desc`)}
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          title={t('quota_management.search_no_results')}
          description={t('quota_management.search_no_results_desc', { query: search.trim() })}
        />
      ) : (
        <>
          <div className={config.gridClassName}>
            {pageItems.map((item) => {
              const itemQuota = quota[item.name];
              const isResettingQuota = resettingQuotaName === item.name;
              const canUseQuotaAction = !disabled && !item.disabled && itemQuota?.status !== 'loading';
              const showResetQuotaAction =
                itemQuota !== undefined && Boolean(config.canResetQuota?.(itemQuota));
              const resetQuotaAction = config.resetQuota && showResetQuotaAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={styles.quotaResetCreditButton}
                  onClick={() => resetQuotaForFile(item)}
                  disabled={!canUseQuotaAction || isResettingQuota}
                  loading={isResettingQuota}
                  title={t('codex_quota.reset_button')}
                  aria-label={t('codex_quota.reset_button')}
                >
                  {!isResettingQuota && <IconRefreshCw size={14} />}
                  {t('codex_quota.reset_button')}
                </Button>
              ) : undefined;

              return (
                <QuotaCard
                  key={item.name}
                  item={item}
                  quota={itemQuota}
                  resolvedTheme={resolvedTheme}
                  i18nPrefix={config.i18nPrefix}
                  cardIdleMessageKey={config.cardIdleMessageKey}
                  cardClassName={config.cardClassName}
                  defaultType={config.type}
                  canRefresh={canUseQuotaAction && !isResettingQuota}
                  onRefresh={() => void refreshQuotaForFile(item)}
                  resetQuotaAction={resetQuotaAction}
                  renderQuotaItems={config.renderQuotaItems}
                />
              );
            })}
          </div>
          {filteredFiles.length > pageSize && effectiveViewMode === 'paged' && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredFiles.length}
              onPrev={goToPrev}
              onNext={goToNext}
              onPageChange={goToPage}
            />
          )}
        </>
      )}
      {showTooManyWarning && (
        <div className={styles.warningOverlay} onClick={() => setShowTooManyWarning(false)}>
          <div className={styles.warningModal} onClick={(e) => e.stopPropagation()}>
            <p>{t('auth_files.too_many_files_warning')}</p>
            <Button variant="primary" size="sm" onClick={() => setShowTooManyWarning(false)}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
