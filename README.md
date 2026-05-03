# Workday Zenith: Release Intelligence PPT Generator (WRIPG)

**Workday Zenith** is a high-performance, AI-driven automation tool designed to transform raw Workday "What's New" release data into professional, executive-ready PowerPoint presentations. Built for Workday consultants, administrators, and executives, it eliminates hours of manual deck building by leveraging Large Language Models (LLMs) to synthesize business impacts, configuration steps, and workflow diagrams.

---

## ✨ Key Features

- **Direct Workday Integration**: Fetches real-time release data via Workday RaaS (Reports-as-a-Service) with secure OAuth authentication.
- **AI-Powered Content Generation**: Uses **Groq (Llama 4 Scout)** to generate rich, substantive slide content tailored to specific audiences (Consultant, Executive, or Administrator).
- **Automated Workflow Diagrams**: Generates **Mermaid.js** flowcharts and sequence diagrams for complex features to visualize configuration steps and data flows.
- **Dynamic Branded PPTX Exports**: Produces high-fidelity, branded `.pptx` files with sidebar navigation, domain-coded badges, and professional layouts using `PptxGenJS`.
- **Intelligent Filtering**: Advanced multi-tier filtering by Release Version, Functional Domain, and Complexity (Setup Required vs. Automatically Available).
- **Premium Modern UI**: Built with a "Zenith" design system featuring glassmorphism, smooth animations, and a responsive two-column progress tracker.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js 16 (App Router)](https://nextjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **AI Inference**: [Groq SDK](https://groq.com/) (Llama 4 Scout 17B)
- **Styling**: Vanilla CSS with modern Glassmorphism principles
- **PPTX Engine**: [PptxGenJS](https://gitbrent.github.io/PptxGenJS/)
- **Diagrams**: [Mermaid.ink](https://mermaid.ink/) (Server-side rendering)
- **Portal Rendering**: React Portals for viewport-perfect modal overlays

---

## 📂 Project Structure

```text
/
├── public/                  # Static assets (logos, icons, etc.)
├── src/
│   ├── app/                 # Next.js App Router & API Handlers
│   │   ├── api/             # Serverless API endpoints
│   │   │   ├── features/    # Fetches filtered features from Workday/Cache
│   │   │   └── generate/    # Orchestrates AI content + PPTX creation
│   │   ├── globals.css      # Design system tokens & global animations
│   │   └── layout.tsx       # Root layout & font configurations
│   ├── components/          # Reusable UI components
│   │   ├── FeatureSelector.tsx  # Interactive grid with search & filters
│   │   ├── ProgressTracker.tsx # Real-time generation feedback & preview
│   │   └── ConfigPanel.tsx     # Client branding & audience settings
│   ├── lib/                 # Core business logic & utilities
│   │   ├── workday.ts       # Workday API client & singleton data cache
│   │   ├── groq.ts          # AI prompt engineering & content synthesis
│   │   ├── pptx-builder.ts  # Logic for slide layouts, styling & exports
│   │   └── diagram-renderer.ts # Logic for Mermaid diagram processing
│   ├── types/               # Unified TypeScript interface definitions
│   └── lib/                 # Utility functions (tailwind-merge equivalents)
├── .env.local               # Environment variables (API Keys, Client IDs)
├── AGENTS.md                # Specialized instructions for AI coding assistants
└── package.json             # Project dependencies & scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Workday ISU (Integration System User) with access to "What's New" reports.
- Groq API Key.

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```bash
# Workday RaaS Config
WORKDAY_CLIENT_ID=your_id
WORKDAY_CLIENT_SECRET=your_secret
WORKDAY_BASE_URL=https://your_tenant.workday.com/ccx/service/customreport2/...

# AI Config
GROQ_API_KEY=your_groq_key
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

### 3. Installation
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📊 Business Logic: Complexity Mapping

The system automatically maps Workday's "Setup Effort" field to our refined internal classification:
- **Setup Required**: Corresponds to features requiring functional configuration (High impact).
- **Automatically Available**: Corresponds to features delivered without setup (Low impact).

---

## 🛡 Security & Best Practices

- **Sanitized Inputs**: All client-provided names are strictly sanitized to prevent XML/Pptx injection.
- **Portal Isolation**: Modals are rendered outside the main DOM tree to bypass CSS stacking context issues.
- **Atomic Components**: Each UI element is designed to be focus-stable and highly interactive.

---

## 📝 License

This project is intended for internal use and professional Workday consulting engagements.
