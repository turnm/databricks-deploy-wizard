import type { AdminRequest, PlanStep } from '../engine/types'

export const gcp = {
  displayName: 'GCP',
  docsLink: 'https://docs.databricks.com/gcp/en/getting-started/',

  signupUrls: {
    marketplace: 'https://console.cloud.google.com/marketplace/product/databricks-prod/databricks',
  },

  routes: {
    'gcp-marketplace': {
      label: 'Google Cloud Marketplace',
      description:
        'Subscribe to Databricks via Google Cloud Marketplace, sign up with a Google identity, then create a workspace in a project. The subscriber becomes the first account admin.',
    },
  },

  requiredRoles: 'Billing Account Administrator + Project Owner (or equivalent)',

  adminRequest(): AdminRequest {
    return {
      neededRole: gcp.requiredRoles,
      target: 'Your GCP billing/project administrator',
      justification:
        'Databricks on GCP is subscribed via Google Cloud Marketplace, which needs billing enabled on the project and someone with Billing Account Administrator and Project Owner rights to complete the subscription — about 15 minutes of their time.',
      copyText:
        "Hi — I'd like to subscribe to Databricks via Google Cloud Marketplace for our project. This needs billing enabled and " +
        "Billing Account Administrator + Project Owner rights, which I don't have. Could you hop on a quick 15-minute call so " +
        "we can do the subscription step together (Marketplace → Databricks → Subscribe)? Compute will run on GCE inside our " +
        "own project either way.",
    }
  },

  planSteps(opts: { needsCustomVpc: boolean }): PlanStep[] {
    const steps: PlanStep[] = [
      { title: 'Open Google Cloud Marketplace', detail: `Go to the [Databricks listing on Google Cloud Marketplace](${gcp.signupUrls.marketplace}) and click Subscribe.` },
      { title: 'Sign up with a Google identity', detail: 'Complete signup — the subscriber becomes the first account admin.' },
      { title: 'Create a workspace', detail: 'From the account console, create a workspace in a project with sufficient CPU/IP quota.' },
    ]
    if (opts.needsCustomVpc) {
      steps.push({ title: 'Attach a customer-managed VPC', detail: 'Provision a VPC with the two required secondary IP ranges before creating the workspace — see the generated Terraform.' })
    }
    steps.push({
      title: "You're already the admin",
      detail: 'Subscribing makes you the admin of your account and this workspace automatically — nothing else to set up. There\'s also a separate account console (accounts.gcp.databricks.com) for managing multiple workspaces later; you don\'t need it yet.',
    })
    steps.push({ title: 'Run your first query', detail: 'Launch the workspace and run a query against a sample dataset on GCE-backed compute.' })
    return steps
  },
}
