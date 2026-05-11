export interface WorkdayFeature {
  id: string;                 // JIRA__ key e.g. "PAYWDI-1418"
  title: string;              // New_Functionality_Title
  domain: string;             // Derived from JIRA prefix
  description: string;        // Feature_Description
  detail: string;             // New_Functionality (longer detail)
  releaseVersion: string;     // e.g. "Workday 2026 Release 1"
  releaseShort: string;       // e.g. "2026R1"
  complexity: 'Setup Required' | 'Automatically Available'; // Derived from Setup_Effort
  setupEffort: string;        // "Setup Required" | "Automatically Available"
  optIn: boolean;             // Feature_Opt-In
  documentationUrl: string;   // Community_Post
  tenant: string;             // "Production" | "Preview to Production"
  productionDate: string;     // Production_Date
}

export interface SlideContent {
  featureId: string;
  title: string;
  tagline: string;            // 1-sentence executive summary
  overview: string;           // 2-3 sentence detailed overview
  businessImpact: string;     // Clear ROI / business value paragraph
  keyBenefits: string[];      // 3-5 bullet points of quantified benefits
  configSteps: string[];      // Ordered step-by-step configuration actions
  prerequisites: string[];    // What must be set up before this feature
  risks: string;              // Known risks / change management considerations
  userAction: string;         // Single clear call-to-action sentence
  timeline: string;           // Go-live timeline / availability info
}

export type AudienceMode = 'consultant' | 'executive' | 'admin';

export interface PresentationOptions {
  releaseVersion: string;
  audienceMode: AudienceMode;
  clientName: string;
}
