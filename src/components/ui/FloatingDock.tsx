/**
 * FloatingDock - 统一的底部浮动操作栏组件
 *
 * 用于 ConfigPage、AI Provider 编辑页、以及任何需要底部固定操作栏的场景。
 * 特性：glassmorphism 背景、圆形按钮、safe-area 适配、portal 渲染。
 *
 * 使用方式：
 *   <FloatingDock>
 *     <FloatingDock.Status className={statusClass}>{statusText}</FloatingDock.Status>
 *     <FloatingDock.Button onClick={reload} title="Reload"><IconRefreshCw size={16} /></FloatingDock.Button>
 *     <FloatingDock.Button onClick={save} title="Save"><IconCheck size={16} /></FloatingDock.Button>
 *   </FloatingDock>
 */

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingDock.module.scss';

// ─── Types ──────────────────────────────────

export interface FloatingDockProps {
  /** 是否渲染（通常绑定 isCurrentLayer） */
  visible?: boolean;
  /** 高度变化时设置的 CSS 变量名（用于页面底部 padding） */
  heightVar?: string;
  children: ReactNode;
}

// ─── Main Component ─────────────────────────

export const FloatingDock = Object.assign(
  forwardRef<HTMLDivElement, FloatingDockProps>(function FloatingDock(
    { visible = true, heightVar, children },
    forwardedRef
  ) {
    const internalRef = useRef<HTMLDivElement>(null);
    const surfaceRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    useLayoutEffect(() => {
      if (!visible || !heightVar) return;

      const el = (surfaceRef as React.RefObject<HTMLDivElement>).current;
      if (!el) return;

      const updateHeight = () => {
        const height = el.getBoundingClientRect().height;
        document.documentElement.style.setProperty(heightVar, `${height}px`);
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);
      const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight);
      ro?.observe(el);

      return () => {
        ro?.disconnect();
        window.removeEventListener('resize', updateHeight);
        document.documentElement.style.removeProperty(heightVar);
      };
    }, [visible, heightVar, surfaceRef]);

    if (!visible || typeof document === 'undefined') return null;

    return createPortal(
      <div className={styles.container}>
        <div className={styles.surface} ref={surfaceRef as React.Ref<HTMLDivElement>}>
          {children}
        </div>
      </div>,
      document.body
    );
  }),
  {
    /** 圆形图标按钮 */
    Button: forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
      function DockButton({ className, children, ...props }, ref) {
        const cls = [styles.actionButton, className].filter(Boolean).join(' ');
        return (
          <button type="button" ref={ref} className={cls} {...props}>
            {children}
          </button>
        );
      }
    ),

    /** 状态文字 badge */
    Status: function DockStatus({
      className,
      children,
      ...props
    }: HTMLAttributes<HTMLDivElement>) {
      const cls = [styles.statusBadge, className].filter(Boolean).join(' ');
      return (
        <div className={cls} {...props}>
          {children}
        </div>
      );
    },

    /** 脏标记圆点（放在 Button 内部） */
    DirtyDot: function DockDirtyDot() {
      return <span className={styles.dirtyDot} aria-hidden="true" />;
    },

    styles,
  }
);
