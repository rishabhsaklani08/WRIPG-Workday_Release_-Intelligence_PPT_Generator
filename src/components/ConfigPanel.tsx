'use client';

import { AudienceMode } from '@/types';

const AUDIENCE_MODES: { key: AudienceMode; label: string; icon: string; desc: string }[] = [
  { key: 'consultant', label: 'Consultant',  icon: '🔧', desc: 'Technical config detail, integration impacts, tenant setup' },
  { key: 'executive',  label: 'Executive',   icon: '📊', desc: 'ROI, strategic value, risk mitigation, C-suite language' },
  { key: 'admin',      label: 'Admin',       icon: '⚙️', desc: 'Security domains, BPs, testing, day-to-day management' },
];

interface Props {
  clientName: string;
  audienceMode: AudienceMode;
  releaseVersion: string;
  availableReleases: string[];
  selectedCount: number;
  generating: boolean;
  onClientNameChange: (v: string) => void;
  onAudienceModeChange: (v: AudienceMode) => void;
  onReleaseVersionChange: (v: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export default function ConfigPanel({
  clientName, audienceMode, releaseVersion, availableReleases, selectedCount, generating,
  onClientNameChange, onAudienceModeChange, onReleaseVersionChange, onBack, onGenerate
}: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>
        Configure your deck
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
        You've selected <strong style={{ color: 'var(--primary-light)' }}>{selectedCount} feature{selectedCount !== 1 ? 's' : ''}</strong>.
        Tell us how to tailor the presentation.
      </p>

      <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
        {/* Client Name */}
        <div style={{ marginBottom: 20 }}>
          <label className="field-label" htmlFor="clientName">Client / Organisation Name</label>
          <input
            id="clientName"
            type="text"
            className="field-input"
            placeholder="e.g. Acme Corporation"
            value={clientName}
            onChange={e => onClientNameChange(e.target.value)}
          />
        </div>

        {/* Release Version */}
        <div style={{ marginBottom: 20 }}>
          <label className="field-label" htmlFor="releaseVersion">Workday Release Version</label>
          <select
            id="releaseVersion"
            className="field-input"
            value={releaseVersion}
            onChange={e => onReleaseVersionChange(e.target.value)}
          >
            {availableReleases.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {/* Audience Mode */}
        <div>
          <label className="field-label">Target Audience</label>
          <div style={{ display: 'flex', gap: 8, padding: 4, background: 'rgba(0,0,0,0.25)', borderRadius: 10, marginBottom: 12 }}>
            {AUDIENCE_MODES.map(m => (
              <button
                key={m.key}
                className={`mode-tab ${audienceMode === m.key ? 'active' : ''}`}
                onClick={() => onAudienceModeChange(m.key)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
            fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: 16 }}>{AUDIENCE_MODES.find(m => m.key === audienceMode)?.icon}</span>
            <span>{AUDIENCE_MODES.find(m => m.key === audienceMode)?.desc}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 24,
        background: 'rgba(244,161,36,0.06)', border: '1px solid rgba(244,161,36,0.18)',
        fontSize: 13, color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent)' }}>✦ Deck preview</strong>{' '}
        Title + Executive Summary + <strong>{selectedCount}</strong> feature slide{selectedCount !== 1 ? 's' : ''} + Next Steps ={' '}
        <strong style={{ color: 'var(--text-primary)' }}>{selectedCount + 3} slides total</strong>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-secondary" onClick={onBack} disabled={generating} style={{ flex: 1 }}>
          ← Back
        </button>
        <button
          id="generate-btn"
          className="btn-primary"
          onClick={onGenerate}
          disabled={generating || !clientName.trim()}
          style={{ flex: 2 }}
        >
          {generating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SpinnerSVG /> Generating…
            </span>
          ) : '⚡ Generate Presentation'}
        </button>
      </div>
    </div>
  );
}

function SpinnerSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
