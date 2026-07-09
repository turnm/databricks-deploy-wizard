import type { AdminRequest, PlanStep } from '../engine/types'

export const azure = {
  displayName: 'Azure',
  docsLink: 'https://docs.databricks.com/azure/en/getting-started/',

  routes: {
    'azure-portal': {
      label: 'Azure Portal',
      description:
        'Databricks is a first-party Azure service. Create the resource in the Azure Portal and you become the workspace admin immediately — identity is Entra ID from day one, no separate Databricks signup.',
    },
  },

  requiredRole: 'Contributor (or Owner) on the target resource group',

  adminRequest(): AdminRequest {
    return {
      neededRole: azure.requiredRole,
      target: 'Your Azure subscription/tenant administrator',
      justification:
        'We want to create an Azure Databricks workspace for evaluation. This needs someone with Contributor rights on a resource group to create the resource — it is a first-party Azure service, so no separate Databricks account or cloud access is needed beyond that.',
      copyText:
        "Hi — could you either create an Azure Databricks workspace for us, or grant me Contributor on a new resource group " +
        "so I can create it myself? Details: Premium pricing tier (needed for Unity Catalog and RBAC), region [your region], " +
        "in subscription [your subscription]. This is a first-party Azure resource — no third-party account or marketplace step involved.",
    }
  },

  planSteps(opts: { needsVnetInjection: boolean; pricingTier: 'Trial' | 'Premium' }): PlanStep[] {
    const steps: PlanStep[] = [
      { title: 'Open the Azure Portal', detail: 'Go to portal.azure.com → Create a resource → search "Azure Databricks".' },
      {
        title: 'Configure the workspace',
        detail: opts.needsVnetInjection
          ? `Pick your subscription, resource group and region. Choose the ${opts.pricingTier} pricing tier, and enable VNet injection now — it cannot be added after creation.`
          : `Pick your subscription, resource group and region, and choose the ${opts.pricingTier} pricing tier.`,
      },
    ]
    if (opts.needsVnetInjection) {
      steps.push({ title: 'Wire up Private Link and NPIP', detail: 'Enable Private Link and Secure Cluster Connectivity (No Public IP) as part of the same deployment — see the generated Bicep for the exact resources.' })
    }
    steps.push({ title: 'Run your first query', detail: 'Launch the workspace, attach to a SQL warehouse or cluster, and run a query against a sample dataset.' })
    return steps
  },
}
