import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconKey,
  IconPencil,
  IconPlus,
  IconSignal,
  IconSlidersHorizontal,
  IconTrash2,
  IconUpload,
  IconX,
} from '@/components/ui/icons';
import { ItemCard } from '@/components/ui/ItemCard';
import iconOpenaiLight from '@/assets/icons/openai-light.svg';
import iconOpenaiDark from '@/assets/icons/openai-dark.svg';
import type { OpenAIProviderConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { statusBarDataFromRecentRequests } from '@/utils/recentRequests';
import styles from '@/pages/AiProvidersPage.module.scss';
import keyBadgeStyles from './KeyCountBadge.module.scss';
import { ProviderStatusBar } from '../ProviderStatusBar';
import { ModelCategoryBadges } from '../ModelCategoryBadges';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import {
  getOpenAIProviderRecentWindowStats,
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getOpenAIProviderKey,
  getProviderTotalStats,
  type ProviderRecentUsageMap,
} from '../utils';

type SortOption = 'name' | 'priority' | 'recent-success';
type SortDirection = 'asc' | 'desc';

interface FloatingToolbarStyle {
  left: number;
  top: number;
  width: number;
  visible: boolean;
}

const EMPTY_STATUS_BAR = statusBarDataFromRecentRequests([]);

interface OpenAISectionProps {
  configs: OpenAIProviderConfig[];
  usageByProvider: ProviderRecentUsageMap;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  resolvedTheme: string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggle: (index: number, enabled: boolean) => void;
  onImport?: () => void;
}

interface IndexedOpenAIProvider {
  config: OpenAIProviderConfig;
  originalIndex: number;
}

/** 密钥数量 badge，hover 弹出 masked key 列表（含统计） */
function KeyCountBadge({ entries, providerName, baseUrl, usageByProvider }: {
  entries: NonNullable<OpenAIProviderConfig['apiKeyEntries']>;
  providerName: string;
  baseUrl: string;
  usageByProvider: ProviderRecentUsageMap;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const open = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  useEffect(() => {
    if (!show) return;
    const dismiss = () => setShow(false);
    const handlePointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('touchmove', dismiss, true);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('touchmove', dismiss, true);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [show]);

  if (!entries || entries.length === 0) return null;

  return (
    <>
      <div
        ref={ref}
        className={keyBadgeStyles.badge}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') open(); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setShow(false); }}
        onClick={() => setShow((v) => !v)}
      >
        <span className={keyBadgeStyles.badgeIcon}><IconKey size={13} /></span>
        <span className={keyBadgeStyles.badgeCount}>{entries.length}</span>
      </div>
      {show && createPortal(
        <div className={keyBadgeStyles.tooltip} style={{ top: pos.top, left: pos.left }}>
          <div className={keyBadgeStyles.tooltipList}>
            {entries.map((entry, i) => {
              const entryStats = getProviderTotalStats(usageByProvider, providerName, entry.apiKey, baseUrl);
              return (
                <div key={i} className={keyBadgeStyles.tooltipItem}>
                  <span className={keyBadgeStyles.tooltipIndex}>{i + 1}</span>
                  <span className={keyBadgeStyles.tooltipKey}>{maskApiKey(entry.apiKey)}</span>
                  <span className={keyBadgeStyles.tooltipStats}>
                    <span className={keyBadgeStyles.tooltipSuccess}>✓{entryStats.success}</span>
                    <span className={keyBadgeStyles.tooltipFailure}>✗{entryStats.failure}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function OpenAISection({
  configs,
  usageByProvider,
  loading,
  disableControls,
  isSwitching,
  resolvedTheme,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onImport,
}: OpenAISectionProps) {
  const { t } = useTranslation();
  const pageTransitionLayer = usePageTransitionLayer();
  const isTransitionAnimating = pageTransitionLayer?.isAnimating ?? false;
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.isCurrentLayer : true;
  const actionsDisabled = disableControls || loading || isSwitching;
  const toggleDisabled = disableControls || loading || isSwitching;
  const [sortOption, setSortOption] = useState<SortOption>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ openAbove: false, maxHeight: 300 });
  const [floatingToolbarStyle, setFloatingToolbarStyle] = useState<FloatingToolbarStyle>({
    left: 0,
    top: 0,
    width: 0,
    visible: false,
  });
  const sectionRef = useRef<HTMLDivElement>(null);
  const topToolbarAnchorRef = useRef<HTMLDivElement>(null);
  const topDropdownRef = useRef<HTMLDivElement>(null);
  const floatingDropdownRef = useRef<HTMLDivElement>(null);

  const shouldRenderFloatingToolbar = isCurrentLayer && !isTransitionAnimating && floatingToolbarStyle.visible;

  useEffect(() => {
    if (isTransitionAnimating) {
      return;
    }

    const updateFloatingToolbar = () => {
      const section = sectionRef.current;
      const anchor = topToolbarAnchorRef.current;

      if (!section || !anchor) {
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const rootStyles = getComputedStyle(document.documentElement);
      const fixedTop = Number.parseFloat(rootStyles.getPropertyValue('--header-height')) || 64;
      const toolbarHeight = anchorRect.height;
      const isMobile = window.innerWidth <= 768;
      const shouldShow =
        !isMobile && anchorRect.top <= fixedTop && sectionRect.bottom > fixedTop + toolbarHeight;

      setFloatingToolbarStyle((prev) => {
        const next = {
          left: sectionRect.left,
          top: fixedTop,
          width: sectionRect.width,
          visible: shouldShow,
        };

        if (
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.visible === next.visible
        ) {
          return prev;
        }

        return next;
      });
    };

    updateFloatingToolbar();
    window.addEventListener('resize', updateFloatingToolbar);
    window.addEventListener('scroll', updateFloatingToolbar, true);

    return () => {
      window.removeEventListener('resize', updateFloatingToolbar);
      window.removeEventListener('scroll', updateFloatingToolbar, true);
    };
  }, [
    configs.length,
    isDropdownOpen,
    isTransitionAnimating,
    selectedModels,
    sortDirection,
    sortOption,
  ]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTop = topDropdownRef.current?.contains(target);
      const clickedFloating = floatingDropdownRef.current?.contains(target);

      if (!clickedTop && !clickedFloating) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const updateDropdownLayout = () => {
      const wrapper = floatingToolbarStyle.visible
        ? floatingDropdownRef.current
        : topDropdownRef.current;

      if (!wrapper) {
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      const viewportPadding = 12;
      const dropdownGap = 4;
      const preferredMaxHeight = 300;
      const minimumMaxHeight = 120;
      const availableBelow = Math.max(
        0,
        window.innerHeight - rect.bottom - viewportPadding - dropdownGap
      );
      const availableAbove = Math.max(0, rect.top - viewportPadding - dropdownGap);
      const openAbove = availableBelow < preferredMaxHeight && availableAbove > availableBelow;
      const availableSpace = openAbove ? availableAbove : availableBelow;
      const maxHeight = Math.max(minimumMaxHeight, Math.min(preferredMaxHeight, availableSpace));

      setDropdownLayout((prev) => {
        if (prev.openAbove === openAbove && prev.maxHeight === maxHeight) {
          return prev;
        }

        return { openAbove, maxHeight };
      });
    };

    updateDropdownLayout();
    window.addEventListener('resize', updateDropdownLayout);
    window.addEventListener('scroll', updateDropdownLayout, true);

    return () => {
      window.removeEventListener('resize', updateDropdownLayout);
      window.removeEventListener('scroll', updateDropdownLayout, true);
    };
  }, [floatingToolbarStyle.visible, isDropdownOpen]);

  const allModelNames = useMemo(() => {
    const modelSet = new Set<string>();
    configs.forEach((provider) => {
      provider.models?.forEach((model) => {
        if (model.name) {
          modelSet.add(model.name);
        }
      });
    });
    return Array.from(modelSet).sort();
  }, [configs]);
  const selectedModelNames = useMemo(() => Array.from(selectedModels).sort(), [selectedModels]);
  const modelFilterActive = selectedModelNames.length > 0;
  const modelFilterLabel = modelFilterActive
    ? t('ai_providers.model_discovery_selected_count', { count: selectedModelNames.length })
    : t('ai_providers.model_search_placeholder');
  const modelFilterTitle = modelFilterActive
    ? selectedModelNames.join(', ')
    : t('ai_providers.model_search_placeholder');

  const statusBarCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof statusBarDataFromRecentRequests>>();

    configs.forEach((provider, index) => {
      const providerKey = getOpenAIProviderKey(provider, index);
      cache.set(providerKey, getOpenAIProviderRecentStatusData(provider, usageByProvider));
    });

    return cache;
  }, [configs, usageByProvider]);

  const sortOptions = useMemo(
    () => [
      { value: 'priority', label: t('ai_providers.sort_by_priority') },
      { value: 'name', label: t('ai_providers.sort_by_name') },
      { value: 'recent-success', label: t('ai_providers.sort_by_recent_success') },
    ],
    [t]
  );

  const sortedConfigs = useMemo<IndexedOpenAIProvider[]>(() => {
    const indexed = configs.map((config, originalIndex) => ({ config, originalIndex }));
    const filtered = indexed.filter(({ config }) => {
      if (selectedModels.size === 0) return true;
      return config.models?.some((model) => selectedModels.has(model.name));
    });

    const sorted = [...filtered];
    const direction = sortDirection === 'desc' ? -1 : 1;
    const providerStats =
      sortOption === 'recent-success'
        ? new Map(
            sorted.map(({ config }) => [
              config,
              getOpenAIProviderRecentWindowStats(config, usageByProvider),
            ])
          )
        : null;

    switch (sortOption) {
      case 'name':
        sorted.sort((a, b) => direction * a.config.name.localeCompare(b.config.name));
        break;
      case 'priority':
        sorted.sort((a, b) => {
          const priorityA = a.config.priority ?? Number.MAX_SAFE_INTEGER;
          const priorityB = b.config.priority ?? Number.MAX_SAFE_INTEGER;
          const priorityDiff = priorityA - priorityB;

          if (priorityDiff !== 0) {
            return direction * priorityDiff;
          }

          return direction * a.config.name.localeCompare(b.config.name);
        });
        break;
      case 'recent-success':
        sorted.sort((a, b) => {
          const successDiff =
            (providerStats?.get(a.config)?.success ?? 0) -
            (providerStats?.get(b.config)?.success ?? 0);

          if (successDiff !== 0) {
            return direction * successDiff;
          }

          return direction * a.config.name.localeCompare(b.config.name);
        });
        break;
      default:
        break;
    }

    // Always push disabled providers to the end
    sorted.sort((a, b) => {
      const aDisabled = a.config.disabled === true ? 1 : 0;
      const bDisabled = b.config.disabled === true ? 1 : 0;
      return aDisabled - bDisabled;
    });

    return sorted;
  }, [configs, sortOption, sortDirection, usageByProvider, selectedModels]);

  const toggleModelSelection = (modelName: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  };

  const clearAllModels = () => {
    setSelectedModels(new Set());
  };

  const handleSortOptionChange = (value: SortOption) => {
    setSortOption(value);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const renderSortControls = () => (
    <div className={styles.sortControls}>
      <Select
        value={sortOption}
        options={sortOptions}
        onChange={(value) => handleSortOptionChange(value as SortOption)}
        className={styles.sortSelect}
        disabled={actionsDisabled}
        ariaLabel={t('ai_providers.sort_by_priority')}
        fullWidth={false}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleSortDirection}
        className={styles.sortDirectionButton}
        disabled={actionsDisabled}
        title={
          sortDirection === 'asc'
            ? t('ai_providers.sort_ascending')
            : t('ai_providers.sort_descending')
        }
        aria-label={
          sortDirection === 'asc'
            ? t('ai_providers.sort_ascending')
            : t('ai_providers.sort_descending')
        }
      >
        <span className={styles.sortDirectionIcon}>
          {sortDirection === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </span>
        <span>
          {sortDirection === 'asc'
            ? t('ai_providers.sort_asc_short')
            : t('ai_providers.sort_desc_short')}
        </span>
      </Button>
    </div>
  );

  const renderToolbar = (isFloating = false) => {
    const isActiveToolbar = isFloating === shouldRenderFloatingToolbar;
    const dropdownClassName = dropdownLayout.openAbove
      ? `${styles.modelDropdownList} ${styles.modelDropdownListAbove}`
      : styles.modelDropdownList;

    return (
      <div className={styles.cardHeaderActions}>
        <div
          className={styles.modelMultiSelectWrapper}
          ref={isFloating ? floatingDropdownRef : topDropdownRef}
        >
          <div
            className={[
              styles.modelFilterControl,
              modelFilterActive ? styles.modelFilterControlActive : '',
              actionsDisabled ? styles.modelFilterControlDisabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <button
              type="button"
              className={styles.modelFilterTrigger}
              onClick={toggleDropdown}
              disabled={actionsDisabled}
              title={modelFilterTitle}
              aria-label={modelFilterTitle}
              aria-haspopup="true"
              aria-expanded={isActiveToolbar && isDropdownOpen}
            >
              <span className={styles.modelFilterIcon} aria-hidden="true">
                <IconSlidersHorizontal size={14} />
              </span>
              <span className={styles.modelFilterText}>{modelFilterLabel}</span>
              {modelFilterActive && (
                <span className={styles.modelFilterCount}>{selectedModelNames.length}</span>
              )}
              <span className={styles.modelFilterChevron} aria-hidden="true">
                <IconChevronDown size={14} />
              </span>
            </button>
            {modelFilterActive && (
              <button
                type="button"
                className={styles.modelFilterInlineClear}
                onClick={clearAllModels}
                disabled={actionsDisabled}
                aria-label={t('ai_providers.model_search_clear')}
                title={t('ai_providers.model_search_clear')}
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {isActiveToolbar && isDropdownOpen && (
            <div
              className={dropdownClassName}
              style={{ maxHeight: `${dropdownLayout.maxHeight}px` }}
            >
              <div className={styles.modelDropdownHeader}>
                <div className={styles.modelDropdownButtonGroup}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedModels(new Set(allModelNames))}
                    className={styles.modelDropdownSelectAll}
                    disabled={actionsDisabled || allModelNames.length === 0}
                  >
                    {t('ai_providers.model_select_all')}
                  </Button>
                  {modelFilterActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearAllModels}
                      className={styles.modelDropdownClear}
                      disabled={actionsDisabled}
                    >
                      {t('ai_providers.model_search_clear')}
                    </Button>
                  )}
                </div>
              </div>
              <div
                className={styles.modelDropdownItems}
                role="group"
                aria-label={t('ai_providers.model_search_placeholder')}
              >
                {allModelNames.length === 0 ? (
                  <div className={styles.modelDropdownEmpty}>
                    {t('ai_providers.model_filter_empty')}
                  </div>
                ) : (
                  allModelNames.map((name) => (
                    <SelectionCheckbox
                      key={`top-option-${name}`}
                      checked={selectedModels.has(name)}
                      onChange={() => toggleModelSelection(name)}
                      disabled={actionsDisabled}
                      className={styles.modelDropdownItem}
                      labelClassName={styles.modelDropdownItemLabel}
                      label={<span title={name}>{name}</span>}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {renderSortControls()}
        <div className={styles.providerButtonGroup}>
          {configs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
                downloadBlob({ filename: 'openai-configs.json', blob });
              }}
              disabled={actionsDisabled}
              title={t('ai_providers.export_configs')}
              aria-label={t('ai_providers.export_configs')}
            >
              <IconUpload size={16} />
            </Button>
          )}
          {onImport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onImport}
              disabled={actionsDisabled}
              title={t('ai_providers.import_configs')}
              aria-label={t('ai_providers.import_configs')}
            >
              <IconDownload size={16} />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onAdd}
            disabled={actionsDisabled}
            title={t('ai_providers.openai_add_button')}
            aria-label={t('ai_providers.openai_add_button')}
          >
            <IconPlus size={16} />
          </Button>
        </div>
      </div>
    );
  };

  const renderStaticTitle = () => (
    <span className={styles.cardTitle}>
      <img
        src={resolvedTheme === 'dark' ? iconOpenaiDark : iconOpenaiLight}
        alt=""
        className={styles.cardTitleIcon}
      />
      {t('ai_providers.openai_title')}
    </span>
  );

  const renderProviderCard = ({ config: provider, originalIndex }: IndexedOpenAIProvider) => {
    const stats = getOpenAIProviderTotalStats(provider, usageByProvider);
    const headerEntries = Object.entries(provider.headers || {});
    const apiKeyEntries = provider.apiKeyEntries || [];
    const statusData =
      statusBarCache.get(getOpenAIProviderKey(provider, originalIndex)) || EMPTY_STATUS_BAR;
    const providerDisabled = provider.disabled === true;

    return (
      <ItemCard
        key={`openai-provider-${originalIndex}`}
        disabled={providerDisabled}
        title={provider.name}
        subtitle={provider.baseUrl}
        headerExtra={
          <>
            <KeyCountBadge entries={apiKeyEntries} providerName={provider.name} baseUrl={provider.baseUrl} usageByProvider={usageByProvider} />
            {provider.priority !== undefined && (
              <span
                className={ItemCard.styles.typeBadge}
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.10)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}
              >
                <IconSignal size={12} /> P{provider.priority}
              </span>
            )}
          </>
        }
        content={
          <>
            <ItemCard.FieldRow label={t('common.prefix')} value={provider.prefix} />
            {headerEntries.length > 0 && (
              <div className={ItemCard.styles.headerBadgeList}>
                {headerEntries.map(([key, value]) => (
                  <span key={key} className={ItemCard.styles.headerBadge}>
                    <strong>{key}:</strong> {value}
                  </span>
                ))}
              </div>
            )}
            <ModelCategoryBadges models={provider.models} resolvedTheme={resolvedTheme} />
            <ItemCard.FieldRow label={t('ai_providers.openai_test_model')} value={provider.testModel} />
            <ItemCard.Stats>
              <ItemCard.StatPill label={t('stats.success')} value={stats.success} variant="success" />
              <ItemCard.StatPill label={t('stats.failure')} value={stats.failure} variant="failure" />
            </ItemCard.Stats>
            <ProviderStatusBar statusData={statusData} />
          </>
        }
        actions={
          <>
            <ItemCard.ActionsMain>
              <ItemCard.UtilityActions>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(originalIndex)}
                  disabled={actionsDisabled}
                  title={t('common.edit')}
                  aria-label={t('common.edit')}
                  className={ItemCard.styles.iconButton}
                >
                  <IconPencil size={15} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(originalIndex)}
                  disabled={actionsDisabled}
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                  className={ItemCard.styles.iconButton}
                >
                  <IconTrash2 size={15} />
                </Button>
              </ItemCard.UtilityActions>
            </ItemCard.ActionsMain>
            <ItemCard.ToggleArea label={t('ai_providers.config_toggle_label')}>
              <ToggleSwitch
                checked={!providerDisabled}
                disabled={toggleDisabled}
                onChange={(value) => void onToggle(originalIndex, value)}
              />
            </ItemCard.ToggleArea>
          </>
        }
      />
    );
  };

  return (
    <>
      <div ref={sectionRef}>
        <Card
          title={renderStaticTitle()}
          extra={
            <div
              ref={topToolbarAnchorRef}
              className={shouldRenderFloatingToolbar ? styles.openaiToolbarAnchorHidden : undefined}
            >
              {renderToolbar(false)}
            </div>
          }
        >
          {loading && sortedConfigs.length === 0 ? (
            <div className="hint">{t('common.loading')}</div>
          ) : configs.length > 0 && sortedConfigs.length === 0 ? (
            <EmptyState
              title={t('ai_providers.openai_filtered_empty_title')}
              description={t('ai_providers.openai_filtered_empty_desc')}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearAllModels}
                  disabled={actionsDisabled}
                >
                  {t('ai_providers.model_search_clear')}
                </Button>
              }
            />
          ) : sortedConfigs.length === 0 ? (
            <EmptyState
              title={t('ai_providers.openai_empty_title')}
              description={t('ai_providers.openai_empty_desc')}
            />
          ) : (
            <ItemCard.Grid>{sortedConfigs.map(renderProviderCard)}</ItemCard.Grid>
          )}
        </Card>
      </div>
      {typeof document !== 'undefined' && shouldRenderFloatingToolbar
        ? createPortal(
            <div
              className={`card ${styles.openaiFloatingToolbar}`}
              style={{
                left: `${floatingToolbarStyle.left}px`,
                top: `${floatingToolbarStyle.top}px`,
                width: `${floatingToolbarStyle.width}px`,
              }}
            >
              <div className="card-header">
                <div className="title">{renderStaticTitle()}</div>
                {renderToolbar(true)}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
