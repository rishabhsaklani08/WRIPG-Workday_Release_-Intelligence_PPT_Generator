import PptxGenJS from 'pptxgenjs';
import { SlideContent, PresentationOptions } from '../types';
import { generateDiagramUrl } from './diagram-renderer';

// ─── Accenture brand palette ──────────────────────────────────────────────────
const C = {
  black:      '000000',
  white:      'FFFFFF',
  purple:     'A100FF',   // Accenture signature purple
  purpleDark: '7B00C4',
  purpleMid:  'C84DFF',
  purpleLight:'F0D9FF',
  grayDark:   '1A1A2E',   // dark navy for slide BG panels
  grayMid:    '2D2D44',
  gray100:    'F5F5F8',
  gray200:    'E8E8F0',
  gray400:    '9999AA',
  textDark:   '1A1A2E',
  textMid:    '444455',
  textLight:  '666677',
  green:      '00C17C',
  amber:      'F4A124',
  red:        'E85555',
};

// Slide canvas constants (inches, LAYOUT_16x9 = 10 × 7.5)
const W  = 10;
const H  = 7.5;
const M  = 0.35;   // margin

// ─── Helper: add a filled rectangle ──────────────────────────────────────────
function addRect(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  fill: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any> = {}
) {
  slide.addShape('rect', { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, ...opts });
}

// ─── Helper: complexity badge colour ─────────────────────────────────────────
function complexityColor(complexity: string): string {
  if (complexity === 'Setup Required') return C.red;
  return C.green;
}

// ─── Helper: domain colour accent ─────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  Finance: '2E75B6', HCM: '7B00C4', Payroll: '00875A', Recruiting: 'E37400',
  Planning: 'C84DFF', 'Supply Chain': '006D75', Analytics: '4B50E6',
  Integrations: '00897B', Platform: '546E7A', Security: 'C62828', Learning: 'F9A825',
  General: '78909C',
};
function domainColor(domain: string): string {
  return DOMAIN_COLORS[domain] ?? C.purple;
}

// ─── Cover slide ─────────────────────────────────────────────────────────────
function buildCoverSlide(pres: PptxGenJS, opts: PresentationOptions, totalFeatures: number) {
  const slide = pres.addSlide();

  // Full dark background
  addRect(slide, 0, 0, W, H, C.grayDark);

  // Purple diagonal accent stripe (top-right triangle simulation via thick lines)
  addRect(slide, W - 3.5, 0, 3.5, H, C.grayMid);
  addRect(slide, W - 0.08, 0, 0.08, H, C.purple);

  // Accenture ">" logo mark
  slide.addText('>', {
    x: W - 3.1, y: 0.3, w: 1.2, h: 1.2,
    fontSize: 72, bold: true, color: C.purple, fontFace: 'Arial', align: 'left',
  });

  // WRIPG title
  slide.addText('Workday Release', {
    x: M, y: 1.6, w: 6, h: 0.75,
    fontSize: 36, bold: true, color: C.white, fontFace: 'Arial', align: 'left',
  });
  slide.addText('Intelligence Report', {
    x: M, y: 2.3, w: 6, h: 0.75,
    fontSize: 36, bold: true, color: C.purple, fontFace: 'Arial', align: 'left',
  });

  // Separator bar
  addRect(slide, M, 3.25, 2.5, 0.055, C.purple);

  // Metadata
  slide.addText(`Client: ${opts.clientName}`, {
    x: M, y: 3.55, w: 5.5, h: 0.4,
    fontSize: 16, color: C.gray200, fontFace: 'Arial',
  });
  slide.addText(`Release: ${opts.releaseVersion}  |  ${totalFeatures} Feature${totalFeatures !== 1 ? 's' : ''}  |  View: ${opts.audienceMode.charAt(0).toUpperCase() + opts.audienceMode.slice(1)}`, {
    x: M, y: 3.98, w: 7, h: 0.38,
    fontSize: 13, color: C.gray400, fontFace: 'Arial',
  });

  // Date
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  slide.addText(today, {
    x: M, y: 4.45, w: 4, h: 0.32,
    fontSize: 12, color: C.gray400, fontFace: 'Arial',
  });

  // Bottom watermark
  slide.addText('Confidential — Accenture Workday Practice', {
    x: M, y: H - 0.5, w: W - 2 * M, h: 0.32,
    fontSize: 10, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── Table of contents ────────────────────────────────────────────────────────
function buildTOCSlide(pres: PptxGenJS, slides: SlideContent[], opts: PresentationOptions) {
  const slide = pres.addSlide();
  addRect(slide, 0, 0, W, H, C.white);

  // Left purple strip
  addRect(slide, 0, 0, 0.22, H, C.purple);

  // Header
  slide.addText('Contents', {
    x: 0.5, y: M, w: W - 0.7, h: 0.7,
    fontSize: 28, bold: true, color: C.textDark, fontFace: 'Arial',
  });
  addRect(slide, 0.5, 1.05, 2.5, 0.04, C.purple);

  // Feature list
  const rows = slides.map((s, i) => [
    { text: `${String(i + 1).padStart(2, '0')}`, options: { bold: true, color: C.purple, fontSize: 13, fontFace: 'Arial' } },
    { text: s.title, options: { color: C.textDark, fontSize: 12, fontFace: 'Arial' } },
    { text: s.featureId, options: { color: C.gray400, fontSize: 11, fontFace: 'Arial' } },
  ]);

  slide.addTable(rows, {
    x: 0.5, y: 1.3, w: W - 0.9,
    rowH: 0.34,
    colW: [0.55, 7.2, 1.5],
    border: { type: 'solid', pt: 0.5, color: C.gray200 },
    fill: { color: C.white },
  });

  // Footer
  slide.addText(`${opts.clientName}  ·  ${opts.releaseVersion}  ·  Accenture Workday Practice`, {
    x: 0.5, y: H - 0.42, w: W - 1, h: 0.3,
    fontSize: 9, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── Individual feature slide ─────────────────────────────────────────────────
async function buildFeatureSlide(
  pres: PptxGenJS,
  content: SlideContent,
  slideNum: number,
  opts: PresentationOptions,
  featureMeta?: { domain?: string; complexity?: string; optIn?: boolean; productionDate?: string }
) {
  const slide = pres.addSlide();
  const domain = featureMeta?.domain ?? 'General';
  const dColor = domainColor(domain);

  // ── Background ──
  addRect(slide, 0, 0, W, H, C.white);

  // ── Left sidebar: dark panel ──
  addRect(slide, 0, 0, 2.6, H, C.grayDark);
  // Purple top cap on sidebar
  addRect(slide, 0, 0, 2.6, 0.28, C.purple);

  // Slide number on sidebar
  slide.addText(String(slideNum).padStart(2, '0'), {
    x: 0.05, y: 0.1, w: 2.5, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: 'Arial', align: 'center',
  });

  // Domain badge
  addRect(slide, 0.15, 0.85, 2.3, 0.38, dColor);
  slide.addText(domain.toUpperCase(), {
    x: 0.15, y: 0.85, w: 2.3, h: 0.38,
    fontSize: 11, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
  });

  // Opt-In badge
  if (featureMeta?.optIn) {
    addRect(slide, 0.15, 1.35, 2.3, 0.33, C.amber);
    slide.addText('OPT-IN REQUIRED', {
      x: 0.15, y: 1.35, w: 2.3, h: 0.33,
      fontSize: 10, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
    });
  }

  // Complexity badge
  if (featureMeta?.complexity) {
    const cColor = complexityColor(featureMeta.complexity);
    addRect(slide, 0.15, featureMeta.optIn ? 1.8 : 1.35, 2.3, 0.33, cColor);
    slide.addText(`COMPLEXITY: ${featureMeta.complexity.toUpperCase()}`, {
      x: 0.15, y: featureMeta.optIn ? 1.8 : 1.35, w: 2.3, h: 0.33,
      fontSize: 9, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
    });
  }

  // Sidebar labels
  const sideY = 2.5;
  slide.addText('FEATURE ID', { x: 0.15, y: sideY, w: 2.3, h: 0.22, fontSize: 8, bold: true, color: C.gray400, fontFace: 'Arial' });
  slide.addText(content.featureId, { x: 0.15, y: sideY + 0.2, w: 2.3, h: 0.28, fontSize: 10, color: C.white, fontFace: 'Arial' });

  if (featureMeta?.productionDate) {
    slide.addText('GO-LIVE DATE', { x: 0.15, y: sideY + 0.65, w: 2.3, h: 0.22, fontSize: 8, bold: true, color: C.gray400, fontFace: 'Arial' });
    slide.addText(featureMeta.productionDate, { x: 0.15, y: sideY + 0.85, w: 2.3, h: 0.28, fontSize: 10, color: C.white, fontFace: 'Arial' });
  }

  // Timeline box at bottom of sidebar
  addRect(slide, 0, H - 1.4, 2.6, 1.4, C.grayMid);
  slide.addText('TIMELINE', { x: 0.12, y: H - 1.35, w: 2.4, h: 0.25, fontSize: 8, bold: true, color: C.purple, fontFace: 'Arial' });
  slide.addText(content.timeline || 'See release notes for availability.', {
    x: 0.12, y: H - 1.1, w: 2.38, h: 0.95,
    fontSize: 9, color: C.gray200, fontFace: 'Arial', wrap: true,
  });

  // ── Main content area (right of sidebar) ──
  const cx = 2.82;   // content start X
  const cw = W - cx - M;  // content width

  // Title bar
  addRect(slide, 2.6, 0, W - 2.6, 0.95, C.gray100);
  slide.addText(content.title, {
    x: cx, y: 0.08, w: cw, h: 0.8,
    fontSize: 19, bold: true, color: C.textDark, fontFace: 'Arial', valign: 'middle',
  });

  // Tagline strip
  addRect(slide, 2.6, 0.95, W - 2.6, 0.42, C.purple);
  slide.addText(content.tagline, {
    x: cx, y: 0.97, w: cw, h: 0.38,
    fontSize: 11, italic: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });

  // ── Two-column body ──
  const col1X = cx;
  const col1W = 3.6;
  const col2X = cx + col1W + 0.15;
  const col2W = cw - col1W - 0.15;
  const bodyY = 1.55;

  // Left column
  // Overview
  slide.addText('OVERVIEW', { x: col1X, y: bodyY, w: col1W, h: 0.22, fontSize: 8, bold: true, color: C.purple, fontFace: 'Arial' });
  addRect(slide, col1X, bodyY + 0.24, col1W, 0.03, C.purple);
  slide.addText(content.overview, {
    x: col1X, y: bodyY + 0.3, w: col1W, h: 1.25,
    fontSize: 10, color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top',
  });

  // Business Impact
  const biY = bodyY + 1.72;
  slide.addText('BUSINESS IMPACT', { x: col1X, y: biY, w: col1W, h: 0.22, fontSize: 8, bold: true, color: C.purple, fontFace: 'Arial' });
  addRect(slide, col1X, biY + 0.24, col1W, 0.03, C.purple);
  slide.addText(content.businessImpact, {
    x: col1X, y: biY + 0.3, w: col1W, h: 1.0,
    fontSize: 10, color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top',
  });

  // Key Benefits
  const kbY = biY + 1.45;
  slide.addText('KEY BENEFITS', { x: col1X, y: kbY, w: col1W, h: 0.22, fontSize: 8, bold: true, color: C.green, fontFace: 'Arial' });
  addRect(slide, col1X, kbY + 0.24, col1W, 0.03, C.green);
  const benefitBullets = (content.keyBenefits ?? []).map(b => ({ text: `✓  ${b}`, options: { breakLine: true } }));
  slide.addText(benefitBullets, {
    x: col1X, y: kbY + 0.3, w: col1W, h: 1.1,
    fontSize: 9.5, color: C.textDark, fontFace: 'Arial', valign: 'top',
  });

  // Right column
  // Config Steps
  slide.addText('CONFIGURATION STEPS', { x: col2X, y: bodyY, w: col2W, h: 0.22, fontSize: 8, bold: true, color: C.amber, fontFace: 'Arial' });
  addRect(slide, col2X, bodyY + 0.24, col2W, 0.03, C.amber);
  const stepBullets = (content.configSteps ?? []).map((s, i) => ({ text: `${i + 1}.  ${s}`, options: { breakLine: true } }));
  slide.addText(stepBullets, {
    x: col2X, y: bodyY + 0.3, w: col2W, h: 1.5,
    fontSize: 9.5, color: C.textDark, fontFace: 'Arial', valign: 'top',
  });

  // Prerequisites
  const prY = bodyY + 2.0;
  slide.addText('PREREQUISITES', { x: col2X, y: prY, w: col2W, h: 0.22, fontSize: 8, bold: true, color: C.textLight, fontFace: 'Arial' });
  addRect(slide, col2X, prY + 0.24, col2W, 0.03, C.gray400);
  const preBullets = (content.prerequisites ?? []).map(p => ({ text: `·  ${p}`, options: { breakLine: true } }));
  slide.addText(preBullets.length ? preBullets : [{ text: '·  No specific prerequisites required.', options: { breakLine: false } }], {
    x: col2X, y: prY + 0.3, w: col2W, h: 0.9,
    fontSize: 9.5, color: C.textMid, fontFace: 'Arial', valign: 'top',
  });

  // Risks & Change Management
  const rY = prY + 1.25;
  slide.addText('RISKS & CHANGE MANAGEMENT', { x: col2X, y: rY, w: col2W, h: 0.22, fontSize: 8, bold: true, color: C.red, fontFace: 'Arial' });
  addRect(slide, col2X, rY + 0.24, col2W, 0.03, C.red);
  slide.addText(content.risks || 'Low change management impact. Standard communication recommended.', {
    x: col2X, y: rY + 0.3, w: col2W, h: 0.8,
    fontSize: 9.5, color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top',
  });

  // ── Call-to-Action banner ──
  addRect(slide, 2.6, H - 0.75, W - 2.6, 0.75, C.purple);
  slide.addText('ACTION REQUIRED: ', {
    x: cx + 0.08, y: H - 0.68, w: 1.5, h: 0.6,
    fontSize: 10, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  slide.addText(content.userAction, {
    x: cx + 1.55, y: H - 0.68, w: cw - 1.55, h: 0.6,
    fontSize: 10, color: C.purpleLight, fontFace: 'Arial', valign: 'middle',
  });
}

// ─── Diagram slide (full-width) ───────────────────────────────────────────────
async function buildDiagramSlide(
  pres: PptxGenJS,
  content: SlideContent,
  slideNum: number,
  opts: PresentationOptions
) {
  const imgDataUri = await generateDiagramUrl(content.diagramDefinition ?? '');
  if (!imgDataUri) return; // skip if render failed

  const slide = pres.addSlide();
  addRect(slide, 0, 0, W, H, C.white);

  // Dark header
  addRect(slide, 0, 0, W, 1.1, C.grayDark);
  slide.addText(`WORKFLOW DIAGRAM  —  ${content.title}`, {
    x: M, y: 0.12, w: W - 2 * M, h: 0.85,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });

  // Diagram image — fills most of the slide
  slide.addImage({
    data: imgDataUri,
    x: M, y: 1.25, w: W - 2 * M, h: H - 1.8,
    sizing: { type: 'contain', w: W - 2 * M, h: H - 1.8 },
  });

  // Footer
  addRect(slide, 0, H - 0.42, W, 0.42, C.gray100);
  slide.addText(`${content.featureId}  ·  ${opts.clientName}  ·  ${opts.releaseVersion}`, {
    x: M, y: H - 0.38, w: W - 2 * M, h: 0.3,
    fontSize: 9, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── Summary / Next Steps slide ───────────────────────────────────────────────
function buildSummarySlide(pres: PptxGenJS, slides: SlideContent[], opts: PresentationOptions) {
  const slide = pres.addSlide();
  addRect(slide, 0, 0, W, H, C.grayDark);
  addRect(slide, 0, 0, W, 0.28, C.purple);
  addRect(slide, 0, H - 0.28, W, 0.28, C.purple);

  slide.addText('Next Steps & Recommendations', {
    x: M, y: 0.4, w: W - 2 * M, h: 0.65,
    fontSize: 24, bold: true, color: C.white, fontFace: 'Arial',
  });
  addRect(slide, M, 1.1, 2.0, 0.05, C.purple);

  const nextSteps = [
    '1.  Review each feature with your functional leads and confirm which require tenant configuration.',
    '2.  Spin up a Sandbox tenant test cycle for all "Setup Required" features before production go-live.',
    '3.  Assign security roles and business process configurations as detailed in each feature slide.',
    '4.  Communicate changes to end users at least 2 weeks before the production release date.',
    '5.  Schedule an Accenture deep-dive session for any High Complexity features in this release.',
    '6.  Validate all opt-in features in Preview before the production cutover.',
  ];

  nextSteps.forEach((step, i) => {
    addRect(slide, M, 1.35 + i * 0.82, W - 2 * M, 0.72, C.grayMid);
    addRect(slide, M, 1.35 + i * 0.82, 0.06, 0.72, C.purple);
    slide.addText(step, {
      x: M + 0.15, y: 1.4 + i * 0.82, w: W - 2 * M - 0.25, h: 0.62,
      fontSize: 11, color: C.gray200, fontFace: 'Arial', valign: 'middle',
    });
    if (i >= 5) return; // max 6 steps visible
  });

  slide.addText(`Prepared for ${opts.clientName}  ·  Accenture Workday Practice  ·  Confidential`, {
    x: M, y: H - 0.22, w: W - 2 * M, h: 0.2,
    fontSize: 8, color: C.gray400, fontFace: 'Arial', align: 'center',
  });
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export async function buildPresentation(
  slides: SlideContent[],
  options: PresentationOptions,
  featuresMeta?: Array<{ domain?: string; complexity?: string; optIn?: boolean; productionDate?: string }>
): Promise<ArrayBuffer> {

  const pres = new PptxGenJS();
  pres.layout  = 'LAYOUT_16x9';
  pres.company = 'Accenture';
  pres.title   = `Workday ${options.releaseVersion} Release Intelligence — ${options.clientName}`;
  pres.author  = 'WRIPG by Accenture';
  pres.subject = `Release ${options.releaseVersion} | ${options.audienceMode} view`;

  // Slide 1: Cover
  buildCoverSlide(pres, options, slides.length);

  // Slide 2: Table of Contents
  buildTOCSlide(pres, slides, options);

  // Slides 3…N: Feature slides + optional diagram slide
  for (let i = 0; i < slides.length; i++) {
    const content = slides[i];
    const meta    = featuresMeta?.[i];
    const slideNum = i + 1;

    await buildFeatureSlide(pres, content, slideNum, options, meta);

    // Add a dedicated full-page diagram slide immediately after the feature slide
    if (content.diagramType === 'mermaid' && content.diagramDefinition) {
      await buildDiagramSlide(pres, content, slideNum, options);
    }
  }

  // Final: Summary / Next Steps
  buildSummarySlide(pres, slides, options);

  return await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
}
