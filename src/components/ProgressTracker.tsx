'use client';

import { SlideContent } from '@/types';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

interface Props {
  steps: ProgressStep[];
  error: string | null;
  downloadUrl: string | null;
  slidesPreview?: SlideContent[] | null;
  onDownload: () => void;
  onReset: () => void;
}

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '○',
  running: '◌',
  done: '✓',
  error: '✕',
};

export default function ProgressTracker({ steps, error, downloadUrl, slidesPreview, onDownload, onReset }: Props) {
  const isComplete = steps.every(s => s.status === 'done');

  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        {isComplete ? '🎉 Your deck is ready!' : error ? '⚠️ Generation failed' : '⚡ Building your presentation…'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
        {isComplete ? 'Preview your slides below, then download the PowerPoint.'
          : error ? 'Something went wrong. See details below.'
            : 'WRIPG AI is enriching your content. This usually takes less than 30 seconds.'}
      </p>

      {/* Steps list */}
      {!isComplete && !error && (
        <div className="glass-card" style={{ padding: '8px 20px', marginBottom: 20 }}>
          {steps.map((step, i) => (
            <div key={step.id} className="progress-step" style={{ borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className={`progress-icon ${step.status}`}>
                {step.status === 'running' ? (
                  <span style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>◌</span>
                ) : (
                  STATUS_ICON[step.status]
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: step.status === 'done' ? 'var(--text-primary)'
                    : step.status === 'running' ? 'var(--primary-light)'
                      : step.status === 'error' ? '#f87171'
                        : 'var(--text-muted)'
                }}>
                  {step.label}
                </div>
                {step.detail && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{step.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Preview */}
      {isComplete && slidesPreview && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Slide Preview</h3>
          <div style={{
            display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16,
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent'
          }}>
            {slidesPreview.map((slide, idx) => (
              <div key={idx} className="glass-card" style={{
                minWidth: 320, maxWidth: 320, padding: 20, flexShrink: 0,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {slide.featureId}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{slide.title}</h4>
                <p style={{ fontSize: 11, color: '#a78bfa', fontStyle: 'italic', marginBottom: 10 }}>{slide.tagline}</p>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {slide.overview}
                </div>
                {(slide.keyBenefits ?? []).slice(0, 3).map((b: string, bi: number) => (
                  <div key={bi} style={{ fontSize: 11, color: '#4ade80', marginBottom: 3 }}>✓ {b}</div>
                ))}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error box */}
      {error && (
        <div style={{
          padding: 16, borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#f87171', fontSize: 13, lineHeight: 1.6
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Download section */}
      {isComplete && downloadUrl && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 20, textAlign: 'center',
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)'
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Your PPTX deck is ready for download.
          </div>
          <button className="btn-primary" onClick={onDownload} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.35)', width: '100%' }}>
            ⬇ Download PPTX
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        {(error || isComplete) && (
          <button className="btn-secondary" onClick={onReset} style={{ flex: 1 }}>
            ← Start Over
          </button>
        )}
      </div>

      {/* Subtle spin style */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

