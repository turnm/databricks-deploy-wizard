import { describe, expect, it } from 'vitest'
import { recommend } from '../src/engine/decisionTree'
import { generateChecklist } from '../src/engine/generators/checklist'
import { generateTerraform } from '../src/engine/generators/terraform'
import { generateCloudFormation } from '../src/engine/generators/cloudformation'
import { generateBicep } from '../src/engine/generators/armBicep'
import type { Answers } from '../src/engine/types'

const fixedDate = new Date('2026-07-09T00:00:00Z')

const goldenPaths: Record<string, Answers> = {
  'aws-no-admin-evaluate': { cloud: 'aws', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'us-east-1', billing: 'trial' },
  'azure-admin-private-networking': { cloud: 'azure', adminRights: 'yes', goal: 'production', networking: 'private', region: 'UK South', billing: 'marketplace' },
  'gcp-no-admin': { cloud: 'gcp', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'europe-west2', billing: 'marketplace' },
}

describe.each(Object.entries(goldenPaths))('generators are deterministic — %s', (_name, answers) => {
  const rec = recommend(answers)

  it('checklist output matches snapshot', () => {
    expect(generateChecklist(answers, rec, fixedDate)).toMatchSnapshot()
  })

  it('terraform output matches snapshot', () => {
    expect(generateTerraform(answers, rec)).toMatchSnapshot()
  })

  it('cloudformation output matches snapshot', () => {
    expect(generateCloudFormation(answers, rec)).toMatchSnapshot()
  })

  it('bicep output matches snapshot', () => {
    expect(generateBicep(answers, rec)).toMatchSnapshot()
  })

  it('calling twice with the same answers produces identical output', () => {
    const rec2 = recommend(answers)
    expect(generateChecklist(answers, rec2, fixedDate)).toBe(generateChecklist(answers, rec, fixedDate))
    expect(generateTerraform(answers, rec2)).toEqual(generateTerraform(answers, rec))
  })
})

describe('cloud-specific generator relevance', () => {
  it('cloudformation is null off AWS', () => {
    const answers: Answers = { cloud: 'azure', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'UK South', billing: 'trial' }
    expect(generateCloudFormation(answers, recommend(answers))).toBeNull()
  })

  it('bicep is null off Azure', () => {
    const answers: Answers = { cloud: 'aws', adminRights: 'yes', goal: 'evaluate', networking: 'none', region: 'us-east-1', billing: 'trial' }
    expect(generateBicep(answers, recommend(answers))).toBeNull()
  })

  it('cloudformation is null for AWS serverless (nothing to provision)', () => {
    const answers: Answers = { cloud: 'aws', adminRights: 'no', goal: 'evaluate', networking: 'none', region: 'us-east-1', billing: 'trial' }
    expect(generateCloudFormation(answers, recommend(answers))).toBeNull()
  })
})
