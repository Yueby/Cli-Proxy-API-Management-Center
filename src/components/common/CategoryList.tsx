import type { RefObject } from 'react';
import { IconAlertTriangle } from '@/components/ui/icons';

export interface CategoryItem {
  id: string;
  label: string;
  icon?: string;
  fallback?: string;
  customIcon?: React.ReactNode;
  count?: number;
  hasIssue?: boolean;
  countAmberIfZero?: boolean;
  invertOnDark?: boolean;
}

interface CategoryListProps {
  listRef?: RefObject<HTMLDivElement | null>;
  items: CategoryItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  buttonStyles?: (item: CategoryItem) => React.CSSProperties;
}

export function CategoryList({
  listRef,
  items,
  activeId,
  onSelect,
  className = '',
  buttonStyles,
}: CategoryListProps) {
  return (
    <div className={`${styles_container(className)}`.trim()}>
      <div className={styles_list()} ref={listRef} role="tablist">
        {items.map((item) => {
          const isActive = item.id === activeId;
          const style = buttonStyles ? buttonStyles(item) : undefined;
          const itemClass = `category-item ${isActive ? 'category-item-active' : ''}`.trim();

          return (
            <button
              key={item.id}
              type="button"
              className={itemClass}
              onClick={() => onSelect(item.id)}
              role="tab"
              aria-selected={isActive}
              data-tab-id={item.id}
              style={style}
            >
              <span className="category-item-left">
                {item.customIcon ? (
                  item.customIcon
                ) : item.icon ? (
                  <img
                    src={item.icon}
                    alt=""
                    aria-hidden="true"
                    className={`category-item-icon ${item.invertOnDark ? 'category-item-icon-invert' : ''}`.trim()}
                  />
                ) : item.fallback ? (
                  <span className="category-item-fallback">{item.fallback}</span>
                ) : null}
                <span className="category-item-title">{item.label}</span>
              </span>
              {item.hasIssue ? (
                <IconAlertTriangle
                  size={14}
                  style={{ color: 'var(--amber-text)', flexShrink: 0, marginLeft: 4 }}
                />
              ) : item.count !== undefined ? (
                <span
                  className={`category-item-badge ${
                    item.countAmberIfZero && item.count === 0 ? 'category-item-badge-amber' : ''
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Inline CSS class helper to bind styles cleanly
import styles from './CategoryList.module.scss';

function styles_container(custom = '') {
  return `${styles.container} ${custom}`.trim();
}

function styles_list() {
  return styles.list;
}
