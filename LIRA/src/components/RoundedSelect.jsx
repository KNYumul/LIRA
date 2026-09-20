import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './RoundedSelect.css';

export default function RoundedSelect({ label, value, options, onChange, disabled, placeholder, hideLabel = false, className = "", required = false, name }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const expanded = open && !disabled;
  useEffect(() => {
    if (!expanded) return;
    (root.current?.querySelector('[aria-selected="true"]') || root.current?.querySelector('[role="option"]'))?.focus();
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [expanded]);
  return (
    <div className={`rounded-select ${className}`} ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      {(required || name) && <select className="rounded-select-native" name={name} value={value} required={required} disabled={disabled}
        tabIndex={-1} aria-hidden="true" onChange={event => onChange(event.target.value)}
        onInvalid={event => { event.preventDefault(); trigger.current?.focus(); setOpen(true); }}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>}
      <span id={`${id}-label`} className={`rounded-select-label${hideLabel ? " rounded-select-hidden" : ""}`}>{label}</span>
      <button ref={trigger} type="button" className="rounded-select-trigger"
        aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox"
        aria-expanded={expanded} aria-controls={expanded ? id : undefined} disabled={disabled}
        onClick={() => setOpen(!open)} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}>
        <span id={`${id}-value`}>{options.find((option) => option.value === value)?.label || placeholder}</span>
        <ChevronDown size={14} className={expanded ? 'is-open' : ''} />
      </button>
      {expanded && <div id={id} role="listbox" aria-required={required || undefined} aria-labelledby={`${id}-label`} className="rounded-select-menu"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
          }
          const items = Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
          const index = items.indexOf(document.activeElement);
          const next = { ArrowDown: (index + 1) % items.length, ArrowUp: (index - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[event.key];
          if (next !== undefined) {
            event.preventDefault();
            items[next]?.focus();
          }
        }}>
        {options.map((option) => <button key={option.value} type="button" role="option"
          aria-selected={option.value === value} tabIndex={option.value === value ? 0 : -1}
          className="rounded-select-option" onClick={() => {
            onChange(option.value);
            setOpen(false);
            trigger.current?.focus();
          }}>{option.label}</button>)}
      </div>}
    </div>
  );
}
