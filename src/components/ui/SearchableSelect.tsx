"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption { value: string; label: string; detail?: string }
type Props = { label: string; value: string; options: readonly SelectOption[]; onChange: (value: string) => void; disabled?: boolean };

/** Searchable single select with keyboard navigation and a native focusable trigger. */
export function SearchableSelect({ label, value, options, onChange, disabled = false }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => `${option.label} ${option.detail ?? ""} ${option.value}`.toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => Number(!a.label.toLocaleLowerCase().startsWith(normalizedQuery)) - Number(!b.label.toLocaleLowerCase().startsWith(normalizedQuery)));
  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function show() { setQuery(""); setActive(0); setOpen(true); }
  function close() { setOpen(false); trigger.current?.focus(); }
  function choose(option: SelectOption) { onChange(option.value); close(); }
  function navigate(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(0, Math.min(filtered.length - 1, activeIndex + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter") { event.preventDefault(); if (filtered[activeIndex]) choose(filtered[activeIndex]); }
  }

  return <div className="searchable-select" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="field-label">{label}</span>
    <button ref={trigger} type="button" className="select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} disabled={disabled}
      onClick={() => open ? close() : show()} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); show(); } if (event.key === "Escape") close(); }}>
      <span id={`${id}-value`}>{selected?.label ?? `Choose ${label.toLowerCase()}`}</span><ChevronDown size={17} aria-hidden="true" />
    </button>
    {open ? <div className="select-popover">
      <div className="select-search"><Search size={17} aria-hidden="true" /><input ref={search} role="combobox" aria-label={`Search ${label.toLowerCase()}`} aria-expanded="true" aria-autocomplete="list" aria-controls={`${id}-options`} aria-activedescendant={filtered.length ? `${id}-option-${activeIndex}` : undefined} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={navigate} /></div>
      <ul id={`${id}-options`} role="listbox" aria-label={label} tabIndex={-1} className="select-options">
        {filtered.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value} className={`select-option ${index === activeIndex ? "active" : ""}`}
          ref={(node) => { if (index === activeIndex) node?.scrollIntoView({ block: "nearest" }); }} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
          <span>{option.label}{option.detail ? <small>{option.detail}</small> : null}</span>{option.value === value ? <Check size={16} aria-hidden="true" /> : null}
        </li>)}
      </ul>
      {!filtered.length ? <p className="select-empty" role="status">No matches. Try another search.</p> : null}
    </div> : null}
  </div>;
}
