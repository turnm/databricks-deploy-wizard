# CLAUDE.md — Databricks Deployment Wizard

## What we're building

A **client-side single-page wizard** that takes a completely new customer — someone with **no Databricks account and no Databricks admin** — from "we want to try Databricks" to a personalised, actionable deployment plan in under five minutes.

The user answers a short series of questions. The wizard outputs:

1. **A recommendation** — which cloud entry route and workspace type to use
2. **A personalised prerequisites checklist** — downloadable as markdown, with their answers baked in
3. **Generated infrastructure code** — Terraform (all clouds) with their inputs substituted as variables, plus CloudFormation (AWS) or ARM/Bicep (Azure) where relevant
4. **A step-by-step "first 60 minutes" plan** — signup → workspace → first query

**Design principle: as simple as possible.** No login, no backend, no data leaves the browser. Every question must earn its place — if an answer doesn't change the output, delete the question.

## Tech standards (non-negotiable)

- **Vite + React 18 + TypeScript**, strict mode
- **Tailwind CSS** for styling — clean, professional, generous whitespace
- **pnpm** for package management (never npm or yarn)
- **No backend. No API calls. No analytics. No cookies.** Pure static SPA, deployable to GitHub Pages / S3 + CloudFront
- **British English** in all UI copy, comments, and generated documents
- State via React hooks only (`useState`/`useReducer`) — no Redux, no context sprawl
- All decision logic and content **data-driven** from typed config files, never hard-coded in components
- `pnpm build` must produce a working static bundle with zero warnings

## Project structure

```
databricks-deploy-wizard/
├── CLAUDE.md
├── index.html
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Wizard.tsx            # step orchestration, progress bar
│   │   ├── QuestionCard.tsx      # renders one question (radio/select/toggle)
│   │   ├── ResultsPage.tsx       # recommendation + tabs for checklist/code/plan
│   │   ├── CodeBlock.tsx         # syntax-highlighted, copy button
│   │   └── DownloadButton.tsx    # client-side blob download (.md, .tf, .yaml)
│   ├── engine/
│   │   ├── types.ts              # Question, Answer, Recommendation, CloudProvider
│   │   ├── decisionTree.ts       # pure function: answers → recommendation
│   │   └── generators/
│   │       ├── checklist.ts      # answers → markdown checklist
│   │       ├── terraform.ts      # answers → .tf files per cloud
│   │       ├── cloudformation.ts # AWS only
│   │       └── armBicep.ts       # Azure only
│   └── content/
│       ├── questions.ts          # the question flow (single source of truth)
│       ├── aws.ts                # AWS-specific copy, steps, links, snippets
│       ├── azure.ts              # Azure-specific
│       └── gcp.ts                # GCP-specific
└── tests/
    └── decisionTree.test.ts      # vitest — every path through the tree
```

## The question flow

Keep it to **six questions maximum**. Branch, don't pile on.

1. **Which cloud are you on?** — AWS / Azure / GCP / Not sure yet
   - "Not sure yet" → recommend based on Q2–Q4 answers, note Azure has the simplest entry (first-party service)
2. **Do you have admin rights in your cloud account?** — Yes / No / I can ask someone
   - Drives whether we recommend routes needing cloud access (Marketplace, portal) vs email-only routes (AWS express setup)
3. **What's the goal right now?** — Evaluate/POC / First production workload / Enterprise platform
4. **Any hard networking or residency requirements?** — None / Data must stay in our cloud account / Private networking (no public internet paths)
   - "None" biases serverless; the others force classic/VNet-injected/customer-managed
5. **Which region does your data live in?** — free-text with common-region suggestions
6. **How do you want to pay?** — Cloud marketplace billing / Direct with Databricks / Just trialling

## Decision logic (implement in `decisionTree.ts` as a pure function)

### Entry routes by cloud — this is the core knowledge, get it right

**AWS** — three routes:
- *Express setup*: signup with business email only, no AWS access needed; serverless workspace + 14-day trial credits immediately. **Default recommendation when Q2 = No.**
- *AWS Marketplace*: requires `AWSMarketplaceFullAccess` or `AWSMarketplaceManageSubscriptions`; auto-deploys first serverless workspace; up to $400 trial credits; rolls into pay-as-you-go on the AWS bill. **Default when Q2 = Yes and Q6 = marketplace billing.**
- *Direct/sales-led*: for negotiated commits; can still be routed as a Marketplace private offer.
- Classic workspace (needed for Q4 ≠ None): cross-account IAM role + S3 root bucket + VPC. Recommend **automated configuration** (IAM temporary delegation) unless private networking is required, then manual + Terraform with PrivateLink.

**Azure** — Databricks is a **first-party Azure service**, the simplest path of the three:
- Whoever creates the workspace in the Azure Portal becomes the admin — they need **Contributor** (or Owner) on the target resource group and an active subscription. No separate Databricks account signup exists; identity is Entra ID from day one.
- Route: Azure Portal → Create resource → Azure Databricks → pick subscription, resource group, region, pricing tier (Premium for Unity Catalog + RBAC — always recommend Premium; Trial tier gives 14 days free DBUs).
- Q4 = private networking → **VNet injection** must be chosen **at workspace creation** (cannot retrofit), plus Private Link and Secure Cluster Connectivity (NPIP). Generate Bicep for this.
- Billing is inherently through the Azure subscription — Q6 is moot on Azure; say so rather than asking.

**GCP** — subscription via **Google Cloud Marketplace**:
- Requires a GCP project with **billing enabled** and the Billing Account Administrator + Project Owner (or equivalent) roles to subscribe.
- Route: GCP Marketplace → Databricks → Subscribe → sign up with a Google identity → account console → create workspace in a project. The subscriber becomes the first account admin.
- Workspace needs per-project quota (CPUs, IPs) and, for custom networking, a customer-managed VPC with two secondary IP ranges. Compute runs on GCE in the customer's project.
- No email-only route on GCP: if Q2 = No, tell them plainly they'll need their GCP admin for ~15 minutes, and generate the exact ask as copy-paste text for that admin.

### Workspace type

- Q3 = Evaluate **and** Q4 = None → **serverless workspace** (AWS) / standard portal deployment (Azure) / standard workspace (GCP). Time-to-first-query: minutes.
- Q4 ≠ None, or Q3 = Enterprise platform → classic / VNet-injected / customer-managed VPC, with Terraform from day one.

### "No admin" handling (this persona is the whole point)

When Q2 = No:
- AWS → express setup route, zero cloud access needed. Classic workspace deferred with a note: "when you're ready, automated configuration sends an approval request to your AWS admin — no console access needed on your side; requests expire after 7 days."
- Azure → generate a copy-paste request to their Azure admin: exact role needed (Contributor on a new resource group), region, pricing tier, and a one-paragraph justification.
- GCP → same pattern: copy-paste request naming the Marketplace subscription step and required roles.

## Output generators

### Checklist (`checklist.ts`)
Markdown, personalised: their cloud, region, route, workspace type. Checkbox list ordered by dependency. Include the "ask your admin" block when relevant. Footer: "Generated <date> — verify against docs.databricks.com, portal.azure.com, or console.cloud.google.com as appropriate."

### Terraform (`terraform.ts`)
- Generate per-cloud using the `databricks` provider plus the relevant cloud provider. Region, prefix, CIDR from answers as `variables.tf`.
- AWS classic: cross-account role, root bucket, VPC modules; include a comment noting the known IAM propagation race (add `time_sleep` before credential validation).
- Azure: `azurerm_databricks_workspace`, with VNet injection blocks only when Q4 requires it.
- GCP: `databricks_mws_workspaces` with network config when customer-managed VPC chosen.
- Every generated file ends with a comment: "Review before applying. This is a starting point, not production hardening."

### Static output rule
Generators are **pure functions returning strings** — build them template-literal-based with typed answer objects in, so they're unit-testable without a DOM.

## UI/UX requirements

- One question per screen, large tap targets, progress indicator ("3 of 6")
- Back navigation preserves answers; answers editable from the results page ("change an answer" chips)
- Results page: recommendation summary card at top (route + workspace type + estimated time-to-first-query), then tabs: **Checklist / Infrastructure code / First 60 minutes / Admin request** (last tab only when Q2 = No)
- Copy buttons on every code block; download buttons produce real files client-side via Blob URLs
- Mobile-friendly — SAs will open this on a phone in a meeting
- No Databricks logos or trademarks in the build (keep it shareable); neutral, professional palette

## Testing & quality gates

- `pnpm test` (vitest): decision tree covered for **every** cloud × admin × goal × networking combination — table-driven tests
- Generators snapshot-tested: given a fixed answer set, output is deterministic
- `pnpm build` clean; `pnpm lint` (eslint + typescript-eslint) clean
- Manual smoke: the three golden paths —
  1. AWS, no admin, evaluating → express setup + serverless + admin-free checklist
  2. Azure, admin, private networking → VNet injection Bicep + Premium tier + "decide at creation" warning
  3. GCP, no admin → Marketplace route + copy-paste admin request

## Build order

1. Types + `questions.ts` + decision tree with tests — **logic before UI**
2. Wizard shell + QuestionCard + navigation
3. Results page with recommendation card
4. Checklist generator + download
5. Terraform/Bicep/CloudFormation generators
6. Polish: copy review (British English), mobile pass, empty-state handling

## Corrections log

Append learnings here as they occur; check before repeating a class of work.

- `registry.npmjs.org` is blocked in this environment (503 from a corporate
  proxy). A `.npmrc` pinning `registry=https://registry.npmmirror.com/` is
  committed at the project root — pnpm/npm installs work through that. The
  `packageManager` field in `package.json` triggers a separate pnpm
  self-management fetch that ignores `.npmrc` and always hits npmjs.org, so
  it's deliberately omitted; use the globally installed pnpm instead.
