# Workday Release Intelligence PPT Generator (WRIPG)

## Project Overview
WRIPG is a full-stack Next.js web application designed to automate the creation of Accenture-branded PowerPoint presentations based on raw Workday release notes. It ingests a massive, live Workday JSON export (~40,000 features), allows users to filter and select specific features, and leverages AI (Groq / Llama 4 Scout) to synthesize the raw technical data into audience-specific slide content (Consultant, Admin, or Executive).

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (`globals.css`) with custom glassmorphism components
- **AI Integration:** Groq SDK (`meta-llama/llama-4-scout-17b-16e-instruct`)
- **Validation:** Zod (for strictly enforcing LLM JSON schemas)
- **Presentation Builder:** `pptxgenjs`
- **Diagrams:** Mermaid.js syntax rendered via the `mermaid.ink` API

## Core Architecture & Workflow

### 1. Data Ingestion (`src/lib/workday.ts`)
- The app reads directly from a 40,000+ record JSON export (`What_s_New_in_Workday_-_RS.json`).
- Features are deduplicated and mapped to a strict domain model (`WorkdayFeature`).
- Domains are intelligently derived from JIRA Key prefixes (e.g., `FIN*` -> Finance, `HCM*` -> HCM).
- Complexity is derived from the `Setup_Effort` field.

### 2. User Interface (`src/app/page.tsx` & `src/components/`)
- **Step 1: Feature Selector:** A high-performance grid allowing users to filter by Release Version, Domain, and Search Query. Includes pagination (30 items/page).
- **Step 2: Configuration:** User inputs Client Name, Target Audience, and Release Version.
- **Step 3: Progress & Preview:** Displays real-time progress steps. Upon completion, shows a horizontal scrollable gallery of the generated slides.

### 3. AI Generation (`src/lib/groq.ts` & `src/app/api/generate/route.ts`)
- Selected features are sent to the Next.js API route (`/api/generate`).
- The API uses the Groq SDK in `json_object` mode to request structured slide data from Llama 4 Scout.
- **Robust Parsing:** The parser includes safety fallbacks to dynamically locate arrays deeply nested in LLM conversational text, and automatically wraps single-object returns in arrays to satisfy Zod validation.
- Outputs include Title, Overview, Business Impact, Config Steps, and Mermaid Diagram definitions.

### 4. PPTX Assembly (`src/lib/pptx-builder.ts` & `src/lib/diagram-renderer.ts`)
- Mermaid definitions are sent to `mermaid.ink` to be rendered as Base64 PNGs.
- `pptxgenjs` constructs an Accenture-branded 16:9 presentation in memory, injecting the AI content and diagram images.
- The presentation is written to a raw `ArrayBuffer`.

### 5. Delivery
- The API returns a combined JSON response:
  ```json
  {
    "slides": [ ... ], // Array of SlideContent objects for the UI Preview
    "pptxBase64": "..." // Base64 encoded ArrayBuffer of the PPTX
  }
  ```
- The frontend decodes the slides for the Preview Gallery, and attaches the Base64 string to an `<a>` tag as a `data:` URI, bypassing blob memory quirks and ensuring a reliable `.pptx` file download on all browsers.

## Key Files & Directories
- `src/types/index.ts`: Core interfaces (`WorkdayFeature`, `SlideContent`, `AudienceMode`).
- `src/lib/groq.ts`: AI engine, prompting, and schema enforcement.
- `src/lib/workday.ts`: Live data parsing and API query logic.
- `src/lib/pptx-builder.ts`: PowerPoint slide master definitions and generation logic.
- `src/app/page.tsx`: Main client-side application shell and state management.
- `src/app/api/features/route.ts`: API endpoints for fetching releases, domains, and paginated features.
- `src/app/api/generate/route.ts`: Core orchestration endpoint (Feature -> AI -> PPTX -> Base64).

## Current State & Next Steps
- **Status:** Phase 4 completed. Live data ingestion, Groq integration, robust error handling, UI slide previews, and base64 downloading are fully functional.
- **Next Phase:** Phase 5 (Production Deployment). Ensure environment variables (`GROQ_API_KEY`) are set securely, audit any remaining hardcoded values, and deploy to Vercel Serverless. Note: Vercel Free Tier limits functions to a 60s execution time, so keeping Groq inferences fast is critical.
