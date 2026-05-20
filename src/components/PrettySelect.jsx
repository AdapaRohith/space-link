import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function PrettySelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchable = false,
  searchPlaceholder = 'Search...',
  className = '',
  compactCode = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const handlePointerDown = event => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open, searchable]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(option => {
      const haystack = [
        option.label,
        option.value,
        option.code,
        option.meta,
        option.searchText,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  const choose = option => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div className={`pretty-select ${open ? 'open' : ''} ${className}`} ref={ref}>
      <button
        type="button"
        className="pretty-select-trigger"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'pretty-select-value' : 'pretty-select-placeholder'}>
          {selected ? (
            <>
              {selected.code && <strong>{selected.code}</strong>}
              {!compactCode && <span>{selected.label}</span>}
            </>
          ) : placeholder}
        </span>
        <ChevronDown size={16} className="pretty-select-chevron" />
      </button>

      {open && (
        <div className="pretty-select-menu">
          {searchable && (
            <div className="pretty-select-search">
              <Search size={14} />
              <input
                ref={searchRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          <div className="pretty-select-list" role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <button
                type="button"
                key={`${option.value}-${option.label}`}
                className={`pretty-select-option ${option.value === value ? 'selected' : ''}`}
                onClick={() => choose(option)}
                role="option"
                aria-selected={option.value === value}
              >
                <span>
                  {option.code && <strong>{option.code}</strong>}
                  <span>{option.label}</span>
                </span>
                {option.value === value && <Check size={15} />}
              </button>
            )) : (
              <div className="pretty-select-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
