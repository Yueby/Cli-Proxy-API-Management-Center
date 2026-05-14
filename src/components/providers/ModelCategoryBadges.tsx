/**
 * ModelCategoryBadges - 按类型分组显示模型 badge
 * 每个 badge 显示类型图标 + 数量，hover 弹出该类型下的所有模型名
 */

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classifyModels, type ModelInfo } from '@/utils/models';
import iconOpenaiLight from '@/assets/icons/openai-light.svg';
import iconOpenaiDark from '@/assets/icons/openai-dark.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconDeepseek from '@/assets/icons/deepseek.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconQwen from '@/assets/icons/qwen.svg';
import iconGlm from '@/assets/icons/glm.svg';
import iconMinimax from '@/assets/icons/minimax.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconMimoLight from '@/assets/icons/mimo-light.svg';
import iconMimoDark from '@/assets/icons/mimo-dark.svg';
import styles from './ModelCategoryBadges.module.scss';

const CATEGORY_ICONS: Record<string, { light: string; dark?: string }> = {
  gpt: { light: iconOpenaiLight, dark: iconOpenaiDark },
  claude: { light: iconClaude },
  gemini: { light: iconGemini },
  deepseek: { light: iconDeepseek },
  grok: { light: iconGrok },
  qwen: { light: iconQwen },
  glm: { light: iconGlm },
  minimax: { light: iconMinimax },
  kimi: { light: iconKimiLight, dark: iconKimiDark },
  mimo: { light: iconMimoLight, dark: iconMimoDark },
};

interface TooltipPosition {
  top: number;
  left: number;
}

interface ModelCategoryBadgesProps {
  models: ModelInfo[] | { name: string; alias?: string }[] | undefined | null;
  resolvedTheme?: string;
}

export function ModelCategoryBadges({ models, resolvedTheme = 'light' }: ModelCategoryBadgesProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0 });
  const badgeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const groups = useMemo(() => {
    if (!models || models.length === 0) return [];
    return classifyModels(models as ModelInfo[]);
  }, [models]);

  const handleMouseEnter = useCallback((groupId: string) => {
    const el = badgeRefs.current.get(groupId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTooltipPos({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
    setHoveredGroup(groupId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredGroup(null);
  }, []);

  // 滚动、触摸移动、点击外部时关闭 tooltip
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hoveredGroup) return;
    const dismiss = () => setHoveredGroup(null);
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHoveredGroup(null);
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
  }, [hoveredGroup]);

  const handleClick = useCallback((groupId: string) => {
    // 移动端 toggle：点击同一个关闭，点击不同的切换
    setHoveredGroup((prev) => {
      if (prev === groupId) return null;
      // 更新位置
      const el = badgeRefs.current.get(groupId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTooltipPos({
          top: rect.top,
          left: rect.left + rect.width / 2,
        });
      }
      return groupId;
    });
  }, []);

  if (groups.length === 0) return null;

  const isDark = resolvedTheme === 'dark';
  const activeGroup = hoveredGroup ? groups.find((g) => g.id === hoveredGroup) : null;

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        {groups.map((group) => {
          const iconEntry = CATEGORY_ICONS[group.id];
          const iconSrc = iconEntry
            ? (isDark && iconEntry.dark ? iconEntry.dark : iconEntry.light)
            : undefined;

          return (
            <div
              key={group.id}
              ref={(el) => { if (el) badgeRefs.current.set(group.id, el); }}
              className={`${styles.badge} ${hoveredGroup === group.id ? styles.badgeActive : ''}`}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') handleMouseEnter(group.id); }}
              onPointerLeave={(e) => { if (e.pointerType === 'mouse') handleMouseLeave(); }}
              onClick={() => handleClick(group.id)}
            >
              {iconSrc ? (
                <img src={iconSrc} alt="" className={styles.badgeIcon} />
              ) : (
                <span className={styles.badgeFallback}>{group.label.slice(0, 2)}</span>
              )}
              <span className={styles.badgeCount}>{group.items.length}</span>
            </div>
          );
        })}
      </div>

      {activeGroup && createPortal(
        <div
          className={styles.tooltip}
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className={styles.tooltipHeader}>{activeGroup.label}</div>
          <div className={styles.tooltipList}>
            {activeGroup.items.map((model) => (
              <div key={model.name} className={styles.tooltipItem}>
                <span className={styles.tooltipModelName}>{model.name}</span>
                {model.alias && model.alias !== model.name && (
                  <span className={styles.tooltipModelAlias}>→ {model.alias}</span>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
