import type { Answers, CloudProvider, Recommendation } from './types'
import { aws } from '../content/aws'
import { azure } from '../content/azure'
import { gcp } from '../content/gcp'

/**
 * Resolve "not sure yet" to a concrete cloud.
 *
 * With no admin rights at all, AWS express setup is the only route that needs
 * zero cloud console access, so it wins. Otherwise Azure is the simplest
 * overall entry — a first-party service with no separate Databricks signup.
 */
function resolveCloud(answers: Answers): { cloud: CloudProvider; wasInferred: boolean } {
  if (answers.cloud !== 'unsure') {
    return { cloud: answers.cloud, wasInferred: false }
  }
  if (answers.adminRights === 'no') {
    return { cloud: 'aws', wasInferred: true }
  }
  return { cloud: 'azure', wasInferred: true }
}

function buildAws(answers: Answers, cloudWasInferred: boolean): Recommendation {
  const needsNetworking = answers.networking !== 'none'
  const isEnterprise = answers.goal === 'enterprise'
  const needsClassic = needsNetworking || isEnterprise

  const route = answers.adminRights === 'no'
    ? 'aws-express'
    : answers.billing === 'marketplace'
      ? 'aws-marketplace'
      : answers.billing === 'direct'
        ? 'aws-direct'
        : 'aws-express'

  const warnings: string[] = []
  if (needsClassic) {
    warnings.push(
      answers.networking === 'private'
        ? 'Private networking on AWS needs a manual classic workspace deployment with PrivateLink — use the generated Terraform rather than automated configuration.'
        : 'A classic workspace is needed for this. Automated configuration (IAM temporary delegation) can set up the cross-account role, S3 root bucket and VPC without giving Databricks standing console access.',
    )
    warnings.push('Known IAM propagation race: the generated Terraform waits briefly (time_sleep) before validating the cross-account role — this is expected.')
  }
  if (route === 'aws-marketplace') {
    warnings.push(`AWS Marketplace subscription needs ${aws.marketplacePermission} in your account.`)
  }
  if (answers.adminRights === 'no' && !needsClassic) {
    warnings.push('No AWS admin needed for this — express setup only needs a business email. You can start right away.')
  }

  return {
    cloud: 'aws',
    cloudWasInferred,
    route,
    routeLabel: aws.routes[route].label,
    routeDescription: aws.routes[route].description,
    workspaceType: needsClassic ? 'aws-classic' : 'serverless',
    workspaceLabel: needsClassic ? 'Classic workspace (own VPC)' : 'Serverless workspace',
    timeToFirstQuery: needsClassic
      ? answers.adminRights === 'no'
        ? 'A few days (waiting on admin approval for the cross-account role)'
        : 'A few hours (VPC and cross-account role to provision)'
      : 'Minutes',
    warnings,
    adminRequest: answers.adminRights === 'no' && needsClassic ? aws.adminRequest() : undefined,
    planSteps: aws.planSteps({ route, needsClassic }),
  }
}

function buildAzure(answers: Answers, cloudWasInferred: boolean): Recommendation {
  const needsVnetInjection = answers.networking === 'private'
  const pricingTier = 'Premium'

  const warnings: string[] = []
  if (needsVnetInjection) {
    warnings.push('VNet injection must be chosen at workspace creation — it cannot be retrofitted onto an existing workspace.')
    warnings.push('Enable Private Link and Secure Cluster Connectivity (No Public IP) as part of the same deployment.')
  }
  if (answers.goal === 'evaluate' && answers.networking === 'none') {
    warnings.push('The Trial tier gives 14 days of free DBUs if you just want a quick look before committing to Premium.')
  }

  return {
    cloud: 'azure',
    cloudWasInferred,
    route: 'azure-portal',
    routeLabel: azure.routes['azure-portal'].label,
    routeDescription: azure.routes['azure-portal'].description,
    workspaceType: needsVnetInjection ? 'azure-vnet-injected' : 'azure-standard',
    workspaceLabel: needsVnetInjection ? 'VNet-injected workspace (Premium)' : 'Standard workspace (Premium)',
    timeToFirstQuery: needsVnetInjection ? 'A few hours (networking decisions are made at creation time)' : 'Minutes to an hour',
    pricingTier,
    billingNote: 'Billing runs through your Azure subscription — there is no separate billing choice to make.',
    warnings,
    adminRequest: answers.adminRights === 'no' ? azure.adminRequest() : undefined,
    planSteps: azure.planSteps({ needsVnetInjection, pricingTier: pricingTier === 'Premium' ? 'Premium' : 'Trial' }),
  }
}

function buildGcp(answers: Answers, cloudWasInferred: boolean): Recommendation {
  const needsCustomVpc = answers.networking !== 'none'

  const warnings: string[] = []
  if (answers.adminRights === 'no') {
    warnings.push(`You'll need your GCP admin for about 15 minutes — there is no email-only route on GCP.`)
  }
  if (needsCustomVpc) {
    warnings.push('A customer-managed VPC needs two secondary IP ranges provisioned before the workspace is created.')
  }
  if (answers.billing !== 'marketplace') {
    warnings.push('Databricks on GCP is always subscribed via Google Cloud Marketplace — there is no separate direct billing route.')
  }

  return {
    cloud: 'gcp',
    cloudWasInferred,
    route: 'gcp-marketplace',
    routeLabel: gcp.routes['gcp-marketplace'].label,
    routeDescription: gcp.routes['gcp-marketplace'].description,
    workspaceType: needsCustomVpc ? 'gcp-customer-vpc' : 'gcp-standard',
    workspaceLabel: needsCustomVpc ? 'Customer-managed VPC workspace' : 'Standard workspace',
    timeToFirstQuery: needsCustomVpc
      ? 'Half a day (VPC and quota setup)'
      : answers.adminRights === 'no'
        ? 'A few days (waiting on admin for the Marketplace subscription)'
        : 'About an hour',
    warnings,
    adminRequest: answers.adminRights === 'no' ? gcp.adminRequest() : undefined,
    planSteps: gcp.planSteps({ needsCustomVpc }),
  }
}

export function recommend(answers: Answers): Recommendation {
  const { cloud, wasInferred } = resolveCloud(answers)
  switch (cloud) {
    case 'aws':
      return buildAws(answers, wasInferred)
    case 'azure':
      return buildAzure(answers, wasInferred)
    case 'gcp':
      return buildGcp(answers, wasInferred)
  }
}
