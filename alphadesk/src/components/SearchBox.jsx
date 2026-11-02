import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon, go, stockPath } from './ui.jsx';

/** Ticker / company search with keyboard navigation. Press "/" to focus. */
export default function SearchBox({ onPick, placeholder = 'Search any ticker or company…', autoFocus = false }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef(null);
  const box = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) { setItems([]); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await api(`/api/search?q=${encodeURIComponent(query)}`);
        setItems(res);
        setActive(0);
      } catch { setItems([]); }
      setLoading(false);
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  const pick = (it) => {
    setOpen(false);
    setQ('');
    input.current?.blur();
    if (onPick) onPick(it);
    else go(stockPath(it.symbol));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      if (items[active]) pick(items[active]);
      else if (q.trim()) pick({ symbol: q.trim().toUpperCase(), name: q.trim().toUpperCase() });
    } else if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
  };

  return (
    <div className="search" ref={box}>
      <span className="s-icon"><Icon name="search" size={16} /></span>
      <input
        ref={input}
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Search stocks"
        spellCheck={false}
      />
      {!q && <kbd>/</kbd>}
      {open && q.trim() && (
        <div className="search-pop" role="listbox">
          {items.map((it, i) => (
            <div key={it.symbol} className={`search-item ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(it); }} role="option" aria-selected={i === active}>
              <span className="sym">{it.symbol}</span>
              <span className="nm">{it.name}</span>
              <span className="tp">{it.type}</span>
            </div>
          ))}
          {!items.length && <div className="search-empty">{loading ? 'Searching…' : <>No matches. Press <b>Enter</b> to open “{q.trim().toUpperCase()}”.</>}</div>}
        </div>
      )}
    </div>
  );
}
