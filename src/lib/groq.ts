import Groq from 'groq-sdk';
import { z } from 'zod';
import { WorkdayFeature, SlideContent, AudienceMode } from '../types';

const SlideContentSchema = z.object({
  featureId:         z.string(),
  title:             z.string(),
  tagline:           z.string(),
  overview:          z.string(),
  businessImpact:    z.string(),
  keyBenefits:       z.array(z.string()),
  configSteps:       z.array(z.string()),
  prerequisites:     z.array(z.string()),
  risks:             z.string(),
  userAction:        z.string(),
  timeline:          z.string(),
  diagramType:       z.enum(['mermaid', 'none']),
  diagramDefinition: z.string().nullable().optional().transform(v => v ?? ''),
});
const SlideContentArraySchema = z.array(SlideContentSchema);

// ─── Groq client ─────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL     = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_RETRY = 2;

// ─── Audience persona context ─────────────────────────────────────────────────
const AUDIENCE_CONTEXT: Record<AudienceMode, string> = {
  consultant:
    'AUDIENCE: Workday Implementation Consultants.\n' +
    'Tone: Technical, precise, action-oriented.\n' +
    'Focus: Configuration steps, security domain requirements, BP changes, integration impacts, testing considerations, tenant setup order.',
  executive:
    'AUDIENCE: C-Suite Executives (CFO, CHRO, CIO).\n' +
    'Tone: Strategic, outcome-focused, jargon-free.\n' +
    'Focus: Business ROI, efficiency gains, risk mitigation, competitive advantage, headline metrics. No deep technical steps.',
  admin:
    'AUDIENCE: Workday System Administrators.\n' +
    'Tone: Procedural, checklist-driven.\n' +
    'Focus: Day-to-day setup, security roles, business process framework, audit considerations, user notifications, testing checklists.',
};

// ─── Per-feature system prompt ────────────────────────────────────────────────
function buildSystemPrompt(audienceMode: AudienceMode): string {
  return `You are a senior Workday SME and release communications expert with 10+ years of Workday consulting experience.
${AUDIENCE_CONTEXT[audienceMode]}

Your task: For each Workday feature provided, generate RICH, DETAILED slide content for a premium Accenture-branded PowerPoint deck.

CRITICAL OUTPUT RULES:
1. Return ONLY a raw JSON array — zero prose, zero markdown fences, no trailing comments.
2. The array must contain exactly ONE object per input feature, in the same order.
3. Every string field must be SUBSTANTIVE — never less than 2 sentences. Bullet points must be specific and quantified where possible.
4. For diagrams: ALWAYS generate a Mermaid flowchart/sequence diagram unless the feature is purely an aesthetic UI change. The diagram must accurately model the Workday configuration workflow or data flow described.
5. diagramDefinition must NOT be wrapped in markdown backticks.

SCHEMA (strict — all fields required):
{
  "featureId": "JIRA key exactly as given",
  "title": "Concise, benefit-led slide title (max 60 chars)",
  "tagline": "Single sentence executive hook. Lead with the business outcome. E.g. 'Reduce intercompany reconciliation time by up to 70% with automated AI matching.'",
  "overview": "2-3 sentence technical overview. Describe WHAT changed, WHY Workday made this change, and HOW it works under the hood.",
  "businessImpact": "2-3 sentences describing measurable business value. Reference specific roles affected, time saved, error reduction, or compliance improvements.",
  "keyBenefits": ["Specific benefit 1 with metric/quantifier", "Specific benefit 2", "..."],
  "configSteps": ["Step 1: action + where in Workday menu", "Step 2", "..."],
  "prerequisites": ["Prerequisite 1 (e.g. security domain, existing config)", "..."],
  "risks": "1-2 sentences on change management impact, training needs, or rollback considerations.",
  "userAction": "One clear CTA sentence. What does the admin/consultant need to do FIRST after reading this slide?",
  "timeline": "When is this available? Is it opt-in? Preview vs Production? Include dates if known.",
  "diagramType": "mermaid",
  "diagramDefinition": "graph TD\\n    A[User] --> B[Workday Task]\\n    B --> C{Decision}\\n    C --> D[Outcome 1]\\n    C --> E[Outcome 2]"
}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateSlideContent(
  features: WorkdayFeature[],
  audienceMode: AudienceMode,
  attempt = 0
): Promise<SlideContent[]> {

  const userPrompt = `Generate detailed slide content for these ${features.length} Workday release feature(s).
Use ALL available context (description, detail, setupEffort, optIn) to produce rich, substantive content.

FEATURES:
${JSON.stringify(
  features.map(f => ({
    featureId:   f.id,
    title:       f.title,
    domain:      f.domain,
    description: f.description.slice(0, 1000),   // cap to avoid token overflow
    detail:      f.detail.slice(0, 2000),
    setupEffort: f.setupEffort,
    optIn:       f.optIn,
    tenant:      f.tenant,
    productionDate: f.productionDate,
  })),
  null, 2
)}`;

  const completion = await groq.chat.completions.create({
    model:           MODEL,
    temperature:     0.25,      // Lower temp = more deterministic, factual output
    max_tokens:      8192,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(audienceMode) },
      { role: 'user',   content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  // ── Extract & parse JSON from raw string ────────────────────────────────────
  // Llama sometimes prepends/appends text around the JSON. Find the outermost
  // { or [ and extract from there.
  let parsed: unknown;
  try {
    const trimmed = raw.trim();
    // Locate the first { or [ and last } or ]
    const firstBrace   = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    let jsonStr: string;

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      // Outer container is an array
      jsonStr = trimmed.slice(firstBracket, trimmed.lastIndexOf(']') + 1);
    } else if (firstBrace !== -1) {
      // Outer container is an object
      jsonStr = trimmed.slice(firstBrace, trimmed.lastIndexOf('}') + 1);
    } else {
      throw new SyntaxError('No JSON object or array found in response');
    }

    parsed = JSON.parse(jsonStr);
  } catch {
    if (attempt < MAX_RETRY) {
      console.warn(`[groq] JSON extract/parse failed on attempt ${attempt + 1} — retrying…`);
      return generateSlideContent(features, audienceMode, attempt + 1);
    }
    throw new Error(`Groq returned un-parseable JSON after ${MAX_RETRY + 1} attempts.`);
  }

  // ── Normalise: find the slide array wherever Groq nested it ─────────────────
  let candidate: unknown = parsed;
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    candidate =
      obj.slides ?? obj.features ?? obj.data ?? obj.results ?? obj.content ??
      Object.values(obj).find(v => Array.isArray(v) && (v as unknown[]).length > 0) ??
      parsed; // single object — handled below
  }

  // ── Zod validation (with single-object fallback) ─────────────────────────────
  let result = SlideContentArraySchema.safeParse(candidate);

  if (!result.success && !Array.isArray(candidate) && typeof candidate === 'object' && candidate !== null) {
    const single = SlideContentSchema.safeParse(candidate);
    if (single.success) {
      result = SlideContentArraySchema.safeParse([single.data]);
    }
  }

  if (!result.success) {
    if (attempt < MAX_RETRY) {
      console.warn(`[groq] Zod validation failed on attempt ${attempt + 1}:`, result.error.issues.slice(0, 3));
      return generateSlideContent(features, audienceMode, attempt + 1);
    }
    console.error('[groq] Final validation failures:', result.error.issues);
    throw new Error('Groq output schema mismatch after all retries. Check logs for details.');
  }

  return result.data;
}
