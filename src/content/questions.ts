import type { Question } from '../engine/types'

/**
 * Single source of truth for the wizard's question flow. Six questions max —
 * every answer must change at least one branch of the recommendation.
 */
export const questions: Question[] = [
  {
    id: 'cloud',
    step: 1,
    title: 'Which cloud are you on?',
    kind: 'single-select',
    options: [
      { value: 'aws', label: 'AWS' },
      { value: 'azure', label: 'Azure' },
      { value: 'gcp', label: 'GCP' },
      {
        value: 'unsure',
        label: 'Not sure yet',
        description: "We'll recommend one based on your other answers — Azure has the simplest entry, since Databricks is a first-party service there.",
      },
    ],
  },
  {
    id: 'adminRights',
    step: 2,
    title: 'Do you have admin rights in your cloud account?',
    helpText: 'This determines whether we route you somewhere that needs cloud console access, or somewhere you can start with just a business email.',
    kind: 'single-select',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'ask', label: 'I can ask someone' },
    ],
  },
  {
    id: 'goal',
    step: 3,
    title: "What's the goal right now?",
    kind: 'single-select',
    options: [
      { value: 'evaluate', label: 'Evaluate / proof of concept' },
      { value: 'production', label: 'First production workload' },
      { value: 'enterprise', label: 'Enterprise platform' },
    ],
  },
  {
    id: 'networking',
    step: 4,
    title: 'Any hard networking or residency requirements?',
    kind: 'single-select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'customer-cloud', label: 'Data must stay in our cloud account' },
      { value: 'private', label: 'Private networking — no public internet paths' },
    ],
  },
  {
    id: 'region',
    step: 5,
    title: 'Which region does your data live in?',
    helpText: 'Pick a suggestion or type your own — this only affects generated code and the checklist, not the recommendation.',
    kind: 'free-text',
    placeholder: 'e.g. eu-west-2, UK South, europe-west2',
    suggestions: [
      'eu-west-1',
      'eu-west-2',
      'us-east-1',
      'UK South',
      'West Europe',
      'europe-west2',
      'europe-west4',
    ],
  },
  {
    id: 'billing',
    step: 6,
    title: 'How do you want to pay?',
    kind: 'single-select',
    options: [
      { value: 'marketplace', label: 'Cloud marketplace billing' },
      { value: 'direct', label: 'Direct with Databricks' },
      { value: 'trial', label: 'Just trialling' },
    ],
    // Azure billing always runs through the Azure subscription — asking is noise.
    skipWhen: (answers) => answers.cloud === 'azure',
  },
]

export const totalSteps = questions.length
