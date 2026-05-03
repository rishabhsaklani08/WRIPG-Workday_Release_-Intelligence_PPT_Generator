import { WorkdayFeature } from '../types';
import path from 'path';
import fs from 'fs';

/** Raw shape of one record in the Workday report JSON */
interface RawWorkdayEntry {
  JIRA__: string;
  New_Functionality_Title: string;
  Feature_Description: string;
  New_Functionality: string;
  Workday_Release: string;
  Setup_Effort: string;
  'Feature_Opt-In': string;
  Community_Post: string;
  Tenant: string;
  Production_Date: string;
  What_s_New_Item: string;
  Documentation_Corrected: string;
}

/**
 * Maps a JIRA project key prefix to a product domain.
 * Covers all major Workday module families.
 */
const DOMAIN_MAP: Record<string, string> = {
  // Finance
  FIN: 'Finance', FINAST: 'Finance', FINCSH: 'Finance', FINCLS: 'Finance',
  FINCPQ: 'Finance', FINCUST: 'Finance', FINREV: 'Finance', FINSA: 'Finance',
  FINSET: 'Finance', FINTAX: 'Finance', FINBIZ: 'Finance', ACCUM: 'Finance',
  // Payroll
  PAY: 'Payroll', PAYWDI: 'Payroll', PAYWDARCH: 'Payroll', PAYABS: 'Payroll',
  // HCM
  HCM: 'HCM', HCMCOMP: 'HCM', HCMCORE: 'HCM', HCMPERF: 'HCM', HRPOL: 'HCM',
  WFA: 'HCM', BENEFITS: 'HCM', ABSENCE: 'HCM', COMP: 'HCM',
  // Recruiting
  REC: 'Recruiting', RECRUIT: 'Recruiting', CXS: 'Recruiting', CAMP: 'Recruiting',
  // Planning
  PLN: 'Planning', PLNEVAL: 'Planning', PLNFORM: 'Planning', BUDGET: 'Planning',
  ANAPLAN: 'Planning',
  // Supply Chain
  SM: 'Supply Chain', SMINV: 'Supply Chain', SMORDER: 'Supply Chain',
  SMREQ: 'Supply Chain', SMSUPP: 'Supply Chain',
  // Learning
  LRN: 'Learning', LEARN: 'Learning',
  // Reporting / Analytics
  BI: 'Analytics', BICORE: 'Analytics', BIRUNTIME: 'Analytics',
  BIBUSINESSES: 'Analytics', BICOMPOSITE: 'Analytics', BIDATAX: 'Analytics',
  // Integration / Platform
  EIB: 'Integrations', TRI: 'Integrations', CTD: 'Integrations', INT: 'Integrations',
  DEVSVC: 'Platform', DEVSERVICES: 'Platform', DEVEXTTOOLS: 'Platform',
  // Security
  CONFIGSEC: 'Security', CONFIGPRIV: 'Security', AUTHN: 'Security', AUTHZ: 'Security',
};

/** Clean the JIRA key (some entries have trailing commas and newlines) */
function cleanJiraKey(raw: string): string {
  return (raw || '').split(/[\s,\n]/)[0].trim();
}

/** Derive domain from the JIRA key prefix */
function getDomain(jiraKey: string): string {
  const clean = cleanJiraKey(jiraKey);
  const prefix = clean.replace(/-\d+$/, '').toUpperCase();
  // Try progressively shorter prefix matches
  for (let len = prefix.length; len >= 2; len--) {
    const candidate = prefix.substring(0, len);
    if (DOMAIN_MAP[candidate]) return DOMAIN_MAP[candidate];
  }
  return 'General';
}

/** Map Setup_Effort → complexity tier */
function getComplexity(setupEffort: string): 'Setup Required' | 'Automatically Available' {
  if (!setupEffort) return 'Setup Required'; // default safe fallback
  const lower = setupEffort.toLowerCase();
  if (lower.includes('setup required')) return 'Setup Required';
  if (lower.includes('automatically')) return 'Automatically Available';
  return 'Setup Required'; // default safe fallback
}

/** Normalise release version label to a short key e.g. "2026R1" */
function toReleaseShort(raw: string): string {
  // "Workday 2026 Release 1" → "2026R1"
  const match = raw.match(/(\d{4})\s+Release\s+(\d)/i);
  if (match) return `${match[1]}R${match[2]}`;
  // Legacy "Workday 33" → "WD33"
  const legacy = raw.match(/Workday\s+(\d+)/i);
  if (legacy) return `WD${legacy[1]}`;
  return raw.replace(/\s+/g, '');
}

/** Convert one raw record → typed WorkdayFeature */
function mapEntry(entry: RawWorkdayEntry): WorkdayFeature {
  const id = cleanJiraKey(entry.JIRA__);
  return {
    id,
    title: entry.New_Functionality_Title?.trim() || 'Untitled Feature',
    domain: getDomain(entry.JIRA__),
    description: (entry.Feature_Description || '').trim(),
    detail: (entry.New_Functionality || '').trim(),
    releaseVersion: entry.Workday_Release || '',
    releaseShort: toReleaseShort(entry.Workday_Release || ''),
    complexity: getComplexity(entry.Setup_Effort),
    setupEffort: entry.Setup_Effort || '',
    optIn: entry['Feature_Opt-In'] === '1',
    documentationUrl: entry.Community_Post || '',
    tenant: entry.Tenant || '',
    productionDate: entry.Production_Date || '',
  };
}

// ─── Loaded once per process (singleton cache) ───────────────────────────────
let _allFeatures: WorkdayFeature[] | null = null;
let _isFetching: Promise<WorkdayFeature[]> | null = null;

async function loadAllFeatures(): Promise<WorkdayFeature[]> {
  if (_allFeatures) return _allFeatures;
  if (_isFetching) return _isFetching;

  _isFetching = (async () => {
    try {
      const { WORKDAY_CLIENT_ID, WORKDAY_CLIENT_SECRET, WORKDAY_BASE_URL, USE_MOCK_DATA } = process.env;

      // Fallback to local file if explicitly requested or missing URL
      if (USE_MOCK_DATA === 'true' || !WORKDAY_BASE_URL) {
        console.log('[workday] Using local JSON file fallback');
        const filePath = path.join(process.cwd(), "What_s_New_in_Workday_-_RS.json");
        if (!fs.existsSync(filePath)) {
          console.warn('[workday] Local JSON file not found, returning empty array');
          return [];
        }
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return processRawData(raw.Report_Entry || []);
      }

      console.log(`[workday] Fetching live data from Workday API...`);
      const auth = Buffer.from(`${WORKDAY_CLIENT_ID}:${WORKDAY_CLIENT_SECRET}`).toString('base64');
      
      const res = await fetch(WORKDAY_BASE_URL, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Workday API responded with ${res.status}: ${res.statusText}`);
      }

      const raw = await res.json();
      return processRawData(raw.Report_Entry || []);

    } catch (err) {
      console.error('[workday] Failed to load data:', err);
      throw err;
    } finally {
      _isFetching = null;
    }
  })();

  return _isFetching;
}

function processRawData(entries: RawWorkdayEntry[]): WorkdayFeature[] {
  // Map, deduplicate by JIRA key (keep last occurrence to get newest data)
  const deduped = new Map<string, WorkdayFeature>();
  for (const entry of entries) {
    const feature = mapEntry(entry);
    if (feature.id) deduped.set(feature.id, feature);
  }

  _allFeatures = Array.from(deduped.values());
  console.log(`[workday] Cached ${_allFeatures.length} unique features from Workday`);
  return _allFeatures;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetFeaturesOptions {
  releaseVersion?: string;   // e.g. "Workday 2026 Release 1" or short "2026R1"
  domain?: string | string[];
  limit?: number;
  search?: string;
}

/**
 * Main entry point. Fetches live data from Workday and caches it.
 */
export async function getWhatsNew(options: GetFeaturesOptions = {}): Promise<WorkdayFeature[]> {
  const all = await loadAllFeatures();
  let result = all;

  // Filter by release version (accept both "Workday 2026 Release 1" and "2026R1")
  if (options.releaseVersion) {
    const rv = options.releaseVersion.trim();
    result = result.filter(f =>
      f.releaseVersion === rv || f.releaseShort === rv
    );
  }

  // Filter by domain
  if (options.domain) {
    const domains = (Array.isArray(options.domain) ? options.domain : [options.domain])
      .map(d => d.toLowerCase());
    result = result.filter(f => domains.includes(f.domain.toLowerCase()));
  }

  // Free-text search across title + description
  if (options.search) {
    const q = options.search.toLowerCase();
    result = result.filter(f =>
      f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  }

  // Optional hard limit
  if (options.limit && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Returns the list of all unique release versions present in the data,
 * most recent first.
 */
export async function getAvailableReleases(): Promise<string[]> {
  const all = await loadAllFeatures();
  const seen = new Set<string>();
  const releases: string[] = [];
  for (const f of all) {
    if (f.releaseShort && !seen.has(f.releaseShort)) {
      seen.add(f.releaseShort);
      releases.push(f.releaseShort);
    }
  }
  // Most recent first (simple string sort descending — works for "2026R1" style)
  return releases
    .filter(r => /^\d{4}R\d/.test(r))
    .sort((a, b) => b.localeCompare(a));
}

/**
 * Returns all unique domain values present in the data.
 */
export async function getAvailableDomains(): Promise<string[]> {
  const all = await loadAllFeatures();
  const domains = new Set(all.map(f => f.domain));
  return [...domains].filter(d => d !== 'General').sort();
}
