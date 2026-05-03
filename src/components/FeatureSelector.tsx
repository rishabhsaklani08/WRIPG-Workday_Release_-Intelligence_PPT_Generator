'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WorkdayFeature } from '@/types';

interface Props {
  features: WorkdayFeature[];
  loading: boolean;
  selectedIds: string[];
  availableReleases: string[];
  availableDomains: string[];
  currentRelease: string;
  onReleaseChange: (rv: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onConfigure: () => void;
}

const PAGE_SIZE = 30;
type Complexity = 'All' | 'Setup Required' | 'Automatically Available';

// ─── Feature Detail Modal ─────────────────────────────────────────────────────
function FeatureModal({ feature, onClose, isSelected, onToggle }: {
  feature: WorkdayFeature;
  onClose: () => void;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-deep)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32, maxWidth: 680, width: '100%',
          maxHeight: '88vh', overflowY: 'auto', position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className={`domain-badge domain-${feature.domain.replace(/\s/g, '_')}`}>{feature.domain}</span>
          <span className={`complexity-pill complexity-${feature.complexity.replace(/\s/g, '_')}`}>{feature.complexity}</span>
          {feature.optIn && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(244,161,36,0.15)', color: '#fbbf24', fontWeight: 600 }}>Opt-In Required</span>}
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontWeight: 500 }}>{feature.id}</span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4 }}>
          {feature.title}
        </h2>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
          {feature.productionDate && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Go-Live</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📅 {feature.productionDate}</div>
            </div>
          )}
          {feature.setupEffort && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Setup Effort</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{feature.setupEffort}</div>
            </div>
          )}
          {feature.tenant && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Tenant</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{feature.tenant}</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

        {/* Description */}
        {feature.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.description}</p>
          </div>
        )}

        {/* Detail */}
        {feature.detail && feature.detail !== feature.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Full Detail</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.detail}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onToggle}
            className={isSelected ? 'btn-secondary' : 'btn-primary'}
            style={{ flex: 1 }}
          >
            {isSelected ? '✓ Selected for deck — Click to remove' : '+ Add to presentation deck'}
          </button>
          {feature.documentationUrl && (
            <a href={feature.documentationUrl} target="_blank" rel="noreferrer"
              style={{
                padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--primary-light)',
                fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
              Docs ↗
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeatureSelector({
  features, loading, selectedIds, availableReleases, availableDomains,
  currentRelease, onReleaseChange, onSelectionChange, onConfigure
}: Props) {
  const [activeDomain, setActiveDomain] = useState('All');
  const [activeComplexity, setActiveComplexity] = useState<Complexity>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalFeature, setModalFeature] = useState<WorkdayFeature | null>(null);

  const filtered = useMemo(() => {
    return features.filter(f => {
      const matchDomain = activeDomain === 'All' || f.domain === activeDomain;
      const matchComplexity = activeComplexity === 'All' || f.complexity === activeComplexity;
      const matchSearch = !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
      return matchDomain && matchComplexity && matchSearch;
    });
  }, [features, activeDomain, activeComplexity, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [filtered.length]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const toggle = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filtered.map(f => f.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter(id => !ids.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...ids])]);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(f => selectedIds.includes(f.id));

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = { All: features.length };
    for (const f of features) map[f.domain] = (map[f.domain] || 0) + 1;
    return map;
  }, [features]);

  const complexityCounts = useMemo(() => {
    const domainFiltered = activeDomain === 'All' ? features : features.filter(f => f.domain === activeDomain);
    const map: Record<string, number> = { All: domainFiltered.length, 'Setup Required': 0, 'Automatically Available': 0 };
    for (const f of domainFiltered) map[f.complexity] = (map[f.complexity] || 0) + 1;
    return map;
  }, [features, activeDomain]);

  const domains = ['All', ...availableDomains.filter(d => (domainCounts[d] || 0) > 0)];
  const complexities: Complexity[] = ['All', 'Setup Required', 'Automatically Available'];
  const complexityColors: Record<Complexity, string> = {
    All: 'var(--primary)', 'Setup Required': '#e85555', 'Automatically Available': '#00c17c',
  };

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 160, height: 38, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 240, height: 38, borderRadius: 10 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 80, height: 32, borderRadius: 8 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 16, height: 140 }}>
              <div className="skeleton" style={{ width: '55%', marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '30%', height: 12, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '95%', height: 12 }} />
              <div className="skeleton" style={{ width: '80%', height: 12, marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Feature Detail Modal */}
      {modalFeature && (
        <FeatureModal
          feature={modalFeature}
          isSelected={selectedIds.includes(modalFeature.id)}
          onClose={() => setModalFeature(null)}
          onToggle={() => { toggle(modalFeature.id); setModalFeature(null); }}
        />
      )}

      {/* ── STICKY TOOLBAR ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 100,
        background: 'rgba(10,10,20,0.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 16, padding: '10px 0',
      }}>
        {/* Row 1: Release + Search + Configure button */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Release:</span>
            <select
              className="field-input"
              style={{ width: 160 }}
              value={currentRelease}
              onChange={e => { setActiveDomain('All'); setActiveComplexity('All'); onReleaseChange(e.target.value); }}
            >
              {availableReleases.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <span className="search-icon" style={{ fontSize: 14 }}>🔍</span>
            <input
              type="text"
              className="field-input"
              placeholder="Search features…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Stats */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>
            {features.length.toLocaleString()} features in release
          </div>

          {/* ── Configure button pinned here ── */}
          <button
            className="btn-primary"
            disabled={selectedIds.length === 0}
            onClick={onConfigure}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Configure Presentation →
            {selectedIds.length > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '1px 8px', fontSize: 12 }}>
                {selectedIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Domain tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {domains.map(d => (
            <button key={d} onClick={() => { setActiveDomain(d); setPage(1); }}
              style={{
                padding: '5px 12px', borderRadius: 8, border: '1px solid',
                borderColor: activeDomain === d ? 'var(--primary)' : 'var(--border)',
                background: activeDomain === d ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: activeDomain === d ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {d}
              <span style={{ opacity: 0.6, fontSize: 10 }}>{domainCounts[d] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Row 3: Complexity filter + selection bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Complexity pills */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Complexity:</span>
            {complexities.map(c => (
              <button key={c} onClick={() => { setActiveComplexity(c); setPage(1); }}
                style={{
                  padding: '3px 10px', borderRadius: 99, border: '1px solid',
                  borderColor: activeComplexity === c ? complexityColors[c] : 'var(--border)',
                  background: activeComplexity === c ? `${complexityColors[c]}22` : 'transparent',
                  color: activeComplexity === c ? complexityColors[c] : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {c}
                <span style={{ opacity: 0.6, fontSize: 9 }}>{complexityCounts[c] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Selection info */}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            {filtered.length.toLocaleString()} shown
            {selectedIds.length > 0 && (
              <span style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 99, background: 'rgba(59,130,246,0.12)', color: 'var(--primary-light)', fontSize: 12, fontWeight: 600 }}>
                {selectedIds.length} selected
              </span>
            )}
          </span>

          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedIds.length > 0 && (
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => onSelectionChange([])}>
                  Clear all
                </button>
              )}
              <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={selectAllFiltered}>
                {allFilteredSelected ? '☐ Deselect filtered' : '☑ Select filtered'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE CARD GRID ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No features found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search, domain or complexity filter</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {paginated.map(f => {
              const isSelected = selectedIds.includes(f.id);
              return (
                <div
                  key={f.id}
                  className={`feature-card ${isSelected ? 'selected' : ''}`}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {/* Click area: checkbox toggle (small target, top-right) */}
                  <div
                    style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                    onClick={e => { e.stopPropagation(); toggle(f.id); }}
                  >
                    <div className={`check-box ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>

                  {/* Main card body: opens modal */}
                  <div onClick={() => setModalFeature(f)}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center', paddingRight: 32 }}>
                      <span className={`domain-badge domain-${f.domain.replace(/\s/g, '_')}`}>{f.domain}</span>
                      <span className={`complexity-pill complexity-${f.complexity.replace(/\s/g, '_')}`}>{f.complexity}</span>
                      {f.optIn && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(244,161,36,0.12)', color: '#fbbf24', fontWeight: 600 }}>Opt-In</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: 8, paddingRight: 32 }}>
                      {f.title}
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {f.description}
                    </p>
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.id}</span>
                      {f.productionDate && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📅 {f.productionDate}</span>}
                      <span style={{ fontSize: 10, color: 'var(--primary-light)', marginLeft: 'auto' }}>Click to expand ↗</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setPage(p => p + 1)}>
                Load more ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
