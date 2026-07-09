export type CloudProvider = 'aws' | 'azure' | 'gcp'
export type CloudChoice = CloudProvider | 'unsure'
export type AdminRights = 'yes' | 'no' | 'ask'
export type Goal = 'evaluate' | 'production' | 'enterprise'
export type Networking = 'none' | 'customer-cloud' | 'private'
export type Billing = 'marketplace' | 'direct' | 'trial'

export interface Answers {
  cloud: CloudChoice
  adminRights: AdminRights
  goal: Goal
  networking: Networking
  region: string
  billing: Billing
}

export type QuestionKind = 'single-select' | 'free-text'

export interface QuestionOption {
  value: string
  label: string
  description?: string
}

export interface Question {
  id: keyof Answers
  step: number
  title: string
  helpText?: string
  kind: QuestionKind
  options?: QuestionOption[]
  placeholder?: string
  suggestions?: string[]
  /** Only asked when this returns true for the answers gathered so far. Absent = always asked. */
  skipWhen?: (answers: Partial<Answers>) => boolean
}

export type EntryRoute =
  | 'aws-express'
  | 'aws-marketplace'
  | 'aws-direct'
  | 'azure-portal'
  | 'gcp-marketplace'

export type WorkspaceType =
  | 'serverless'
  | 'aws-classic'
  | 'azure-standard'
  | 'azure-vnet-injected'
  | 'gcp-standard'
  | 'gcp-customer-vpc'

export interface AdminRequest {
  neededRole: string
  target: string
  justification: string
  copyText: string
}

export interface PlanStep {
  title: string
  detail: string
}

export interface Recommendation {
  cloud: CloudProvider
  cloudWasInferred: boolean
  route: EntryRoute
  routeLabel: string
  routeDescription: string
  workspaceType: WorkspaceType
  workspaceLabel: string
  timeToFirstQuery: string
  pricingTier?: string
  billingNote?: string
  warnings: string[]
  adminRequest?: AdminRequest
  planSteps: PlanStep[]
}

export interface CodeFile {
  filename: string
  language: 'hcl' | 'yaml' | 'json' | 'bicep'
  contents: string
}
