import PptxGenJS from 'pptxgenjs';
import { SlideContent, PresentationOptions } from '../types';
import { generateDiagramUrl } from './diagram-renderer';

// ─── Brand Palette ────────────────────────────────────────────────────────────
const C = {
  black:       '000000',
  white:       'FFFFFF',
  purple:      'A100FF',
  purpleDark:  '7B00C4',
  purpleLight: 'F0D9FF',
  navy:        '0D0D1A',
  navyMid:     '1A1A2E',
  navyLight:   '2D2D44',
  gray100:     'F5F5F8',
  gray200:     'E8E8F0',
  gray400:     '9999AA',
  gray600:     '555566',
  textDark:    '1A1A2E',
  textMid:     '444455',
  green:       '00B876',
  amber:       'F4A124',
  red:         'E04545',
};

// Standard 16:9 canvas — 10" × 5.625" (PowerPoint default widescreen)
const W = 10;
const H = 5.625;
const M = 0.3;

// ─── Domain accent colours ────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  Finance: '1E6FBA', HCM: 'A100FF', Payroll: '00875A', Recruiting: 'D4670A',
  Planning: '7B3FC4', 'Supply Chain': '006D75', Analytics: '3A4AE0',
  Integrations: '00897B', Platform: '546E7A', Security: 'B71C1C',
  Learning: 'E59C00', General: '607080',
};
function domainColor(d: string) { return DOMAIN_COLORS[d] ?? C.purple; }
function complexityColor(c: string) { return c === 'Setup Required' ? C.red : C.green; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rect(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill: string, extra: Record<string, any> = {}) {
  slide.addShape('rect', { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, ...extra });
}

/** Clamp text to fit a box — reduces font size until it fits or hits minSize */
function addTextSafe(
  slide: PptxGenJS.Slide,
  text: string,
  x: number, y: number, w: number, h: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any>,
  maxSize = 11,
  minSize = 7.5,
) {
  // Estimate characters that fit: roughly 12 chars per inch per font-size-10 unit
  const charsPerLine = Math.floor((w * 120) / maxSize);
  const linesAvailable = Math.floor((h * 72) / (maxSize * 1.3));
  const charsAvailable = charsPerLine * linesAvailable;

  let fontSize = maxSize;
  if (text.length > charsAvailable && maxSize > minSize) {
    fontSize = Math.max(minSize, maxSize * Math.sqrt(charsAvailable / text.length));
    fontSize = Math.round(fontSize * 2) / 2; // round to nearest 0.5
  }
  slide.addText(text, { x, y, w, h, fontSize, ...opts });
}

// ─── COVER SLIDE ──────────────────────────────────────────────────────────────
function buildCoverSlide(pres: PptxGenJS, opts: PresentationOptions, total: number) {
  const slide = pres.addSlide();

  // Full dark bg
  rect(slide, 0, 0, W, H, C.navy);

  // Right accent panel
  rect(slide, W - 3.2, 0, 3.2, H, C.navyMid);

  // Purple right edge stripe
  rect(slide, W - 0.07, 0, 0.07, H, C.purple);

  // Top purple stripe
  rect(slide, 0, 0, W, 0.06, C.purple);

  // Decorative purple circle (brand accent)
  slide.addShape('ellipse', { x: W - 2.5, y: H - 2.2, w: 3.5, h: 3.5, fill: { color: C.purple, transparency: 85 }, line: { color: C.purple, width: 0 } });
  slide.addShape('ellipse', { x: W - 2.1, y: H - 1.8, w: 2.5, h: 2.5, fill: { color: C.purpleDark, transparency: 75 }, line: { color: C.purple, width: 0 } });

  // ">" logo mark
  slide.addText('>', { x: W - 2.85, y: 0.25, w: 1, h: 1, fontSize: 60, bold: true, color: C.purple, fontFace: 'Arial', align: 'left' });

  // Title
  slide.addText('Workday Release', { x: M, y: 1.1, w: 6.2, h: 0.7, fontSize: 34, bold: true, color: C.white, fontFace: 'Arial', align: 'left' });
  slide.addText('Intelligence Report', { x: M, y: 1.75, w: 6.2, h: 0.7, fontSize: 34, bold: true, color: C.purple, fontFace: 'Arial', align: 'left' });

  // Accent bar
  rect(slide, M, 2.6, 2.2, 0.05, C.purple);

  // Meta
  slide.addText(`Client: ${opts.clientName}`, { x: M, y: 2.82, w: 5.5, h: 0.38, fontSize: 14, color: C.gray200, fontFace: 'Arial' });
  slide.addText(`Release: ${opts.releaseVersion}  ·  ${total} Feature${total !== 1 ? 's' : ''}  ·  ${opts.audienceMode.charAt(0).toUpperCase() + opts.audienceMode.slice(1)} View`, {
    x: M, y: 3.22, w: 7, h: 0.32, fontSize: 11, color: C.gray400, fontFace: 'Arial',
  });

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  slide.addText(today, { x: M, y: 3.62, w: 4, h: 0.28, fontSize: 10, color: C.gray400, fontFace: 'Arial' });

  // Watermark footer
  slide.addText('Confidential — Accenture Workday Practice', {
    x: M, y: H - 0.4, w: W - 2 * M, h: 0.28, fontSize: 9, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── TABLE OF CONTENTS ────────────────────────────────────────────────────────
function buildTOCSlide(pres: PptxGenJS, slides: SlideContent[], opts: PresentationOptions) {
  const slide = pres.addSlide();
  rect(slide, 0, 0, W, H, C.white);

  // Left sidebar accent
  rect(slide, 0, 0, 0.18, H, C.purple);

  // Header
  slide.addText('Contents', { x: 0.42, y: M, w: W - 0.6, h: 0.55, fontSize: 26, bold: true, color: C.textDark, fontFace: 'Arial' });
  rect(slide, 0.42, 0.92, 2.0, 0.04, C.purple);

  // Feature list — two columns for >8 items
  const half = Math.ceil(slides.length / 2);
  const useTwo = slides.length > 8;

  const renderColumn = (items: SlideContent[], startIndex: number, colX: number, colW: number) => {
    items.forEach((s, i) => {
      const rowY = 1.05 + i * 0.38;
      if (rowY + 0.38 > H - 0.4) return; // safety: skip if out of bounds
      if (i % 2 === 0) rect(slide, colX - 0.05, rowY, colW + 0.1, 0.36, C.gray100);
      rect(slide, colX - 0.05, rowY, 0.04, 0.36, C.purple);
      slide.addText(`${String(startIndex + i + 1).padStart(2, '0')}`, {
        x: colX + 0.06, y: rowY + 0.05, w: 0.38, h: 0.26, fontSize: 12, bold: true, color: C.purple, fontFace: 'Arial',
      });
      slide.addText(s.title.length > 55 ? s.title.slice(0, 52) + '…' : s.title, {
        x: colX + 0.45, y: rowY + 0.06, w: colW - 0.8, h: 0.24, fontSize: 10, color: C.textDark, fontFace: 'Arial',
      });
      slide.addText(s.featureId, {
        x: colX + colW - 0.38, y: rowY + 0.06, w: 0.38, h: 0.24, fontSize: 8, color: C.gray400, fontFace: 'Arial', align: 'right',
      });
    });
  };

  if (useTwo) {
    renderColumn(slides.slice(0, half), 0, 0.42, 4.5);
    renderColumn(slides.slice(half), half, 5.2, 4.5);
  } else {
    renderColumn(slides, 0, 0.42, W - 0.7);
  }

  // Footer
  rect(slide, 0, H - 0.35, W, 0.35, C.gray100);
  slide.addText(`${opts.clientName}  ·  ${opts.releaseVersion}  ·  Accenture Workday Practice`, {
    x: 0.42, y: H - 0.3, w: W - 0.6, h: 0.22, fontSize: 8, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── FEATURE SLIDE ────────────────────────────────────────────────────────────
async function buildFeatureSlide(
  pres: PptxGenJS,
  content: SlideContent,
  slideNum: number,
  opts: PresentationOptions,
  meta?: { domain?: string; complexity?: string; optIn?: boolean; productionDate?: string }
) {
  const slide = pres.addSlide();
  const domain  = meta?.domain ?? 'General';
  const dColor  = domainColor(domain);

  // White background
  rect(slide, 0, 0, W, H, C.white);

  // ── LEFT SIDEBAR (2.1") ──
  const SB = 2.1; // sidebar width
  rect(slide, 0, 0, SB, H, C.navyMid);
  rect(slide, 0, 0, SB, 0.22, C.purple); // purple cap

  // Slide number
  slide.addText(String(slideNum).padStart(2, '0'), {
    x: 0, y: 0.04, w: SB, h: 0.35, fontSize: 18, bold: true, color: C.white, fontFace: 'Arial', align: 'center',
  });

  // Domain badge
  rect(slide, 0.12, 0.62, SB - 0.24, 0.32, dColor);
  slide.addText(domain.toUpperCase(), {
    x: 0.12, y: 0.62, w: SB - 0.24, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
  });

  // Opt-in badge
  let badgeY = 1.04;
  if (meta?.optIn) {
    rect(slide, 0.12, badgeY, SB - 0.24, 0.28, C.amber);
    slide.addText('OPT-IN REQUIRED', {
      x: 0.12, y: badgeY, w: SB - 0.24, h: 0.28, fontSize: 8, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
    });
    badgeY += 0.36;
  }

  // Complexity badge
  if (meta?.complexity) {
    const cColor = complexityColor(meta.complexity);
    rect(slide, 0.12, badgeY, SB - 0.24, 0.28, cColor);
    // Abbreviate label to fit
    const label = meta.complexity === 'Setup Required' ? 'SETUP REQUIRED' : 'AUTO AVAILABLE';
    slide.addText(label, {
      x: 0.12, y: badgeY, w: SB - 0.24, h: 0.28, fontSize: 7.5, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
    });
    badgeY += 0.36;
  }

  // Sidebar info labels
  const infoY = badgeY + 0.18;
  slide.addText('FEATURE ID', { x: 0.12, y: infoY, w: SB - 0.18, h: 0.18, fontSize: 7, bold: true, color: C.gray400, fontFace: 'Arial' });
  slide.addText(content.featureId, { x: 0.12, y: infoY + 0.18, w: SB - 0.18, h: 0.22, fontSize: 9, color: C.white, fontFace: 'Arial' });

  if (meta?.productionDate) {
    const goY = infoY + 0.5;
    slide.addText('GO-LIVE DATE', { x: 0.12, y: goY, w: SB - 0.18, h: 0.18, fontSize: 7, bold: true, color: C.gray400, fontFace: 'Arial' });
    slide.addText(meta.productionDate, { x: 0.12, y: goY + 0.18, w: SB - 0.18, h: 0.22, fontSize: 9, color: C.white, fontFace: 'Arial' });
  }

  // Timeline box — pinned to bottom of sidebar
  const tlH = 0.92;
  rect(slide, 0, H - tlH, SB, tlH, C.navyLight);
  slide.addText('TIMELINE', { x: 0.1, y: H - tlH + 0.06, w: SB - 0.15, h: 0.18, fontSize: 7, bold: true, color: C.purple, fontFace: 'Arial' });
  addTextSafe(slide, content.timeline || 'See release notes.', 0.1, H - tlH + 0.26, SB - 0.15, tlH - 0.34,
    { color: C.gray200, fontFace: 'Arial', wrap: true, valign: 'top' }, 8.5, 7);

  // ── MAIN CONTENT AREA ──
  const CX = SB + 0.22;  // content start X
  const CW = W - CX - M; // content width

  // Title bar
  const TITLE_H = 0.72;
  rect(slide, SB, 0, W - SB, TITLE_H, C.gray100);
  addTextSafe(slide, content.title, CX, 0.07, CW, TITLE_H - 0.12,
    { bold: true, color: C.textDark, fontFace: 'Arial', valign: 'middle' }, 17, 12);

  // Tagline strip
  const TAG_Y = TITLE_H;
  const TAG_H = 0.35;
  rect(slide, SB, TAG_Y, W - SB, TAG_H, C.purple);
  addTextSafe(slide, content.tagline, CX, TAG_Y + 0.03, CW, TAG_H - 0.06,
    { italic: true, color: C.white, fontFace: 'Arial', valign: 'middle' }, 10, 8);

  // Body starts after tagline
  const BODY_Y = TAG_Y + TAG_H + 0.12;
  const FOOTER_H = 0.38; // CTA banner height
  const BODY_H = H - BODY_Y - FOOTER_H - 0.08; // available body height

  // Two columns
  const C1W = CW * 0.44;
  const C2W = CW - C1W - 0.18;
  const C2X = CX + C1W + 0.18;

  // Divide body height between sections
  const SEC_GAP = 0.08;

  // ── LEFT COLUMN: Overview + Business Impact ──
  const halfBody = (BODY_H - SEC_GAP) / 2;

  // Section header helper
  function sectionHeader(sx: number, sy: number, sw: number, label: string, color: string) {
    slide.addText(label, { x: sx, y: sy, w: sw, h: 0.18, fontSize: 7.5, bold: true, color, fontFace: 'Arial' });
    rect(slide, sx, sy + 0.19, sw, 0.025, color);
    return sy + 0.23;
  }

  // Overview
  let textY = sectionHeader(CX, BODY_Y, C1W, 'OVERVIEW', C.purple);
  addTextSafe(slide, content.overview, CX, textY, C1W, halfBody - 0.28,
    { color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top' }, 9.5, 7.5);

  // Business Impact
  const biY = BODY_Y + halfBody + SEC_GAP;
  textY = sectionHeader(CX, biY, C1W, 'BUSINESS IMPACT', C.purple);
  addTextSafe(slide, content.businessImpact, CX, textY, C1W, halfBody - 0.28,
    { color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top' }, 9.5, 7.5);

  // ── RIGHT COLUMN ──
  // Divide into three areas: config steps (45%), prerequisites (25%), risks (30%)
  const configH  = BODY_H * 0.45;
  const prereqH  = BODY_H * 0.25;
  const risksH   = BODY_H * 0.30 - SEC_GAP * 2;

  // Config Steps
  textY = sectionHeader(C2X, BODY_Y, C2W, 'CONFIGURATION STEPS', C.amber);
  const stepBullets = (content.configSteps ?? []).slice(0, 8).map((s, i) => ({ text: `${i + 1}.  ${s}`, options: { breakLine: true } }));
  slide.addText(stepBullets.length ? stepBullets : [{ text: 'No configuration steps required.', options: { breakLine: false } }], {
    x: C2X, y: textY, w: C2W, h: configH - 0.28,
    fontSize: 9, color: C.textDark, fontFace: 'Arial', valign: 'top',
  });

  // Prerequisites
  const preY = BODY_Y + configH + SEC_GAP;
  textY = sectionHeader(C2X, preY, C2W, 'PREREQUISITES', C.gray600);
  const preBullets = (content.prerequisites ?? []).slice(0, 4).map(p => ({ text: `·  ${p}`, options: { breakLine: true } }));
  slide.addText(preBullets.length ? preBullets : [{ text: '·  No specific prerequisites required.', options: { breakLine: false } }], {
    x: C2X, y: textY, w: C2W, h: prereqH - 0.28,
    fontSize: 9, color: C.textMid, fontFace: 'Arial', valign: 'top',
  });

  // Risks
  const rkY = preY + prereqH + SEC_GAP;
  textY = sectionHeader(C2X, rkY, C2W, 'RISKS & CHANGE MANAGEMENT', C.red);
  addTextSafe(slide, content.risks || 'Low change management impact. Standard communication recommended.',
    C2X, textY, C2W, risksH - 0.28, { color: C.textMid, fontFace: 'Arial', wrap: true, valign: 'top' }, 9, 7.5);

  // ── CTA FOOTER (pinned to bottom) ──
  const CTA_Y = H - FOOTER_H;
  rect(slide, SB, CTA_Y, W - SB, FOOTER_H, C.navyMid);
  rect(slide, SB, CTA_Y, 0.05, FOOTER_H, C.purple);
  slide.addText('ACTION:', { x: CX + 0.08, y: CTA_Y + 0.03, w: 0.72, h: FOOTER_H - 0.06, fontSize: 9, bold: true, color: C.purple, fontFace: 'Arial', valign: 'middle' });
  addTextSafe(slide, content.userAction, CX + 0.78, CTA_Y + 0.03, CW - 0.78, FOOTER_H - 0.06,
    { color: C.gray200, fontFace: 'Arial', valign: 'middle' }, 9.5, 7.5);
}

// ─── DIAGRAM SLIDE ────────────────────────────────────────────────────────────
async function buildDiagramSlide(
  pres: PptxGenJS, content: SlideContent, slideNum: number, opts: PresentationOptions
) {
  const imgDataUri = await generateDiagramUrl(content.diagramDefinition ?? '');
  if (!imgDataUri) return;

  const slide = pres.addSlide();
  rect(slide, 0, 0, W, H, C.gray100);

  // Header bar
  rect(slide, 0, 0, W, 0.82, C.navyMid);
  rect(slide, 0, 0, W, 0.05, C.purple);
  slide.addText(`Workflow Diagram`, { x: M, y: 0.06, w: 3.5, h: 0.42, fontSize: 13, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle' });
  slide.addText(`${content.title}`, { x: M, y: 0.44, w: W - 2 * M, h: 0.3, fontSize: 9, color: C.gray400, fontFace: 'Arial' });
  rect(slide, W - 1.2, 0.12, 0.85, 0.58, C.purple);
  slide.addText(`#${String(slideNum).padStart(2, '0')}`, { x: W - 1.2, y: 0.12, w: 0.85, h: 0.58, fontSize: 12, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle' });

  // Diagram image — safe bounds
  const IMG_Y = 0.98;
  const IMG_H = H - IMG_Y - 0.38;
  slide.addImage({
    data: imgDataUri,
    x: M, y: IMG_Y, w: W - 2 * M, h: IMG_H,
    sizing: { type: 'contain', w: W - 2 * M, h: IMG_H },
  });

  // Footer
  rect(slide, 0, H - 0.32, W, 0.32, C.navyMid);
  slide.addText(`${content.featureId}  ·  ${opts.clientName}  ·  ${opts.releaseVersion}`, {
    x: M, y: H - 0.28, w: W - 2 * M, h: 0.22, fontSize: 8, color: C.gray400, fontFace: 'Arial', align: 'left',
  });
}

// ─── SUMMARY SLIDE ────────────────────────────────────────────────────────────
function buildSummarySlide(pres: PptxGenJS, opts: PresentationOptions) {
  const slide = pres.addSlide();
  rect(slide, 0, 0, W, H, C.navyMid);
  rect(slide, 0, 0, W, 0.06, C.purple);
  rect(slide, 0, H - 0.06, W, 0.06, C.purple);

  // Decorative circle
  slide.addShape('ellipse', { x: W - 2.8, y: -0.5, w: 3.8, h: 3.8, fill: { color: C.purple, transparency: 88 }, line: { color: C.purple, width: 0 } });

  slide.addText('Next Steps & Recommendations', {
    x: M, y: 0.25, w: W - 2 * M, h: 0.52, fontSize: 22, bold: true, color: C.white, fontFace: 'Arial',
  });
  rect(slide, M, 0.82, 1.8, 0.04, C.purple);

  const steps = [
    'Review features with functional leads and confirm which require tenant configuration.',
    'Run a Sandbox test cycle for all "Setup Required" features before the production go-live date.',
    'Assign security roles and configure business processes as detailed in each feature slide.',
    'Communicate changes to end users at least 2 weeks before the production release date.',
    'Validate all Opt-In features in the Preview tenant before the production cutover.',
    'Schedule a deep-dive session for any Setup Required features with your Accenture team.',
  ];

  const stepH = (H - 1.1 - 0.4) / steps.length - 0.06;
  steps.forEach((step, i) => {
    const sy = 1.0 + i * (stepH + 0.06);
    rect(slide, M, sy, W - 2 * M, stepH, C.navyLight);
    rect(slide, M, sy, 0.05, stepH, C.purple);
    slide.addText(`${i + 1}.  ${step}`, {
      x: M + 0.18, y: sy + 0.03, w: W - 2 * M - 0.28, h: stepH - 0.06,
      fontSize: 10, color: C.gray200, fontFace: 'Arial', valign: 'middle',
    });
  });

  slide.addText(`Prepared for ${opts.clientName}  ·  Accenture Workday Practice  ·  Confidential`, {
    x: M, y: H - 0.28, w: W - 2 * M, h: 0.22, fontSize: 8, color: C.gray400, fontFace: 'Arial', align: 'center',
  });
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
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

  buildCoverSlide(pres, options, slides.length);
  buildTOCSlide(pres, slides, options);

  for (let i = 0; i < slides.length; i++) {
    const content = slides[i];
    const meta    = featuresMeta?.[i];
    await buildFeatureSlide(pres, content, i + 1, options, meta);
    if (content.diagramType === 'mermaid' && content.diagramDefinition) {
      await buildDiagramSlide(pres, content, i + 1, options);
    }
  }

  buildSummarySlide(pres, options);
  return await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
}
