import { describe, expect, it } from 'vitest'
import { recommend } from '../src/engine/decisionTree'
import type { AdminRights, Billing, CloudChoice, Goal, Networking } from '../src/engine/types'

const clouds: CloudChoice[] = ['aws', 'azure', 'gcp', 'unsure']
const adminRights: AdminRights[] = ['yes', 'no', 'ask']
const goals: Goal[] = ['evaluate', 'production', 'enterprise']
const networking: Networking[] = ['none', 'customer-cloud', 'private']
const billings: Billing[] = ['marketplace', 'direct', 'trial']

function combinations() {
  const cases: { cloud: CloudChoice; adminRights: AdminRights; goal: Goal; networking: Networking; billing: Billing }[] = []
  for (const cloud of clouds) {
    for (const admin of adminRights) {
      for (const goal of goals) {
        for (const net of networking) {
          for (const billing of billings) {
            cases.push({ cloud, adminRights: admin, goal, networking: net, billing })
          }
        }
      }
    }
  }
  return cases
}

describe('recommend — every cloud x admin x goal x networking x billing combination', () => {
  it.each(combinations())(
    '$cloud / admin=$adminRights / goal=$goal / net=$networking / billing=$billing produces a valid recommendation',
    (answers) => {
      const rec = recommend({ ...answers, region: 'eu-west-2' })

      expect(['aws', 'azure', 'gcp']).toContain(rec.cloud)
      expect(rec.routeLabel).toBeTruthy()
      expect(rec.routeDescription).toBeTruthy()
      expect(rec.workspaceLabel).toBeTruthy()
      expect(rec.timeToFirstQuery).toBeTruthy()
      expect(rec.planSteps.length).toBeGreaterThan(0)
      expect(Array.isArray(rec.warnings)).toBe(true)

      // admin request tab never appears when the user has admin rights, and on AWS it's
      // also absent for express setup (no admin needed at all until a classic workspace
      // is required)
      if (answers.adminRights !== 'no') {
        expect(rec.adminRequest).toBeUndefined()
      } else if (rec.cloud === 'aws' && rec.workspaceType === 'serverless') {
        expect(rec.adminRequest).toBeUndefined()
      } else {
        expect(rec.adminRequest).toBeDefined()
      }

      expect(rec.cloudWasInferred).toBe(answers.cloud === 'unsure')
    },
  )
})

describe('cloud resolution for "not sure yet"', () => {
  it('resolves to AWS express when the user has no admin rights at all', () => {
    const rec = recommend({ cloud: 'unsure', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'eu-west-2', billing: 'trial' })
    expect(rec.cloud).toBe('aws')
    expect(rec.route).toBe('aws-express')
    expect(rec.cloudWasInferred).toBe(true)
  })

  it('resolves to Azure otherwise', () => {
    const rec = recommend({ cloud: 'unsure', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'eu-west-2', billing: 'trial' })
    expect(rec.cloud).toBe('azure')
    expect(rec.cloudWasInferred).toBe(true)
  })
})

describe('AWS routing', () => {
  it('always picks express setup when there is no admin, regardless of billing preference', () => {
    for (const billing of billings) {
      const rec = recommend({ cloud: 'aws', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'us-east-1', billing })
      expect(rec.route).toBe('aws-express')
    }
  })

  it('picks Marketplace when admin rights exist and billing is marketplace', () => {
    const rec = recommend({ cloud: 'aws', adminRights: 'yes', goal: 'production', networking: 'none', region: 'us-east-1', billing: 'marketplace' })
    expect(rec.route).toBe('aws-marketplace')
  })

  it('picks direct/sales-led when billing is direct', () => {
    const rec = recommend({ cloud: 'aws', adminRights: 'yes', goal: 'enterprise', networking: 'none', region: 'us-east-1', billing: 'direct' })
    expect(rec.route).toBe('aws-direct')
  })

  it('requires a classic workspace once networking is not "none"', () => {
    const rec = recommend({ cloud: 'aws', adminRights: 'yes', goal: 'evaluate', networking: 'customer-cloud', region: 'us-east-1', billing: 'marketplace' })
    expect(rec.workspaceType).toBe('aws-classic')
  })

  it('serverless workspace when evaluating with no networking constraints', () => {
    const rec = recommend({ cloud: 'aws', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'us-east-1', billing: 'trial' })
    expect(rec.workspaceType).toBe('serverless')
  })

  it('flags PrivateLink/manual setup for private networking', () => {
    const rec = recommend({ cloud: 'aws', adminRights: 'yes', goal: 'production', networking: 'private', region: 'us-east-1', billing: 'direct' })
    expect(rec.warnings.some((w) => w.includes('PrivateLink'))).toBe(true)
  })
})

describe('Azure routing', () => {
  it('always uses the Azure Portal route', () => {
    for (const admin of adminRights) {
      for (const net of networking) {
        const rec = recommend({ cloud: 'azure', adminRights: admin, goal: 'production', networking: net, region: 'UK South', billing: 'marketplace' })
        expect(rec.route).toBe('azure-portal')
      }
    }
  })

  it('recommends Premium tier always', () => {
    const rec = recommend({ cloud: 'azure', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'UK South', billing: 'trial' })
    expect(rec.pricingTier).toBe('Premium')
  })

  it('requires VNet injection for private networking, with a "cannot retrofit" warning', () => {
    const rec = recommend({ cloud: 'azure', adminRights: 'yes', goal: 'production', networking: 'private', region: 'UK South', billing: 'trial' })
    expect(rec.workspaceType).toBe('azure-vnet-injected')
    expect(rec.warnings.some((w) => w.toLowerCase().includes('cannot be retrofitted'))).toBe(true)
  })

  it('never asks about billing — Q6 is moot on Azure', () => {
    const rec = recommend({ cloud: 'azure', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'UK South', billing: 'trial' })
    expect(rec.billingNote).toBeTruthy()
  })

  it('generates a copy-paste admin request naming the Contributor role when there is no admin', () => {
    const rec = recommend({ cloud: 'azure', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'UK South', billing: 'trial' })
    expect(rec.adminRequest?.neededRole).toContain('Contributor')
  })
})

describe('GCP routing', () => {
  it('always uses the Marketplace route — there is no email-only route on GCP', () => {
    for (const admin of adminRights) {
      const rec = recommend({ cloud: 'gcp', adminRights: admin, goal: 'evaluate', networking: 'none', region: 'europe-west2', billing: 'marketplace' })
      expect(rec.route).toBe('gcp-marketplace')
    }
  })

  it('warns plainly when there is no admin, naming the ~15 minute ask', () => {
    const rec = recommend({ cloud: 'gcp', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'europe-west2', billing: 'marketplace' })
    expect(rec.warnings.some((w) => w.includes('15 minutes'))).toBe(true)
    expect(rec.adminRequest).toBeDefined()
  })

  it('requires a customer-managed VPC once networking is not "none"', () => {
    const rec = recommend({ cloud: 'gcp', adminRights: 'yes', goal: 'production', networking: 'private', region: 'europe-west2', billing: 'marketplace' })
    expect(rec.workspaceType).toBe('gcp-customer-vpc')
  })
})
