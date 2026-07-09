export const flowSteps = [
  'Pick your cloud',
  'Choose how you sign up',
  'Serverless or classic',
  'Start querying',
]

export interface EntryRouteSummary {
  title: string
  description: string
}

export const entryRoutes: EntryRouteSummary[] = [
  {
    title: 'Direct sign-up',
    description: 'Give us a business email and you’re in — no cloud account needed. The fastest way to start on AWS today.',
  },
  {
    title: 'Cloud Marketplace',
    description: 'Subscribe through your AWS or Google Cloud Marketplace so usage lands straight on your existing cloud bill.',
  },
  {
    title: 'Cloud portal',
    description: 'On Azure, Databricks is a first-party resource — create it straight from the Azure Portal, no separate sign-up at all.',
  },
  {
    title: 'Infrastructure as code',
    description: 'Prefer to automate it? We generate ready-to-run Terraform — plus CloudFormation or Bicep — for every route.',
  },
]

export interface WorkspaceTypeSummary {
  title: string
  badge: string
  description: string
}

export const workspaceTypes: WorkspaceTypeSummary[] = [
  {
    title: 'Serverless workspace',
    badge: 'Fastest',
    description: 'Databricks runs the compute for you, fully managed. Nothing to provision — sign up and query in minutes. The right default for most people.',
  },
  {
    title: 'Classic workspace',
    badge: 'Full control',
    description: 'Compute runs inside your own cloud account, giving you full control over networking and where data lives. We generate the infrastructure code for you.',
  },
]
