import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useHorizontalWheelScroll } from '@/hooks/useHorizontalWheelScroll';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore, useNotificationStore } from '@/stores';
import { useProviderRecentRequests } from '@/components/providers/hooks/useProviderRecentRequests';
import { getOpenAIProviderRecentWindowStats } from '@/components/providers/utils';
import claudeLogo from '@/assets/icons/claude.svg';
import codexLogo from '@/assets/icons/codex.svg';
import geminiLogo from '@/assets/icons/gemini.svg';
import openaiLogo from '@/assets/icons/openai-light.svg';
import vertexLogo from '@/assets/icons/vertex.svg';
import xaiLogo from '@/assets/icons/grok.svg';
import kimiLogo from '@/assets/icons/kimi-dark.svg';
import { CategoryList, type CategoryItem } from '@/components/common/CategoryList';
import type { GeminiKeyConfig, OpenAIProviderConfig, ProviderKeyConfig } from '@/types';
import { ProviderHeaderCard } from './components/ProviderHeaderCard';
import { ProviderResourcePanel } from './components/ProviderResourcePanel';
import type { OpenAISortBy, SortDir } from './components/OpenAIBrandToolbar';
import { ProviderSheet, type ProviderSheetHandle } from './sheets/ProviderSheet';
import { useProviderWorkbench } from './useProviderWorkbench';
import { ModelsListModal, type SharedModelItem } from '@/components/common/ModelsListModal';
import type { ProviderBrand, ProviderResource } from './types';
import styles from './ProvidersWorkbenchPage.module.scss';

type SheetMode = 'detail' | 'create' | 'edit';

const PROVIDER_TAB_STORAGE_KEY = 'ai-providers.active-tab';
const PROVIDER_LOGOS: Record<ProviderBrand, string> = {
  kimi: kimiLogo,
  gemini: geminiLogo,
  claude: claudeLogo,
  codex: codexLogo,
  xai: xaiLogo,
  vertex: vertexLogo,
  openaiCompatibility: openaiLogo,
};
const PROVIDER_TAB_IDS: ProviderBrand[] = [
  'kimi',
  'openaiCompatibility',
  'gemini',
  'codex',
  'xai',
  'claude',
  'vertex',
];

interface SheetState {
  open: boolean;
  brand: ProviderBrand;
  mode: SheetMode;
  resource: ProviderResource | null;
}

const matchesFilter = (r: ProviderResource, normalized: string): boolean => {
  if (!normalized) return true;
  const haystack = [
    r.identifier,
    r.name,
    r.authIndex,
    r.apiKeyPreview,
    r.apiKey,
    r.baseUrl,
    r.proxyUrl,
    r.prefix,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return haystack.some((v) => v.includes(normalized));
};

export function ProvidersWorkbenchPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((s) => s.connectionStatus);
  const { showNotification, showConfirmation } = useNotificationStore();

  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;

  const workbench = useProviderWorkbench();
  const [activeBrand, setActiveBrand] = useState<ProviderBrand>(() => {
    try {
      const saved = localStorage.getItem(PROVIDER_TAB_STORAGE_KEY);
      if (saved && PROVIDER_TAB_IDS.includes(saved as ProviderBrand)) {
        return saved as ProviderBrand;
      }
    } catch {
      // localStorage can be unavailable in hardened/privacy contexts.
    }
    return 'openaiCompatibility';
  });
  const [filter, setFilter] = useState('');
  const [openaiSortBy, setOpenaiSortBy] = useState<OpenAISortBy>('name');
  const [openaiSortDir, setOpenaiSortDir] = useState<SortDir>('asc');
  const [openaiSelectedModels, setOpenaiSelectedModels] = useState<Set<string>>(() => new Set());
  const [sheetState, setSheetState] = useState<SheetState>({
    open: false,
    brand: 'gemini',
    mode: 'detail',
    resource: null,
  });
  const sheetRef = useRef<ProviderSheetHandle>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(tabsContainerRef);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_TAB_STORAGE_KEY, activeBrand);
    } catch {
      // Persistence is a convenience; tab switching should keep working without it.
    }

    const timeoutId = window.setTimeout(() => {
      const activeEl = tabsContainerRef.current?.querySelector(`[data-tab-id="${activeBrand}"]`);
      activeEl?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeBrand]);

  const connected = connectionStatus === 'connected';
  const { usageByProvider, refreshRecentRequests } = useProviderRecentRequests({
    enabled: connected,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([workbench.refetch(), refreshRecentRequests().catch(() => undefined)]);
  }, [refreshRecentRequests, workbench]);

  useHeaderRefresh(handleRefresh, isCurrentLayer);

  const disableMutations = connectionStatus !== 'connected' || workbench.mutating;

  const groups = useMemo(() => {
    const rawGroups = workbench.snapshot?.groups ?? [];
    const orderMap = new Map(PROVIDER_TAB_IDS.map((t, idx) => [t, idx]));
    return [...rawGroups].sort((a, b) => {
      const oa = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const ob = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return oa - ob;
    });
  }, [workbench.snapshot]);

  const categoryItems = useMemo<CategoryItem[]>(() => {
    return groups.map((group) => {
      const realResources = group.resources.filter((r) => !r.flags.isPlaceholder);
      const count = realResources.length;
      return {
        id: group.id,
        label: t(`providersPage.providerNames.${group.id}`),
        icon: PROVIDER_LOGOS[group.id],
        count,
        hasIssue: !!group.issue,
        invertOnDark: group.id === 'openaiCompatibility',
      };
    });
  }, [groups, t]);

  const activeGroup = groups.find((g) => g.id === activeBrand) ?? groups[0] ?? null;

  const filteredResources = useMemo(() => {
    if (!activeGroup) return [];
    const normalized = filter.trim().toLowerCase();
    return activeGroup.resources.filter((r) => matchesFilter(r, normalized));
  }, [activeGroup, filter]);

  const isOpenAI = activeGroup?.id === 'openaiCompatibility';
  const availableOpenaiModels = useMemo(() => {
    if (!isOpenAI || !activeGroup) return [];
    const seen = new Set<string>();
    activeGroup.resources.forEach((r) => {
      const cfg = r.raw as OpenAIProviderConfig;
      cfg.models?.forEach((m) => {
        const name = (m.name ?? '').trim();
        if (name) seen.add(name);
      });
    });
    return Array.from(seen).sort();
  }, [activeGroup, isOpenAI]);

  const visibleResources = useMemo(() => {
    if (!isOpenAI) return filteredResources;

    let arr = filteredResources;
    if (openaiSelectedModels.size > 0) {
      arr = arr.filter((r) => {
        const cfg = r.raw as OpenAIProviderConfig;
        return Boolean(cfg.models?.some((m) => openaiSelectedModels.has((m.name ?? '').trim())));
      });
    }

    const sorted = [...arr].sort((a, b) => {
      let diff = 0;
      if (openaiSortBy === 'name') {
        const an = (a.name ?? a.identifier ?? '').toLowerCase();
        const bn = (b.name ?? b.identifier ?? '').toLowerCase();
        diff = an.localeCompare(bn);
      } else if (openaiSortBy === 'priority') {
        const ap = (a.raw as OpenAIProviderConfig).priority ?? Number.MAX_SAFE_INTEGER;
        const bp = (b.raw as OpenAIProviderConfig).priority ?? Number.MAX_SAFE_INTEGER;
        diff = ap - bp;
        if (diff === 0) {
          const an = (a.name ?? a.identifier ?? '').toLowerCase();
          const bn = (b.name ?? b.identifier ?? '').toLowerCase();
          diff = an.localeCompare(bn);
        }
      } else {
        const aStats = getOpenAIProviderRecentWindowStats(
          a.raw as OpenAIProviderConfig,
          usageByProvider
        );
        const bStats = getOpenAIProviderRecentWindowStats(
          b.raw as OpenAIProviderConfig,
          usageByProvider
        );
        diff = aStats.success - bStats.success;
      }
      return openaiSortDir === 'asc' ? diff : -diff;
    });

    sorted.sort((a, b) => Number(a.disabled) - Number(b.disabled));

    return sorted;
  }, [
    filteredResources,
    isOpenAI,
    openaiSelectedModels,
    openaiSortBy,
    openaiSortDir,
    usageByProvider,
  ]);

  const openaiControls = useMemo(() => {
    if (!isOpenAI) return undefined;
    return {
      sortBy: openaiSortBy,
      sortDir: openaiSortDir,
      onSortBy: setOpenaiSortBy,
      onSortDir: setOpenaiSortDir,
      availableModels: availableOpenaiModels,
      selectedModels: openaiSelectedModels,
      onSelectedModelsChange: setOpenaiSelectedModels,
    };
  }, [availableOpenaiModels, isOpenAI, openaiSelectedModels, openaiSortBy, openaiSortDir]);

  const [modelsModal, setModelsModal] = useState<{
    open: boolean;
    providerName: string;
    models: SharedModelItem[];
  }>({
    open: false,
    providerName: '',
    models: [],
  });

  const showModels = useCallback((resource: ProviderResource) => {
    if (resource.brand === 'openaiCompatibility') {
      const cfg = resource.raw as OpenAIProviderConfig;
      const models = (cfg.models || []).map((m: any) => ({
        id: m.name,
        display_name: m.alias,
      }));
      setModelsModal({
        open: true,
        providerName: cfg.name || 'OpenAI',
        models,
      });
    } else {
      const cfg = resource.raw as ProviderKeyConfig | GeminiKeyConfig;
      const models = (cfg.models || []).map((m: any) => ({
        id: m.name,
        display_name: m.alias,
      }));
      setModelsModal({
        open: true,
        providerName: resource.identifier,
        models,
      });
    }
  }, []);

  const openCreate = useCallback(() => {
    setSheetState({ open: true, brand: activeBrand, mode: 'create', resource: null });
  }, [activeBrand]);

  const openView = useCallback((resource: ProviderResource) => {
    setSheetState({
      open: true,
      brand: resource.brand,
      mode: 'detail',
      resource,
    });
  }, []);

  const openEdit = useCallback((resource: ProviderResource) => {
    setSheetState({
      open: true,
      brand: resource.brand,
      mode: 'edit',
      resource,
    });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetState((s) => ({ ...s, open: false }));
  }, []);
  const handleDelete = useCallback(
    (resource: ProviderResource) => {
      const name = resource.name ?? resource.apiKeyPreview ?? resource.identifier ?? '';
      showConfirmation({
        title: t('providersPage.delete.title'),
        message: t('providersPage.delete.confirm', { name }),
        variant: 'danger',
        confirmText: t('providersPage.actions.delete'),
        onConfirm: async () => {
          try {
            await workbench.deleteProvider(resource);
            showNotification(t('providersPage.toast.deleted'), 'success');
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            showNotification(`${t('notification.delete_failed')}: ${msg}`, 'error');
          }
        },
      });
    },
    [showConfirmation, showNotification, t, workbench]
  );

  const handleToggleDisabled = useCallback(
    async (resource: ProviderResource, disabled: boolean) => {
      try {
        await workbench.toggleDisabled(resource, disabled);
        showNotification(
          disabled ? t('providersPage.toast.disabled') : t('providersPage.toast.enabled'),
          'success'
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showNotification(`${t('providersPage.toast.toggleFailed')}: ${msg}`, 'error');
      }
    },
    [showNotification, t, workbench]
  );

  const handleCreated = useCallback(() => {
    showNotification(t('providersPage.toast.created'), 'success');
    closeSheet();
  }, [closeSheet, showNotification, t]);

  const handleUpdated = useCallback(() => {
    showNotification(t('providersPage.toast.updated'), 'success');
    closeSheet();
  }, [closeSheet, showNotification, t]);

  if (!workbench.snapshot && workbench.isPending) {
    return (
      <div className={styles.page}>
        <Skeleton height={120} />
        <div className={styles.layout}>
          <Skeleton height={420} />
          <Skeleton height={420} />
        </div>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className={styles.page}>
        <PageHeader title={t('providersPage.header.title')} />
        <Skeleton height={120} />
        <div className={styles.layout}>
          <Skeleton height={420} />
          <Skeleton height={420} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('providersPage.header.title')} />

      <div className={styles.layout}>
        <div className={styles.toolbarRow}>
          <CategoryList
            listRef={tabsContainerRef}
            items={categoryItems}
            activeId={activeGroup.id}
            buttonStyles={() =>
              ({
                '--filter-color': 'var(--text-primary)',
                '--filter-surface': 'var(--bg-tertiary)',
              }) as React.CSSProperties
            }
            onSelect={(brandId) => {
              const brand = brandId as ProviderBrand;
              const isSwitching = sheetState.open && sheetState.brand !== brand;
              const proceed =
                isSwitching && sheetRef.current
                  ? sheetRef.current.confirmDiscardIfDirty()
                  : Promise.resolve(true);
              void proceed.then((ok) => {
                if (!ok) return;
                setActiveBrand(brand);
                setFilter('');
                setOpenaiSelectedModels(new Set());
                if (isSwitching) {
                  closeSheet();
                }
              });
            }}
          />
          <div className={styles.headerActions}>
            <ProviderHeaderCard
              isFetching={workbench.isFetching}
              isNewDisabled={disableMutations}
              newLabel={t('providersPage.actions.new')}
              onRefresh={() => void handleRefresh()}
              onNew={openCreate}
            />
          </div>
        </div>

        <ProviderResourcePanel
          group={activeGroup}
          filteredResources={visibleResources}
          disableMutations={disableMutations}
          usageByProvider={usageByProvider}
          openaiControls={openaiControls}
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleDisabled={handleToggleDisabled}
          onShowModels={showModels}
          onCreate={openCreate}
        />
      </div>

      <ProviderSheet
        ref={sheetRef}
        state={sheetState}
        onClose={closeSheet}
        onSwitchToEdit={() => {
          setSheetState((s) => (s.resource ? { ...s, mode: 'edit' } : s));
        }}
        workbench={workbench}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        mutationDisabled={disableMutations}
        usageByProvider={usageByProvider}
      />

      <ModelsListModal
        open={modelsModal.open}
        title={
          t('auth_files.models_title', { defaultValue: '支持的模型' }) +
          ` - ${modelsModal.providerName}`
        }
        models={modelsModal.models}
        onClose={() => setModelsModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
