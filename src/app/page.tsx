'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkdayFeature, AudienceMode } from '@/types';
import FeatureSelector from '@/components/FeatureSelector';
import ConfigPanel from '@/components/ConfigPanel';
import ProgressTracker, { ProgressStep } from '@/components/ProgressTracker';

const STEPS = ['Select Features', 'Configure', 'Generate'];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [features, setFeatures] = useState<WorkdayFeature[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [availableReleases, setAvailableReleases] = useState<string[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

  // Config state
  const [clientName, setClientName] = useState('');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('consultant');
  const [releaseVersion, setReleaseVersion] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [slidesPreview, setSlidesPreview] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { id: 'fetch', label: 'Fetching selected features', status: 'pending' },
    { id: 'ai', label: 'Generating slide content with WRIPG AI', status: 'pending' },
    { id: 'diagrams', label: 'Rendering workflow diagrams', status: 'pending' },
    { id: 'assemble', label: 'Assembling PowerPoint deck', status: 'pending' },
    { id: 'ready', label: 'Deck ready for download', status: 'pending' },
  ]);

  // Load releases meta on mount, then fetch features for default release
  useEffect(() => {
    Promise.all([
      fetch('/api/features?meta=releases').then(r => r.json()),
      fetch('/api/features?meta=domains').then(r => r.json()),
    ]).then(([releases, domains]: [string[], string[]]) => {
      const sortedReleases = releases;
      setAvailableReleases(sortedReleases);
      setAvailableDomains(domains);
      const defaultRelease = sortedReleases[0] || '';
      setReleaseVersion(defaultRelease);
      return defaultRelease;
    }).then(defaultRelease => {
      if (!defaultRelease) { setLoadingFeatures(false); return; }
      fetch(`/api/features?release=${encodeURIComponent(defaultRelease)}`)
        .then(r => r.json())
        .then(data => setFeatures(Array.isArray(data) ? data : []))
        .catch(() => setFeatures([]))
        .finally(() => setLoadingFeatures(false));
    }).catch(() => {
      setLoadingFeatures(false);
    });
  }, []);

  // Re-fetch features when releaseVersion changes
  const handleReleaseChange = useCallback((rv: string) => {
    setReleaseVersion(rv);
    setSelectedIds([]);
    setFeatures([]);
    setLoadingFeatures(true);
    fetch(`/api/features?release=${encodeURIComponent(rv)}`)
      .then(r => r.json())
      .then(data => setFeatures(Array.isArray(data) ? data : []))
      .catch(() => setFeatures([]))
      .finally(() => setLoadingFeatures(false));
  }, []);

  const setStepStatus = useCallback((id: string, status: ProgressStep['status'], detail?: string) => {
    setProgressSteps(prev => prev.map(s => s.id === id ? { ...s, status, detail } : s));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!clientName.trim()) { alert('Please enter a client name.'); return; }
    if (selectedIds.length === 0) { alert('Please select at least one feature.'); return; }

    setGenerating(true);
    setError(null);
    setDownloadUrl(null);
    setCurrentStep(2);
    setProgressSteps(prev => prev.map(s => ({ ...s, status: 'pending', detail: undefined })));

    try {
      setStepStatus('fetch', 'running');
      await new Promise(r => setTimeout(r, 500));
      setStepStatus('fetch', 'done', `${selectedIds.length} feature(s) loaded`);

      setStepStatus('ai', 'running');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureIds: selectedIds, audienceMode, releaseVersion, clientName }),
      });

      setStepStatus('ai', 'done', 'Slide content generated');
      setStepStatus('diagrams', 'running');
      await new Promise(r => setTimeout(r, 300));
      setStepStatus('diagrams', 'done', 'Diagrams rendered');
      setStepStatus('assemble', 'running');

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setSlidesPreview(data.slides);

      // Convert the base64 string from the API back into a binary Blob.
      // We use a Blob URL instead of a Data URI because modern browsers (Chrome/Edge) 
      // often block large Data URI downloads as a security risk.
      const byteCharacters = atob(data.pptxBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const blobUrl = URL.createObjectURL(blob);

      setDownloadUrl(blobUrl);

      setStepStatus('assemble', 'done', 'Presentation assembled');
      setStepStatus('ready', 'done', `WRIPG_${releaseVersion}_${clientName.replace(/\s+/g, '_')}.pptx`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(msg);
      setProgressSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
    } finally {
      setGenerating(false);
    }
  }, [clientName, selectedIds, audienceMode, releaseVersion, setStepStatus]);

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `WRIPG_${releaseVersion}_${clientName.replace(/\s+/g, '_')}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [downloadUrl, releaseVersion, clientName]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setSelectedIds([]);
    setDownloadUrl(null);
    setSlidesPreview(null);
    setError(null);
    setGenerating(false);
    setProgressSteps(prev => prev.map(s => ({ ...s, status: 'pending', detail: undefined })));
  }, []);

  return (
    <>
      <div className="mesh-bg" />

      {/* Header */}
      <header className="header-bar">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>WRIPG</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -2 }}>Workday Release Intelligence</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: i < currentStep && i < 2 ? 'pointer' : 'default' }}
                  onClick={() => { if (i < currentStep && i < 2) setCurrentStep(i); }}>
                  <div className={`step-dot ${i < currentStep ? 'complete' : i === currentStep ? 'active' : 'inactive'}`}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: i === currentStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 32, height: 1, background: i < currentStep ? 'var(--primary)' : 'var(--border)' }} />}
              </div>
            ))}
          </div>
          <div style={{ width: 120 }} />
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', minHeight: 'calc(100vh - 64px)' }}>

        {currentStep === 0 && (
          <div className="animate-slideUp" style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 99, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
              AI-Powered · Release Documentation · Instant Download
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>
              Generate Release Decks in{' '}
              <span style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Seconds</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto' }}>
              Select Workday features from the official release data, pick your audience, and let Our AI tool build a polished PowerPoint deck for you in seconds.
            </p>
          </div>
        )}

        {currentStep === 0 && (
          <div className="animate-slideUp">
            <FeatureSelector
              features={features}
              loading={loadingFeatures}
              selectedIds={selectedIds}
              availableReleases={availableReleases}
              availableDomains={availableDomains}
              currentRelease={releaseVersion}
              onReleaseChange={handleReleaseChange}
              onSelectionChange={setSelectedIds}
              onConfigure={() => setCurrentStep(1)}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div className="animate-slideUp" style={{ maxWidth: 640, margin: '0 auto' }}>
            <ConfigPanel
              clientName={clientName}
              audienceMode={audienceMode}
              releaseVersion={releaseVersion}
              availableReleases={availableReleases}
              selectedCount={selectedIds.length}
              generating={generating}
              onClientNameChange={setClientName}
              onAudienceModeChange={setAudienceMode}
              onReleaseVersionChange={setReleaseVersion}
              onBack={() => setCurrentStep(0)}
              onGenerate={handleGenerate}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-slideUp" style={{ maxWidth: 800, margin: '0 auto' }}>
            <ProgressTracker
              steps={progressSteps}
              error={error}
              downloadUrl={downloadUrl}
              slidesPreview={slidesPreview}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </>
  );
}
