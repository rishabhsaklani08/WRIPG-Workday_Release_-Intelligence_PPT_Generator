import Groq from 'groq-sdk';
import { z } from 'zod';
import { WorkdayFeature, SlideContent, AudienceMode } from '../types';

const SlideContentSchema = z.object({
  featureId:      z.string(),
  title:          z.string(),
  tagline:        z.string(),
  overview:       z.string(),
  businessImpact: z.string(),
  keyBenefits:    z.array(z.string()),
  configSteps:    z.array(z.string()),
  prerequisites:  z.array(z.string()),
  risks:          z.string(),
  userAction:     z.string(),
  timeline:       z.string(),
});
const SlideContentArraySchema = z.array(SlideContentSchema);

// ─── Groq client ─────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL     = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_RETRY = 2;

// ─── Audience persona context ─────────────────────────────────────────────────
const AUDIENCE_CONTEXT: Record<AudienceMode, string> = {

  consultant: `AUDIENCE: Workday Implementation Consultants and Solution Architects.

Tone: Highly technical, precise, consultant-grade. Write as a peer — not as a trainer.

Content Standards (NON-NEGOTIABLE):
- configSteps must reference EXACT Workday menu paths (e.g. "Workday menu > Maintain Business Process Security Policies > [BP Name]"), exact task names, and the precise order of operations including Save/Submit actions.
- prerequisites must name specific security domain names (e.g. "Worker Data: Personal Information"), BP types, EIB/integration dependencies, and tenant configuration flags that must be enabled.
- keyBenefits must quantify consultant and client project impact: e.g. "Reduces tenant setup effort by ~40% by eliminating manual BP cloning across 15+ orgs — saving approximately 3 sprint days on a typical global deployment."
- risks must cover: BP regression risks, downstream integration payload changes (EIB/PECI/PICOF), data migration edge cases, cross-module dependencies (e.g. Compensation BP impacts on Absence), and UAT re-test scope.
- businessImpact must address: impact on project scope, UAT cycle complexity, change management workload, and client go-live readiness timeline.
- userAction must be a precise, day-1 implementation action a consultant would actually take in the tenant today.
- overview must explain the technical architecture change at the data model, BP framework, or integration level, and why Workday prioritised it.`,

  executive: `AUDIENCE: C-Suite Executives — CFO, CHRO, CIO, COO.

Tone: Strategic, visionary, outcome-obsessed. Zero technical jargon. Write like a McKinsey board presentation.

Content Standards (NON-NEGOTIABLE):
- tagline must be a powerful 1-sentence business headline leading with quantified value: dollar impact, time saved, risk eliminated, or competitive edge. Example: "Cut month-end close by up to 3 days and reduce reconciliation errors by 80% across all subsidiary entities."
- overview must tell the business story: the operational problem being solved, the scale of impact across the organisation, and why this is strategically important now.
- businessImpact must name specific executive roles (Controller, CHRO, Payroll Director, CIO), quantify efficiency gains in hours/FTEs/%, and connect to compliance, audit readiness, or regulatory relevance.
- keyBenefits must be C-suite-grade insights: reference industry benchmarks (Gartner, Deloitte, Accenture research where relevant), frame in terms of EBITDA impact, headcount reduction, audit risk reduction, or employee NPS improvement.
- configSteps should be high-level strategic actions — "what your leadership team must direct and by when" — not technical menu paths.
- risks must be framed as business risk: change management investment, retraining cost, transition timeline, and what happens if the organisation delays adoption.
- userAction must be an executive directive: e.g. "Instruct your Workday programme director to include this feature in the next release sprint and confirm opt-in election before the Preview window closes."
- timeline must state business-critical go-live dates and whether inaction before a deadline results in automatic changes or missed opportunity.`,

  admin: `AUDIENCE: Workday System Administrators and Tenant Managers.

Tone: Procedural, checklist-driven, zero ambiguity. Write like a production runbook.

Content Standards (NON-NEGOTIABLE):
- configSteps RULE — READ CAREFULLY:
  * If setupEffort is "Automatically Available": do NOT write configuration steps. Instead write 2-3 verification/awareness steps only — e.g. "Search for '[Report Name]' in the Workday search bar and confirm the new behaviour is visible", "Notify affected business users that the change is now live", "Review audit logs or report output to validate correctness".
  * If setup IS required: write a precise, numbered checklist using the Workday search bar for navigation (e.g. "Search for 'Edit Tenant Setup' in the Workday search bar > navigate to [Section] > enable [Toggle Name] > Save"). Include conditional steps where applicable.
- prerequisites must list: exact security roles required (e.g. "System Auditor", "Security Administrator", "Compensation Administrator"), specific BP definitions that must exist, tenant feature flags to check, and sequence dependencies.
- keyBenefits must be operational and measurable: reduced manual effort (e.g. "Eliminates 45 minutes of weekly manual data cleanup"), fewer helpdesk tickets, improved data accuracy %, faster audit response time.
- risks must be admin-focused and actionable: what breaks or behaves unexpectedly if misconfigured, how to validate before go-live, the rollback approach, and which end-user groups to proactively notify.
- businessImpact must describe the before/after operational state with specifics: e.g. "Previously, admins manually updated 12 individual BP security policy steps across 4 orgs; this feature auto-propagates the policy change to all linked child organisations in a single action."
- userAction must be the exact first step to take in the tenant today, with the navigation path and the expected outcome.
- overview must describe the functional change from the admin's perspective: which tasks, dashboards, reports, or integrations are affected and how the admin's workflow changes.
- timeline must specify: Preview vs Production window, opt-in deadline if applicable, whether any automated migration will occur, and what admins need to verify after the migration.`,
};

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(audienceMode: AudienceMode): string {
  return `You are a Principal Workday SME, certified across Financials, HCM, Payroll, and Platform, with 15+ years of Workday implementation and release management experience. You have authored release communications for Fortune 500 clients and led release readiness programmes for Accenture's global Workday practice.

${AUDIENCE_CONTEXT[audienceMode]}

YOUR TASK: For each Workday feature provided, generate PREMIUM, EXPERT-LEVEL slide content for a client-facing Accenture PowerPoint deck. This deck will be reviewed by senior client stakeholders. Generic, shallow, templated, or vague content is completely unacceptable and will be rejected.

CRITICAL OUTPUT RULES:
1. Return ONLY a valid JSON array — zero prose, zero markdown fences, no comments outside the JSON structure.
2. The array must contain exactly ONE object per input feature, in the same order as the input.
3. EVERY field must be substantive and specific to THIS feature — never reuse patterns across slides.
4. Quantify wherever possible: percentages, hours saved, FTE impact, number of steps reduced, error rates.
5. Minimums: overview ≥ 3 sentences · businessImpact ≥ 3 sentences · keyBenefits ≥ 5 items · prerequisites ≥ 3 items.
6. configSteps: IF setupEffort is "Automatically Available" → write 2-3 verification steps only (no setup). IF setup is required → write ≥ 4 precise steps using Workday search bar navigation.
7. NEVER write "Navigate to Workday menu" — Workday has no such thing. Always say "Search for '[Task Name]' in the Workday search bar".

OUTPUT SCHEMA (strict — all fields required, no additional fields):
{
  "featureId": "The exact JIRA/feature ID from the input — do not modify",

  "title": "Benefit-led slide headline, max 60 characters. Do NOT use the raw Workday feature name — reframe it as a business outcome the client cares about. E.g. 'Automate Intercompany Journals to Cut Close by 3 Days'.",

  "tagline": "One powerful, quantified sentence written for a CFO with 5 seconds to read. Lead with the measurable business outcome. E.g. 'Eliminate manual reconciliation across 100+ subsidiaries and cut finance overtime by up to 35%.'",

  "overview": "3-4 sentences covering: (1) What specifically changed in Workday at the feature/data-model/process level. (2) What real-world problem or operational gap this solves. (3) How the new behaviour works in practice. (4) Why Workday prioritised this in this release cycle.",

  "businessImpact": "3-4 sentences covering: (1) Which specific business roles are impacted and how their day-to-day workflow changes. (2) Measurable efficiency gain — time saved, error reduction %, or FTE impact. (3) Compliance, audit, or regulatory relevance if applicable. (4) Downstream impact on adjacent teams, reports, or integrations.",

  "keyBenefits": [
    "Benefit 1 — outcome first, then quantified: e.g. 'Reduces month-end close by up to 2 days by eliminating 300+ manual journal lines per period'",
    "Benefit 2 — operational improvement with specifics",
    "Benefit 3 — risk reduction or compliance gain",
    "Benefit 4 — user experience or employee productivity improvement",
    "Benefit 5 — strategic or competitive advantage",
    "Benefit 6 — integration or downstream system improvement (if applicable)"
  ],

  "configSteps": [
    "IMPORTANT — Choose the correct format based on setupEffort:",
    "IF Automatically Available: Step 1: Search for '[relevant task or report name]' in the Workday search bar to verify the new behaviour is active",
    "IF Automatically Available: Step 2: Notify affected user groups that this change is now live in production",
    "IF Automatically Available: Step 3: Validate output accuracy by reviewing [specific report/task] and confirming expected results",
    "--- OR IF SETUP IS REQUIRED ---",
    "Step 1: Search for '[Exact Workday Task Name]' in the Workday search bar > [specific action with field values]",
    "Step 2: [Follow-on configuration with any conditional logic — e.g. 'Only if Opt-In is enabled']",
    "Step 3: Search for '[Validation task]' in the Workday search bar to verify the configuration is applied correctly",
    "Step 4: Communicate the change to affected end users and provide any guidance needed",
    "Step 5+: Additional steps as required"
  ],

  "prerequisites": [
    "Prerequisite 1: [Specific security domain name, security role, or access right required]",
    "Prerequisite 2: [Feature flag, tenant opt-in status, or Workday version requirement]",
    "Prerequisite 3: [Upstream module configuration, integration, or BP definition that must exist first]",
    "Additional prerequisites as relevant to this specific feature"
  ],

  "risks": "2-3 sentences: (1) Primary change management or technical risk specific to this feature. (2) Which user groups or teams need to be trained or notified before go-live. (3) Rollback approach, regression risk, or critical dependency that would cause issues if skipped.",

  "userAction": "One precise, imperative call-to-action. State: WHAT to do, WHO should do it, and WHEN (include any deadline). E.g. 'Workday Admin: Navigate to Edit Tenant Setup > Financials, enable the Intercompany Automation flag, run a regression test on the Period Close BP, and confirm opt-in before the 2026R1 Preview freeze date.'",

  "timeline": "Clear statement of: (1) Preview vs Production availability. (2) Opt-in or automatically enabled. (3) Exact go-live date or release window. (4) Any deadline before auto-enablement. (5) Migration or data impact admins should anticipate."
}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateSlideContent(
  features: WorkdayFeature[],
  audienceMode: AudienceMode,
  attempt = 0
): Promise<SlideContent[]> {

  const userPrompt = `Generate premium, expert-level slide content for these ${features.length} Workday release feature(s).

INSTRUCTIONS:
- Analyse ALL provided fields (description, detail, setupEffort, optIn, domain, productionDate) deeply before writing.
- Extract every technical and business insight from the feature data — do not pad with generic statements.
- CRITICAL: If setupEffort is "Automatically Available" — configSteps must contain ONLY 2-3 verification/awareness steps (e.g. search for the task in the Workday search bar to confirm the change, notify users). Do NOT write any configuration or setup steps — the feature needs NO admin action to enable.
- CRITICAL: If setup IS required — write detailed configSteps using the Workday search bar as the navigation method. NEVER say "Workday menu" — it does not exist. Always say "Search for '[Task Name]' in the Workday search bar".
- If optIn is true, flag this clearly in the timeline and userAction fields with urgency.

FEATURES:
${JSON.stringify(
  features.map(f => ({
    featureId:      f.id,
    title:          f.title,
    domain:         f.domain,
    description:    f.description.slice(0, 1200),
    detail:         f.detail.slice(0, 3000),
    setupEffort:    f.setupEffort,
    optIn:          f.optIn,
    tenant:         f.tenant,
    productionDate: f.productionDate,
  })),
  null, 2
)}`;

  const completion = await groq.chat.completions.create({
    model:           MODEL,
    temperature:     0.3,
    max_tokens:      8192,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(audienceMode) },
      { role: 'user',   content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  // ── Extract & parse JSON ──────────────────────────────────────────────────
  let parsed: unknown;
  try {
    const trimmed = raw.trim();
    const firstBrace   = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    let jsonStr: string;

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      jsonStr = trimmed.slice(firstBracket, trimmed.lastIndexOf(']') + 1);
    } else if (firstBrace !== -1) {
      jsonStr = trimmed.slice(firstBrace, trimmed.lastIndexOf('}') + 1);
    } else {
      throw new SyntaxError('No JSON object or array found in response');
    }

    parsed = JSON.parse(jsonStr);
  } catch {
    if (attempt < MAX_RETRY) {
      console.warn(`[groq] JSON parse failed on attempt ${attempt + 1} — retrying…`);
      return generateSlideContent(features, audienceMode, attempt + 1);
    }
    throw new Error(`Groq returned un-parseable JSON after ${MAX_RETRY + 1} attempts.`);
  }

  // ── Normalise: find the slide array wherever Groq nested it ──────────────
  let candidate: unknown = parsed;
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    candidate =
      obj.slides ?? obj.features ?? obj.data ?? obj.results ?? obj.content ??
      Object.values(obj).find(v => Array.isArray(v) && (v as unknown[]).length > 0) ??
      parsed;
  }

  // ── Zod validation ────────────────────────────────────────────────────────
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
