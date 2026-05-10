import { Input } from './Input';
import { IconSearch, IconX } from './icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rightElement={
        value ? (
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              border: 'none',
              background: 'var(--bg-tertiary)',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 0,
            }}
            onClick={() => onChange('')}
            title="Clear"
            aria-label="Clear"
          >
            <IconX size={12} />
          </button>
        ) : (
          <IconSearch size={14} style={{ color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        )
      }
    />
  );
}
