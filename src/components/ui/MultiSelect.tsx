import { useEffect, useId, useRef, useState } from 'react';
import { IconChevronDown } from './icons';
import { SelectionCheckbox } from './SelectionCheckbox';
import styles from './MultiSelect.module.scss';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  values: ReadonlyArray<string>;
  options: ReadonlyArray<MultiSelectOption>;
  onChange: (values: string[]) => void;
  summary: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  values,
  options,
  onChange,
  summary,
  ariaLabel,
  disabled = false,
  className,
}: MultiSelectProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = new Set(values);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleValue = (value: string, checked: boolean) => {
    const next = new Set(values);
    if (checked) next.add(value);
    else next.delete(value);
    onChange(options.map((option) => option.value).filter((optionValue) => next.has(optionValue)));
  };

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`.trim()}>
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-label={ariaLabel ?? summary}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.summary}>{summary}</span>
        {values.length > 0 && <span className={styles.count}>{values.length}</span>}
        <IconChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} size={16} />
      </button>

      {open && !disabled && (
        <div
          id={listboxId}
          className={styles.dropdown}
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel ?? summary}
        >
          {options.map((option) => (
            <div key={option.value} className={styles.option} role="option" aria-selected={selected.has(option.value)}>
              <SelectionCheckbox
                checked={selected.has(option.value)}
                onChange={(checked) => toggleValue(option.value, checked)}
                label={option.label}
                ariaLabel={option.label}
                className={styles.checkbox}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
