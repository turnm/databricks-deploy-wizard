import type { Answers, CodeFile, Recommendation } from '../types'

const FOOTER = '\n// Review before applying. This is a starting point, not production hardening.\n'

function prefixFrom(region: string): string {
  const slug = region.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return slug ? `databricks-${slug}` : 'databricks'
}

/**
 * Azure-only. Bicep is the natural fit here since Databricks is a first-party
 * Azure resource — this mirrors azureTerraform in terraform.ts for teams that
 * standardise on ARM/Bicep instead. VNet injection must be set at creation
 * time, so the conditional block below is the only place it can be enabled.
 */
export function generateBicep(answers: Answers, rec: Recommendation): CodeFile | null {
  if (rec.cloud !== 'azure') return null

  const prefix = prefixFrom(answers.region)
  const region = answers.region || 'uksouth'
  const needsVnet = rec.workspaceType === 'azure-vnet-injected'

  const contents = `param location string = '${region}'
param prefix string = '${prefix}'
param pricingTier string = 'premium'

${
  needsVnet
    ? `// VNet injection must be chosen at workspace creation — it cannot be
// retrofitted later, so the network is defined alongside the workspace.
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '\${prefix}-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.179.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'public-subnet'
        properties: {
          addressPrefix: '10.179.0.0/18'
          delegations: [
            {
              name: 'databricks-delegation'
              properties: {
                serviceName: 'Microsoft.Databricks/workspaces'
              }
            }
          ]
        }
      }
      {
        name: 'private-subnet'
        properties: {
          addressPrefix: '10.179.64.0/18'
          delegations: [
            {
              name: 'databricks-delegation'
              properties: {
                serviceName: 'Microsoft.Databricks/workspaces'
              }
            }
          ]
        }
      }
    ]
  }
}

`
    : ''
}resource workspace 'Microsoft.Databricks/workspaces@2024-05-01' = {
  name: '\${prefix}-workspace'
  location: location
  sku: {
    name: pricingTier
  }
  properties: {
    managedResourceGroupId: resourceId('Microsoft.Resources/resourceGroups', '\${prefix}-managed-rg')
${
    needsVnet
      ? `    parameters: {
      customVirtualNetworkId: {
        value: vnet.id
      }
      customPublicSubnetName: {
        value: 'public-subnet'
      }
      customPrivateSubnetName: {
        value: 'private-subnet'
      }
      enableNoPublicIp: {
        value: true
      }
    }
`
      : ''
  }  }
}
`

  return { filename: 'workspace.bicep', language: 'bicep', contents: contents + FOOTER }
}
