/**
 * ItemCard - 统一卡片组件
 *
 * 结构: Header → Content → Actions (竖排)
 * 基于 AuthFiles 卡片设计，适用于 AI Providers 和 Auth Files 等列表页面。
 *
 * 使用方式:
 *   <ItemCard
 *     avatar={...}
 *     title="..."
 *     badges={...}
 *     content={...}
 *     actions={...}
 *   />
 *
 * 或使用子组件组合:
 *   <ItemCard.Root>
 *     <ItemCard.Header>...</ItemCard.Header>
 *     <ItemCard.Content>...</ItemCard.Content>
 *     <ItemCard.Actions>...</ItemCard.Actions>
 *   </ItemCard.Root>
 */

import type { CSSProperties, ReactNode } from 'react';
import styles from './ItemCard.module.scss';

// ─── Types ──────────────────────────────────

export interface ItemCardAvatarProps {
  /** 图标 URL */
  icon?: string;
  /** 无图标时的 fallback 文字（通常取首字母） */
  fallback?: string;
  /** 背景色 */
  bgColor?: string;
  /** 文字/图标颜色 */
  textColor?: string;
  /** 边框样式 */
  border?: string;
}

export interface ItemCardBadge {
  label: string;
  variant?: 'active' | 'warning' | 'disabled' | 'custom';
  style?: CSSProperties;
  className?: string;
}

export interface ItemCardProps {
  /** 头像配置 */
  avatar?: ItemCardAvatarProps;
  /** 卡片标题 */
  title?: string;
  /** 副标题/描述 */
  subtitle?: ReactNode;
  /** 徽章列表 */
  badges?: ItemCardBadge[];
  /** Header 右侧额外内容（如优先级 badge） */
  headerExtra?: ReactNode;
  /** 选中状态 */
  selected?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 内容区（Header 和 Actions 之间） */
  content?: ReactNode;
  /** 操作区 */
  actions?: ReactNode;
  /** 选择框（渲染在头像左侧） */
  selection?: ReactNode;
  /** 额外的 className */
  className?: string;
  /** 额外的 style */
  style?: CSSProperties;
}

// ─── Sub-components ─────────────────────────

/** 卡片根容器 */
function Root({
  selected,
  disabled,
  compact,
  className,
  style,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const cls = [
    styles.card,
    selected && styles.cardSelected,
    disabled && styles.cardDisabled,
    compact && styles.cardCompact,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

/** 卡片头部区域 */
function Header({ children }: { children: ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}

/** 卡片内容区域 */
function Content({ children }: { children: ReactNode }) {
  return <div className={styles.content}>{children}</div>;
}

/** 卡片操作区域 */
function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** 操作区主按钮组 */
function ActionsMain({ children }: { children: ReactNode }) {
  return <div className={styles.actionsMain}>{children}</div>;
}

/** 工具按钮组（带背景） */
function UtilityActions({ children }: { children: ReactNode }) {
  return <div className={styles.utilityActions}>{children}</div>;
}

/** 开关区域 */
function ToggleArea({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.toggleArea}>
      {label && <span className={styles.toggleLabel}>{label}</span>}
      {children}
    </div>
  );
}

/** 元数据展示 */
function Meta({ children }: { children: ReactNode }) {
  return <div className={styles.meta}>{children}</div>;
}

/** 单个元数据项 */
function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

/** 字段行（label: value 格式，适合 Provider 卡片） */
function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | undefined | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}:</span>
      <span className={styles.fieldValue}>{String(value)}</span>
    </div>
  );
}

/** 统计 pills */
function Stats({ children }: { children: ReactNode }) {
  return <div className={styles.stats}>{children}</div>;
}

/** 单个统计 pill */
function StatPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number | string;
  variant: 'success' | 'failure';
}) {
  const cls = [
    styles.statPill,
    variant === 'success' ? styles.statSuccess : styles.statFailure,
  ].join(' ');

  return (
    <div className={cls}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

/** 卡片网格容器 */
function Grid({
  compact,
  wide,
  className,
  children,
}: {
  compact?: boolean;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = [
    styles.grid,
    compact && styles.gridCompact,
    wide && styles.gridWide,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={cls}>{children}</div>;
}

// ─── Main Component ─────────────────────────

/**
 * 统一卡片组件 - 快捷用法
 *
 * 自动组装 Header → Content → Actions 结构。
 * 如需更灵活的布局，使用 ItemCard.Root / Header / Content / Actions 子组件。
 */
export function ItemCard({
  avatar,
  title,
  subtitle,
  badges,
  headerExtra,
  selected,
  disabled,
  compact,
  content,
  actions,
  selection,
  className,
  style,
}: ItemCardProps) {
  return (
    <Root
      selected={selected}
      disabled={disabled}
      compact={compact}
      className={className}
      style={style}
    >
      <div className={styles.layout}>
        {/* Header */}
        <div className={styles.header}>
          {selection && <div className={styles.selection}>{selection}</div>}
          {avatar && (
            <div
              className={`${styles.avatar} ${avatar.bgColor === 'transparent' ? styles.avatarNoBg : ''}`}
              style={{
                backgroundColor: avatar.bgColor,
                color: avatar.textColor,
                ...(avatar.border ? { border: avatar.border } : {}),
              }}
            >
              {avatar.icon ? (
                <img src={avatar.icon} alt="" className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarFallback}>
                  {avatar.fallback || '?'}
                </span>
              )}
            </div>
          )}
          <div className={styles.headerContent}>
            {badges && badges.length > 0 && (
              <div className={styles.badgeRow}>
                {badges.map((badge, i) => {
                  if (badge.variant === 'custom') {
                    return (
                      <span
                        key={i}
                        className={`${styles.typeBadge} ${badge.className || ''}`}
                        style={badge.style}
                      >
                        {badge.label}
                      </span>
                    );
                  }
                  const badgeClass =
                    badge.variant === 'active'
                      ? styles.stateBadgeActive
                      : badge.variant === 'warning'
                        ? styles.stateBadgeWarning
                        : badge.variant === 'disabled'
                          ? styles.stateBadgeDisabled
                          : '';
                  return (
                    <span
                      key={i}
                      className={`${styles.stateBadge} ${badgeClass}`}
                      style={badge.style}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}
            {title && (
              <span className={styles.title} title={title}>
                {title}
              </span>
            )}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {headerExtra && <div className={styles.headerExtra}>{headerExtra}</div>}
        </div>

        {/* Content */}
        {content && <div className={styles.content}>{content}</div>}

        {/* Actions */}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </Root>
  );
}

// ─── Attach sub-components ──────────────────

ItemCard.Root = Root;
ItemCard.Header = Header;
ItemCard.Content = Content;
ItemCard.Actions = Actions;
ItemCard.ActionsMain = ActionsMain;
ItemCard.UtilityActions = UtilityActions;
ItemCard.ToggleArea = ToggleArea;
ItemCard.Meta = Meta;
ItemCard.MetaItem = MetaItem;
ItemCard.FieldRow = FieldRow;
ItemCard.Stats = Stats;
ItemCard.StatPill = StatPill;
ItemCard.Grid = Grid;
ItemCard.styles = styles;
