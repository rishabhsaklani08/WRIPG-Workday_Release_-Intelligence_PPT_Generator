import { WorkdayFeature } from '../types';

// Kept as a convenience fixture. Not used in production (workday.ts reads the real JSON).
export const mockFeatures: WorkdayFeature[] = [
  {
    id: 'FIN-2026-001', title: 'Automated Intercompany Reconciliation AI', domain: 'Finance',
    description: 'Leverages machine learning to automatically match and reconcile intercompany transactions across multiple legal entities.',
    detail: 'The AI matching engine analyses historical transaction patterns to predict potential matches and reduce manual effort by up to 80%.',
    releaseVersion: 'Workday 2026 Release 1', releaseShort: '2026R1',
    complexity: 'Setup Required', setupEffort: 'Setup Required', optIn: false,
    documentationUrl: '', tenant: 'Production', productionDate: '2026-02-06',
  },
  {
    id: 'FIN-2026-002', title: 'Enhanced Supplier Portal Dashboard', domain: 'Finance',
    description: 'A redesigned supplier portal dashboard with real-time invoice status, payment schedules, and dispute tracking.',
    detail: 'Suppliers can now access a unified view of all open invoices and resolve disputes without contacting AP directly.',
    releaseVersion: 'Workday 2026 Release 1', releaseShort: '2026R1',
    complexity: 'Automatically Available', setupEffort: 'Automatically Available', optIn: false,
    documentationUrl: '', tenant: 'Production', productionDate: '2026-02-06',
  },
  {
    id: 'HCM-2026-001', title: 'Skills Cloud Auto-Tagging', domain: 'HCM',
    description: 'Automatically analyses employee feedback and project completions to suggest skills to add to their profile.',
    detail: 'Uses NLP to parse unstructured text and surfaces ranked skill suggestions to both the employee and manager.',
    releaseVersion: 'Workday 2026 Release 1', releaseShort: '2026R1',
    complexity: 'Setup Required', setupEffort: 'Setup Required', optIn: true,
    documentationUrl: '', tenant: 'Preview to Production', productionDate: '2026-02-06',
  },
];
