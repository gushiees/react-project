import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SearchBar.css";

/**
 * Debounce helper
 */
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Reusable SearchBar
 *
 * Props:
 * - placeholder: string
 * - suggestions: string[]                 // for autocomplete (e.g., product names)
 * - categories?: string[]                 // optional category list
 * - minPrice?: number                     // display hint
 * - maxPrice?: number                     // display hint
 * - initialState?: { query, sort, priceMin, priceMax, category }
 * - onChange: (state) => void             // debounced change events
 * - onSubmit?: (state) => void            // when user presses Enter or clicks Search
 * - showCategory?: boolean
 * - showPrice?: boolean
 * - showSort?: boolean
 */
export default function SearchBar({
  placeholder = "Search products…",
  suggestions = [],
  categories = [],
  minPrice,
  maxPrice,
  initialState = {},
  onChange,
  onSubmit,
  showCategory = true,
  showPrice = true,
  showSort = true,
}) {
  const [state, setState] = useState({
    query: "",
    sort: "relevance",
    priceMin: "",
    priceMax: "",
    category: "",
    ...initialState,
  });

  // Autocomplete UI
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const debouncedState = useDebounce(state, 300);

  useEffect(() => {
    onChange?.(normalizeState(debouncedState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedState]);

  // Filter suggestions by current query
  const filteredSuggestions = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    return suggestions
      .filter((s) => s && s.toLowerCase().includes(q))
      .filter((s) => {
        const k = s.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }, [suggestions, state.query]);

  useEffect(() => {
    // Close the menu when clicking outside
    const onDocClick = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function normalizeState(s) {
    const priceMin =
      s.priceMin === "" || s.priceMin === null ? null : Number(s.priceMin);
    const priceMax =
      s.priceMax === "" || s.priceMax === null ? null : Number(s.priceMax);
    return {
      query: s.query.trim(),
      sort: s.sort,
      priceMin: isNaN(priceMin) ? null : priceMin,
      priceMax: isNaN(priceMax) ? null : priceMax,
      category: s.category || "",
    };
  }

  function handleInput(e) {
    setState((prev) => ({ ...prev, query: e.target.value }));
    setOpen(true);
  }

  function chooseSuggestion(s) {
    setState((prev) => ({ ...prev, query: s }));
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (!open) {
      if (e.key === "Enter") {
        onSubmit?.(normalizeState(state));
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) =>
        filteredSuggestions.length ? (h + 1) % filteredSuggestions.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) =>
        filteredSuggestions.length
          ? (h - 1 + filteredSuggestions.length) % filteredSuggestions.length
          : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSuggestions[highlight]) {
        chooseSuggestion(filteredSuggestions[highlight]);
      } else {
        onSubmit?.(normalizeState(state));
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function clearAll() {
    const reset = {
      query: "",
      sort: "relevance",
      priceMin: "",
      priceMax: "",
      category: "",
    };
    setState(reset);
    onChange?.(normalizeState(reset));
  }

  return (
    <div className="sb__wrap">
      <div className="sb__row">
        <div className="sb__search">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={state.query}
            onChange={handleInput}
            onFocus={() => state.query && setOpen(true)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="sb-suggestions"
          />
          <button
            className="sb__searchBtn"
            onClick={() => onSubmit?.(normalizeState(state))}
            aria-label="Search"
          >
            🔍
          </button>

          {open && filteredSuggestions.length > 0 && (
            <ul
              id="sb-suggestions"
              className="sb__suggestions"
              ref={menuRef}
              role="listbox"
            >
              {filteredSuggestions.map((s, i) => (
                <li
                  key={s + i}
                  className={i === highlight ? "active" : ""}
                  onMouseDown={() => chooseSuggestion(s)}
                  role="option"
                  aria-selected={i === highlight}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showSort && (
          <div className="sb__field">
            <label>Sort</label>
            <select
              value={state.sort}
              onChange={(e) =>
                setState((prev) => ({ ...prev, sort: e.target.value }))
              }
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="name_asc">Name: A → Z</option>
              <option value="name_desc">Name: Z → A</option>
            </select>
          </div>
        )}

        {showCategory && categories?.length > 0 && (
          <div className="sb__field">
            <label>Category</label>
            <select
              value={state.category}
              onChange={(e) =>
                setState((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPrice && (
          <div className="sb__price">
            <label>Price</label>
            <div className="sb__priceRow">
              <input
                type="number"
                inputMode="decimal"
                placeholder={minPrice != null ? `${minPrice}` : "Min"}
                value={state.priceMin}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, priceMin: e.target.value }))
                }
              />
              <span className="sb__dash">—</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={maxPrice != null ? `${maxPrice}` : "Max"}
                value={state.priceMax}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, priceMax: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        <button className="sb__clear" onClick={clearAll} type="button">
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * Helper you can reuse when applying sort to arrays
 * (kept here for convenience; you can move it to /utils)
 */
export function sortRecords(arr, sortKey) {
  const a = [...arr];
  if (sortKey === "price_asc") a.sort((x, y) => +x.price - +y.price);
  else if (sortKey === "price_desc") a.sort((x, y) => +y.price - +x.price);
  else if (sortKey === "name_asc")
    a.sort((x, y) => String(x.name).localeCompare(String(y.name)));
  else if (sortKey === "name_desc")
    a.sort((x, y) => String(y.name).localeCompare(String(x.name))).reverse();
  return a;
}
