import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Natural Alphanumeric & Date Sort Helper
 * Handles REQ1, REQ2, REQ10 properly instead of standard string order.
 */
export const naturalSort = (dataArray, sortField, sortOrder = 'asc') => {
  if (!sortField || !Array.isArray(dataArray)) return dataArray || [];

  return [...dataArray].sort((a, b) => {
    let valA = a?.[sortField];
    let valB = b?.[sortField];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    let comparison = 0;

    if (typeof valA === 'number' && typeof valB === 'number') {
      comparison = valA - valB;
    } else {
      const strA = String(valA);
      const strB = String(valB);
      comparison = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

export const SortControl = ({
  options = [],
  sortField,
  onSortFieldChange,
  sortOrder = 'asc',
  onSortOrderChange,
  className = ""
}) => {
  if (!options || options.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap min-w-0 ${className}`}>
      {/* Field Selector */}
      <div className="flex items-center gap-1.5 tactile-pill px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 min-w-0 shrink-0">
        <ArrowUpDown size={14} className="text-blue-600 shrink-0" />
        <span className="text-[11px] font-mono text-slate-400 uppercase shrink-0">Sort By:</span>
        <select
          value={sortField || ''}
          onChange={(e) => onSortFieldChange(e.target.value)}
          className="bg-transparent border-0 outline-none text-xs font-bold text-slate-800 cursor-pointer pr-1 max-w-[130px] sm:max-w-[170px] truncate"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-sans">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Order Toggle Button */}
      <button
        type="button"
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="tactile-pill px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 tactile-btn shrink-0 whitespace-nowrap"
        title={`Click to change to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
      >
        {sortOrder === 'asc' ? (
          <>
            <ArrowUp size={14} className="text-emerald-600 shrink-0" />
            <span>Ascending</span>
          </>
        ) : (
          <>
            <ArrowDown size={14} className="text-amber-600 shrink-0" />
            <span>Descending</span>
          </>
        )}
      </button>
    </div>
  );
};
