import {
  useCallback,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { animate } from 'motion/mini';
import type { AuthFileItem } from '@/types';
import type { AnimationPlaybackControlsWithThen } from 'motion-dom';
import { useInterval } from '@/hooks/useInterval';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useHorizontalWheelScroll } from '@/hooks/useHorizontalWheelScroll';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  IconDownload,
  IconFilterAll,
  IconRefreshCw,
  IconZap,
  IconSearch,
  IconTrash2,
  IconUpload,
  IconPlus,
  IconSlidersHorizontal,
} from '@/components/ui/icons';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { copyToClipboard } from '@/utils/clipboard';
import {
  MAX_CARD_PAGE_SIZE,
  MIN_CARD_PAGE_SIZE,
  QUOTA_PROVIDER_TYPES,
  clampCardPageSize,
  getAuthFileIcon,
  getTypeColor,
  getTypeLabel,
  hasAuthFileStatusMessage,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  parsePriorityValue,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import { AuthFileCard } from '@/features/authFiles/components/AuthFileCard';
import { ItemCard } from '@/components/ui/ItemCard';
import { AuthFileModelsModal } from '@/features/authFiles/components/AuthFileModelsModal';
import { AuthFilesPrefixProxyEditorModal } from '@/features/authFiles/components/AuthFilesPrefixProxyEditorModal';
import { AuthFilesOAuthDialog } from '@/features/authFiles/components/AuthFilesOAuthDialog';
import { OAuthSettingsModal } from '@/features/authFiles/components/OAuthSettingsModal';
import { useAuthFilesData } from '@/features/authFiles/hooks/useAuthFilesData';
import { useAuthFilesModels } from '@/features/authFiles/hooks/useAuthFilesModels';
import { useAuthFilesOauth } from '@/features/authFiles/hooks/useAuthFilesOauth';
import { useAuthFilesPrefixProxyEditor } from '@/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import { useAuthFilesStatusBarCache } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import {
  isAuthFilesSortMode,
  readAuthFilesUiState,
  readPersistedAuthFilesCompactMode,
  writeAuthFilesUiState,
  writePersistedAuthFilesCompactMode,
  type AuthFilesSortMode,
} from '@/features/authFiles/uiState';
import { useAuthStore, useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import { getStatusFromError } from '@/utils/quota';
import { getAuthFileQuotaConfig, resolveAuthFileQuotaType } from '@/features/authFiles/quotaConfig';
import styles from './AuthFilesPage.module.scss';

const easePower3Out = (progress: number) => 1 - (1 - progress) ** 4;
const easePower2In = (progress: number) => progress ** 3;
const BATCH_BAR_BASE_TRANSFORM = 'translateX(-50%)';
const BATCH_BAR_HIDDEN_TRANSFORM = 'translateX(-50%) translateY(56px)';
const DEFAULT_REGULAR_PAGE_SIZE = 9;
const DEFAULT_COMPACT_PAGE_SIZE = 12;

const escapeWildcardSearchSegment = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildWildcardSearch = (value: string): RegExp | null => {
  if (!value.includes('*')) return null;
  const pattern = value.split('*').map(escapeWildcardSearchSegment).join('.*');
  return new RegExp(pattern, 'i');
};

export function AuthFilesPage() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const quotaStore = useQuotaStore();
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<string>('codex');
  const [problemOnly, setProblemOnly] = useState(false);
  const [disabledOnly, setDisabledOnly] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSizeByMode, setPageSizeByMode] = useState({
    regular: DEFAULT_REGULAR_PAGE_SIZE,
    compact: DEFAULT_COMPACT_PAGE_SIZE,
  });
  const [pageSizeInput, setPageSizeInput] = useState('9');
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('list');
  const [sortMode, setSortMode] = useState<AuthFilesSortMode>('default');
  const [batchActionBarVisible, setBatchActionBarVisible] = useState(false);
  const [uiStateHydrated, setUiStateHydrated] = useState(false);
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  const [oauthSettingsOpen, setOauthSettingsOpen] = useState(false);
  const [quotaRefreshing, setQuotaRefreshing] = useState(false);
  const floatingBatchActionsRef = useRef<HTMLDivElement>(null);
  const filterTabsRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(filterTabsRef);
  const batchActionAnimationRef = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const previousSelectionCountRef = useRef(0);
  const selectionCountRef = useRef(0);

  const {
    files,
    selectedFiles,
    selectionCount,
    loading,
    error,
    uploading,
    deleting,
    statusUpdating,
    batchStatusUpdating,
    fileInputRef,
    loadFiles,
    handleUploadClick,
    handleFileChange,
    handleDelete,
    handleDownload,
    handleStatusToggle,
    toggleSelect,
    selectAllVisible,
    invertVisibleSelection,
    deselectAll,
    batchDownload,
    batchSetStatus,
    batchDelete,
  } = useAuthFilesData();

  const statusBarCache = useAuthFilesStatusBarCache(files);

  const {
    excluded,
    excludedError,
    modelAlias,
    modelAliasError,
    allProviderModels,
    loadExcluded,
    loadModelAlias,
    deleteExcluded,
    deleteModelAlias,
    handleMappingUpdate,
    handleDeleteLink,
    handleToggleFork,
    handleRenameAlias,
    handleDeleteAlias,
  } = useAuthFilesOauth({ viewMode, files });

  const {
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    closeModelsModal,
  } = useAuthFilesModels();

  const {
    prefixProxyEditor,
    prefixProxyUpdatedText,
    prefixProxyDirty,
    openPrefixProxyEditor,
    closePrefixProxyEditor,
    handlePrefixProxyChange,
    handlePrefixProxySave,
  } = useAuthFilesPrefixProxyEditor({
    disableControls: connectionStatus !== 'connected',
    loadFiles,
  });

  const disableControls = connectionStatus !== 'connected';
  const normalizedFilter = normalizeProviderKey(String(filter));
  const quotaFilterType: QuotaProviderType | null = QUOTA_PROVIDER_TYPES.has(
    normalizedFilter as QuotaProviderType
  )
    ? (normalizedFilter as QuotaProviderType)
    : null;
  const pageSize = compactMode ? pageSizeByMode.compact : pageSizeByMode.regular;

  useEffect(() => {
    const persistedCompactMode = readPersistedAuthFilesCompactMode();
    if (typeof persistedCompactMode === 'boolean') {
      setCompactMode(persistedCompactMode);
    }

    const persisted = readAuthFilesUiState();
    if (persisted) {
      if (
        typeof persisted.filter === 'string' &&
        persisted.filter.trim() &&
        persisted.filter !== 'all'
      ) {
        setFilter(normalizeProviderKey(persisted.filter));
      } else {
        setFilter('codex');
      }
      if (typeof persisted.problemOnly === 'boolean') {
        setProblemOnly(persisted.problemOnly);
      }
      if (typeof persisted.disabledOnly === 'boolean') {
        setDisabledOnly(persisted.disabledOnly);
      }
      if (typeof persistedCompactMode !== 'boolean' && typeof persisted.compactMode === 'boolean') {
        setCompactMode(persisted.compactMode);
      }
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
      }
      if (typeof persisted.page === 'number' && Number.isFinite(persisted.page)) {
        setPage(Math.max(1, Math.round(persisted.page)));
      }
      const legacyPageSize =
        typeof persisted.pageSize === 'number' && Number.isFinite(persisted.pageSize)
          ? clampCardPageSize(persisted.pageSize)
          : null;
      const regularPageSize =
        typeof persisted.regularPageSize === 'number' && Number.isFinite(persisted.regularPageSize)
          ? clampCardPageSize(persisted.regularPageSize)
          : (legacyPageSize ?? DEFAULT_REGULAR_PAGE_SIZE);
      const compactPageSize =
        typeof persisted.compactPageSize === 'number' && Number.isFinite(persisted.compactPageSize)
          ? clampCardPageSize(persisted.compactPageSize)
          : (legacyPageSize ?? DEFAULT_COMPACT_PAGE_SIZE);
      setPageSizeByMode({
        regular: regularPageSize,
        compact: compactPageSize,
      });
      if (isAuthFilesSortMode(persisted.sortMode)) {
        setSortMode(persisted.sortMode);
      }
    }

    setUiStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;

    writeAuthFilesUiState({
      filter,
      problemOnly,
      disabledOnly,
      compactMode,
      search,
      page,
      pageSize,
      regularPageSize: pageSizeByMode.regular,
      compactPageSize: pageSizeByMode.compact,
      sortMode,
    });
    writePersistedAuthFilesCompactMode(compactMode);
  }, [
    compactMode,
    disabledOnly,
    filter,
    page,
    pageSize,
    pageSizeByMode,
    problemOnly,
    search,
    sortMode,
    uiStateHydrated,
  ]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const setCurrentModePageSize = useCallback(
    (next: number) => {
      setPageSizeByMode((current) =>
        compactMode ? { ...current, compact: next } : { ...current, regular: next }
      );
    },
    [compactMode]
  );

  const commitPageSizeInput = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setPageSizeInput(String(pageSize));
      return;
    }

    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      setPageSizeInput(String(pageSize));
      return;
    }

    const next = clampCardPageSize(value);
    setCurrentModePageSize(next);
    setPageSizeInput(String(next));
    setPage(1);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.currentTarget.value;
    setPageSizeInput(rawValue);

    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;

    const rounded = Math.round(parsed);
    if (rounded < MIN_CARD_PAGE_SIZE || rounded > MAX_CARD_PAGE_SIZE) return;

    setCurrentModePageSize(rounded);
    setPage(1);
  };

  const handleSortModeChange = useCallback(
    (value: string) => {
      if (!isAuthFilesSortMode(value) || value === sortMode) return;
      setSortMode(value);
      setPage(1);
      void loadFiles().catch(() => {});
    },
    [loadFiles, sortMode]
  );

  const refreshQuotaForFile = useCallback(
    async (file: AuthFileItem, quotaType: QuotaProviderType, notify = true) => {
      const config = getAuthFileQuotaConfig(quotaType);
      const setQuota = quotaStore[config.storeSetter] as (
        updater: Record<string, never> | ((prev: Record<string, never>) => Record<string, never>)
      ) => void;

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
        if (notify) {
          showNotification(t('auth_files.quota_refresh_success', { name: file.name }), 'success');
        }
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknown_error');
        const status = getStatusFromError(err);
        setQuota((prev) => ({
          ...prev,
          [file.name]: config.buildErrorState(message, status),
        }));
        if (notify) {
          showNotification(
            t('auth_files.quota_refresh_failed', { name: file.name, message }),
            'error'
          );
        }
        return false;
      }
    },
    [quotaStore, showNotification, t]
  );

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadFiles(), loadExcluded(), loadModelAlias()]);
  }, [loadFiles, loadExcluded, loadModelAlias]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    if (!isCurrentLayer) return;
    loadFiles();
    loadExcluded();
    loadModelAlias();
  }, [isCurrentLayer, loadFiles, loadExcluded, loadModelAlias]);

  useInterval(
    () => {
      void loadFiles().catch(() => {});
    },
    isCurrentLayer ? 240_000 : null
  );

  const existingTypes = useMemo(() => {
    const types = new Set<string>(['all']);
    files.forEach((file) => {
      const type = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
      if (type) types.add(type);
    });
    const tabOrder = [
      'all',
      'codex',
      'openaiCompatibility',
      'openai',
      'gemini-cli',
      'gemini',
      'claude',
      'antigravity',
      'kimi',
      'xai',
      'qwen',
      'vertex',
      'iflow',
    ];
    const orderMap = new Map(tabOrder.map((t, idx) => [t, idx]));
    return Array.from(types).sort((a, b) => {
      const oa = orderMap.has(a) ? orderMap.get(a)! : 999;
      const ob = orderMap.has(b) ? orderMap.get(b)! : 999;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
  }, [files]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const activeEl = filterTabsRef.current?.querySelector(`[data-tab-id="${normalizedFilter}"]`);
      activeEl?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedFilter, existingTypes]);

  const filesMatchingStatusFilters = useMemo(
    () =>
      files.filter((file) => {
        if (problemOnly && !hasAuthFileStatusMessage(file)) return false;
        if (disabledOnly && file.disabled !== true) return false;
        return true;
      }),
    [disabledOnly, files, problemOnly]
  );

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: t('auth_files.sort_default') },
      { value: 'az', label: t('auth_files.sort_az') },
      { value: 'priority', label: t('auth_files.sort_priority') },
    ],
    [t]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filesMatchingStatusFilters.forEach((file) => {
      const type = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
      if (!type) return;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [filesMatchingStatusFilters]);

  const activeFilterTabId = existingTypes.includes(normalizedFilter)
    ? normalizedFilter
    : (existingTypes[0] ?? 'codex');

  const normalizedSearch = search.trim();
  const wildcardSearch = useMemo(() => buildWildcardSearch(normalizedSearch), [normalizedSearch]);

  const filtered = useMemo(() => {
    const normalizedTerm = normalizedSearch.toLowerCase();
    const effectiveFilter = existingTypes.includes(normalizedFilter)
      ? normalizedFilter
      : (existingTypes[0] ?? 'codex');

    return filesMatchingStatusFilters.filter((item) => {
      const type = normalizeProviderKey(String(item.type ?? item.provider ?? ''));
      const matchType = type === effectiveFilter;
      const matchSearch =
        !normalizedSearch ||
        [item.name, item.type, item.provider].some((value) => {
          const content = (value || '').toString();
          return wildcardSearch
            ? wildcardSearch.test(content)
            : content.toLowerCase().includes(normalizedTerm);
        });
      return matchType && matchSearch;
    });
  }, [
    filesMatchingStatusFilters,
    existingTypes,
    normalizedFilter,
    normalizedSearch,
    wildcardSearch,
  ]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortMode === 'default') {
      copy.sort((a, b) => {
        const providerA = normalizeProviderKey(String(a.provider ?? a.type ?? 'unknown'));
        const providerB = normalizeProviderKey(String(b.provider ?? b.type ?? 'unknown'));
        const providerCompare = providerA.localeCompare(providerB);
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name);
      });
    } else if (sortMode === 'az') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'priority') {
      copy.sort((a, b) => {
        const pa = parsePriorityValue(a.priority ?? a['priority']) ?? 0;
        const pb = parsePriorityValue(b.priority ?? b['priority']) ?? 0;
        return pb - pa; // 高优先级排前面
      });
    }
    return copy;
  }, [filtered, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);
  const selectablePageItems = useMemo(
    () => pageItems.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [pageItems]
  );
  const pageQuotaTargets = useMemo(
    () =>
      pageItems
        .map((file) => ({ file, quotaType: resolveAuthFileQuotaType(file) }))
        .filter(
          (entry): entry is { file: AuthFileItem; quotaType: QuotaProviderType } =>
            Boolean(entry.quotaType) && !entry.file.disabled && !isRuntimeOnlyAuthFile(entry.file)
        ),
    [pageItems]
  );
  const handleRefreshPageQuota = useCallback(async () => {
    if (quotaRefreshing || disableControls) return;

    if (pageQuotaTargets.length === 0) {
      showNotification(t('auth_files.quota_refresh_no_targets'), 'info');
      return;
    }

    setQuotaRefreshing(true);
    try {
      const results = await Promise.all(
        pageQuotaTargets.map((entry) => refreshQuotaForFile(entry.file, entry.quotaType, false))
      );
      const success = results.filter(Boolean).length;
      const failed = results.length - success;
      showNotification(
        failed > 0
          ? t('auth_files.quota_refresh_page_partial', { success, failed })
          : t('auth_files.quota_refresh_page_success', { count: success }),
        failed > 0 ? 'warning' : 'success'
      );
    } finally {
      setQuotaRefreshing(false);
    }
  }, [
    disableControls,
    pageQuotaTargets,
    quotaRefreshing,
    refreshQuotaForFile,
    showNotification,
    t,
  ]);
  const selectableFilteredItems = useMemo(
    () => sorted.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [sorted]
  );
  const selectedNames = useMemo(() => Array.from(selectedFiles), [selectedFiles]);
  const selectedHasStatusUpdating = useMemo(
    () => selectedNames.some((name) => statusUpdating[name] === true),
    [selectedNames, statusUpdating]
  );
  const batchStatusButtonsDisabled =
    disableControls ||
    selectedNames.length === 0 ||
    batchStatusUpdating ||
    selectedHasStatusUpdating;

  const copyTextWithNotification = useCallback(
    async (text: string) => {
      const copied = await copyToClipboard(text);
      showNotification(
        copied
          ? t('notification.link_copied', { defaultValue: 'Copied to clipboard' })
          : t('notification.copy_failed', { defaultValue: 'Copy failed' }),
        copied ? 'success' : 'error'
      );
    },
    [showNotification, t]
  );

  const openExcludedEditor = useCallback(
    (provider?: string) => {
      setOauthSettingsOpen(false);
      const providerValue = (provider || (filter !== 'all' ? String(filter) : '')).trim();
      const params = new URLSearchParams();
      if (providerValue) {
        params.set('provider', providerValue);
      }
      const nextSearch = params.toString();
      navigate(`/auth-files/oauth-excluded${nextSearch ? `?${nextSearch}` : ''}`, {
        state: { fromAuthFiles: true },
      });
    },
    [filter, navigate]
  );

  const openModelAliasEditor = useCallback(
    (provider?: string) => {
      setOauthSettingsOpen(false);
      const providerValue = (provider || (filter !== 'all' ? String(filter) : '')).trim();
      const params = new URLSearchParams();
      if (providerValue) {
        params.set('provider', providerValue);
      }
      const nextSearch = params.toString();
      navigate(`/auth-files/oauth-model-alias${nextSearch ? `?${nextSearch}` : ''}`, {
        state: { fromAuthFiles: true },
      });
    },
    [filter, navigate]
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const actionsEl = floatingBatchActionsRef.current;
    if (!actionsEl) {
      document.documentElement.style.removeProperty('--auth-files-action-bar-height');
      return;
    }

    const updatePadding = () => {
      const height = actionsEl.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--auth-files-action-bar-height', `${height}px`);
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePadding);
    ro?.observe(actionsEl);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updatePadding);
      document.documentElement.style.removeProperty('--auth-files-action-bar-height');
    };
  }, [batchActionBarVisible, selectionCount]);

  useEffect(() => {
    selectionCountRef.current = selectionCount;
    if (selectionCount > 0) {
      setBatchActionBarVisible(true);
    }
  }, [selectionCount]);

  useLayoutEffect(() => {
    if (!batchActionBarVisible) return;
    const currentCount = selectionCount;
    const previousCount = previousSelectionCountRef.current;
    const actionsEl = floatingBatchActionsRef.current;
    if (!actionsEl) return;

    batchActionAnimationRef.current?.stop();
    batchActionAnimationRef.current = null;

    if (currentCount > 0 && previousCount === 0) {
      batchActionAnimationRef.current = animate(
        actionsEl,
        {
          transform: [BATCH_BAR_HIDDEN_TRANSFORM, BATCH_BAR_BASE_TRANSFORM],
          opacity: [0, 1],
        },
        {
          duration: 0.28,
          ease: easePower3Out,
          onComplete: () => {
            actionsEl.style.transform = BATCH_BAR_BASE_TRANSFORM;
            actionsEl.style.opacity = '1';
          },
        }
      );
    } else if (currentCount === 0 && previousCount > 0) {
      batchActionAnimationRef.current = animate(
        actionsEl,
        {
          transform: [BATCH_BAR_BASE_TRANSFORM, BATCH_BAR_HIDDEN_TRANSFORM],
          opacity: [1, 0],
        },
        {
          duration: 0.22,
          ease: easePower2In,
          onComplete: () => {
            if (selectionCountRef.current === 0) {
              setBatchActionBarVisible(false);
            }
          },
        }
      );
    }

    previousSelectionCountRef.current = currentCount;
  }, [batchActionBarVisible, selectionCount]);

  useEffect(
    () => () => {
      batchActionAnimationRef.current?.stop();
      batchActionAnimationRef.current = null;
    },
    []
  );

  const renderFilterTags = () => (
    <div className={styles.filterSection}>
      <div
        className={styles.tabsContainer}
        role="tablist"
        aria-label={t('auth_files.type_filter_label', { defaultValue: 'Auth file type filter' })}
        ref={filterTabsRef}
      >
        {existingTypes.map((type) => {
          const isActive = normalizedFilter === type;
          const iconSrc = getAuthFileIcon(type, resolvedTheme);
          const color =
            type === 'all'
              ? { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)' }
              : getTypeColor(type, resolvedTheme);
          const buttonStyle = {
            '--filter-color': color.text,
            '--filter-surface': color.bg,
            '--filter-active-text': resolvedTheme === 'dark' ? '#111827' : '#ffffff',
          } as CSSProperties;

          return (
            <button
              key={type}
              id={`auth-files-filter-tab-${type}`}
              role="tab"
              data-tab-id={type}
              aria-selected={isActive}
              aria-controls="auth-files-list"
              className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
              style={buttonStyle}
              onClick={() => {
                setFilter(type);
                setPage(1);
              }}
              type="button"
            >
              {type === 'all' ? (
                <IconFilterAll className={styles.filterAllIcon} size={18} />
              ) : iconSrc ? (
                <img src={iconSrc} alt="" className={styles.tabIcon} />
              ) : (
                <span className={styles.tabIconFallback}>
                  {getTypeLabel(t, type).slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className={styles.tabLabel}>{getTypeLabel(t, type)}</span>
              <span className={styles.tabCount}>{typeCounts[type] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <PageHeader title={t('auth_files.title')} />

      <div className={styles.filterSectionLayout}>
        <div className={styles.toolbarRow}>
          {renderFilterTags()}

          <div className={styles.headerActions}>
            <div className={styles.buttonGroup}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefreshPageQuota}
                disabled={
                  disableControls || loading || quotaRefreshing || pageQuotaTargets.length === 0
                }
                loading={quotaRefreshing}
                title={t('auth_files.quota_refresh_page')}
                aria-label={t('auth_files.quota_refresh_page')}
              >
                <IconZap size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleHeaderRefresh}
                disabled={loading}
                title={t('common.refresh')}
                aria-label={t('common.refresh')}
              >
                <IconRefreshCw size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUploadClick}
                disabled={disableControls || uploading}
                loading={uploading}
                title={t('auth_files.upload_button')}
                aria-label={t('auth_files.upload_button')}
              >
                <IconUpload size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOauthDialogOpen(true)}
                disabled={disableControls}
                title={t('nav.oauth', { defaultValue: 'OAuth' })}
                aria-label={t('nav.oauth', { defaultValue: 'OAuth' })}
              >
                <IconPlus size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOauthSettingsOpen(true)}
                disabled={disableControls}
                title={t('auth_files.oauth_settings_button', { defaultValue: 'OAuth 设置' })}
                aria-label={t('auth_files.oauth_settings_button', { defaultValue: 'OAuth 设置' })}
              >
                <IconSlidersHorizontal size={16} />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>

        <Card>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div
            className={styles.filterContent}
            id="auth-files-list"
            role="tabpanel"
            aria-labelledby={`auth-files-filter-tab-${activeFilterTabId}`}
          >
            <div className={styles.filterControlsPanel}>
              <div className={styles.filterControls}>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.search_label')}</label>
                  <Input
                    className={styles.searchInput}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t('auth_files.search_placeholder')}
                    rightElement={<IconSearch className={styles.searchIcon} size={18} />}
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.page_size_label')}</label>
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
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.sort_label')}</label>
                  <Select
                    className={styles.sortSelect}
                    value={sortMode}
                    options={sortOptions}
                    onChange={handleSortModeChange}
                    ariaLabel={t('auth_files.sort_label')}
                    fullWidth
                  />
                </div>
                <div className={`${styles.filterItem} ${styles.filterToggleItem}`}>
                  <label>{t('auth_files.display_options_label')}</label>
                  <div className={styles.filterToggleGroup}>
                    <div className={styles.filterToggleCard}>
                      <ToggleSwitch
                        checked={problemOnly}
                        onChange={(value) => {
                          setProblemOnly(value);
                          setPage(1);
                        }}
                        ariaLabel={t('auth_files.problem_filter_only')}
                        label={
                          <span className={styles.filterToggleLabel}>
                            {t('auth_files.problem_filter_only')}
                          </span>
                        }
                      />
                    </div>
                    <div className={styles.filterToggleCard}>
                      <ToggleSwitch
                        checked={disabledOnly}
                        onChange={(value) => {
                          setDisabledOnly(value);
                          setPage(1);
                        }}
                        ariaLabel={t('auth_files.disabled_filter_only')}
                        label={
                          <span className={styles.filterToggleLabel}>
                            {t('auth_files.disabled_filter_only')}
                          </span>
                        }
                      />
                    </div>
                    <div className={styles.filterToggleCard}>
                      <ToggleSwitch
                        checked={compactMode}
                        onChange={(value) => setCompactMode(value)}
                        ariaLabel={t('auth_files.compact_mode_label')}
                        label={
                          <span className={styles.filterToggleLabel}>
                            {t('auth_files.compact_mode_label')}
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.hint}>{t('common.loading')}</div>
            ) : pageItems.length === 0 ? (
              <EmptyState
                title={t('auth_files.search_empty_title')}
                description={t('auth_files.search_empty_desc')}
              />
            ) : (
              <ItemCard.Grid compact={compactMode} wide={!!quotaFilterType}>
                {pageItems.map((file) => (
                  <AuthFileCard
                    key={file.name}
                    file={file}
                    compact={compactMode}
                    selected={selectedFiles.has(file.name)}
                    resolvedTheme={resolvedTheme}
                    disableControls={disableControls}
                    deleting={deleting}
                    statusUpdating={statusUpdating}
                    quotaFilterType={quotaFilterType}
                    statusBarCache={statusBarCache}
                    onShowModels={showModels}
                    onDownload={handleDownload}
                    onOpenPrefixProxyEditor={openPrefixProxyEditor}
                    onDelete={handleDelete}
                    onToggleStatus={handleStatusToggle}
                    onToggleSelect={toggleSelect}
                    onRefreshQuota={refreshQuotaForFile}
                  />
                ))}
              </ItemCard.Grid>
            )}

            {!loading && sorted.length > pageSize && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sorted.length}
                onPrev={() => setPage(Math.max(1, currentPage - 1))}
                onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
                onPageChange={(p) => setPage(p)}
                className={styles.pagination}
              />
            )}
          </div>
        </Card>
      </div>

      <OAuthSettingsModal
        open={oauthSettingsOpen}
        onClose={() => setOauthSettingsOpen(false)}
        disableControls={disableControls}
        excludedError={excludedError}
        excluded={excluded}
        onAddExcluded={() => openExcludedEditor()}
        onEditExcluded={openExcludedEditor}
        onDeleteExcluded={deleteExcluded}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddAlias={() => openModelAliasEditor()}
        onEditProvider={openModelAliasEditor}
        onDeleteProvider={deleteModelAlias}
        modelAliasError={modelAliasError}
        modelAlias={modelAlias}
        allProviderModels={allProviderModels}
        onUpdateAlias={handleMappingUpdate}
        onDeleteLink={handleDeleteLink}
        onToggleFork={handleToggleFork}
        onRenameAlias={handleRenameAlias}
        onDeleteAlias={handleDeleteAlias}
      />

      <AuthFileModelsModal
        open={modelsModalOpen}
        fileName={modelsFileName}
        fileType={modelsFileType}
        loading={modelsLoading}
        error={modelsError}
        models={modelsList}
        excluded={excluded}
        onClose={closeModelsModal}
      />

      <AuthFilesPrefixProxyEditorModal
        disableControls={disableControls}
        editor={prefixProxyEditor}
        updatedText={prefixProxyUpdatedText}
        dirty={prefixProxyDirty}
        onClose={closePrefixProxyEditor}
        onCopyText={copyTextWithNotification}
        onSave={handlePrefixProxySave}
        onChange={handlePrefixProxyChange}
      />

      {batchActionBarVisible && typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.batchActionContainer} ref={floatingBatchActionsRef}>
              <div className={styles.batchActionBar}>
                <div className={styles.batchActionLeft}>
                  <span className={styles.batchSelectionText}>
                    {t('auth_files.batch_selected', { count: selectionCount })}
                  </span>
                  <div className={styles.batchButtonGroup}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => selectAllVisible(pageItems)}
                      disabled={selectablePageItems.length === 0}
                    >
                      {t('auth_files.batch_select_page')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => selectAllVisible(sorted)}
                      disabled={selectableFilteredItems.length === 0}
                    >
                      {t('auth_files.batch_select_filtered')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => invertVisibleSelection(pageItems)}
                      disabled={selectablePageItems.length === 0}
                    >
                      {t('auth_files.batch_invert_page')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={deselectAll}>
                      {t('auth_files.batch_deselect')}
                    </Button>
                  </div>
                </div>
                <div className={styles.batchActionRight}>
                  <div className={styles.batchButtonGroup}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void batchDownload(selectedNames)}
                      disabled={disableControls || selectedNames.length === 0}
                      title={t('auth_files.batch_download')}
                      aria-label={t('auth_files.batch_download')}
                    >
                      <IconDownload size={16} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => batchSetStatus(selectedNames, true)}
                      disabled={batchStatusButtonsDisabled}
                    >
                      {t('auth_files.batch_enable')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => batchSetStatus(selectedNames, false)}
                      disabled={batchStatusButtonsDisabled}
                    >
                      {t('auth_files.batch_disable')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => batchDelete(selectedNames)}
                      disabled={disableControls || selectedNames.length === 0}
                      title={t('auth_files.batch_delete_title')}
                      aria-label={t('auth_files.batch_delete_title')}
                    >
                      <IconTrash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <AuthFilesOAuthDialog
        open={oauthDialogOpen}
        onClose={() => setOauthDialogOpen(false)}
        onAuthFileCreated={() => {
          setPage(1);
          void loadFiles().catch(() => {});
        }}
      />
    </div>
  );
}
