import type { Answers, Recommendation } from '../types'

const cloudDisplayName: Record<Answers['cloud'], string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  unsure: 'Not sure yet',
}

const docsLinkByCloud: Record<'aws' | 'azure' | 'gcp', string> = {
  aws: 'docs.databricks.com/aws',
  azure: 'portal.azure.com and docs.databricks.com/azure',
  gcp: 'console.cloud.google.com and docs.databricks.com/gcp',
}

export function generateChecklist(answers: Answers, rec: Recommendation, now: Date = new Date()): string {
  const lines: string[] = []

  lines.push(`# Databricks deployment checklist`)
  lines.push('')
  lines.push(`Personalised for: **${cloudDisplayName[answers.cloud]}${rec.cloudWasInferred ? ` (recommended — resolved to ${cloudDisplayName[rec.cloud]})` : ''}**`)
  lines.push('')
  lines.push('## Your setup')
  lines.push(`- **Cloud:** ${cloudDisplayName[rec.cloud]}`)
  lines.push(`- **Entry route:** ${rec.routeLabel}`)
  lines.push(`- **Workspace type:** ${rec.workspaceLabel}`)
  lines.push(`- **Region:** ${answers.region || '(not specified)'}`)
  if (rec.pricingTier) lines.push(`- **Pricing tier:** ${rec.pricingTier}`)
  lines.push(`- **Goal:** ${answers.goal}`)
  lines.push(`- **Networking/residency:** ${answers.networking}`)
  lines.push(`- **Estimated time to first query:** ${rec.timeToFirstQuery}`)
  lines.push('')

  if (rec.adminRequest) {
    lines.push('## Ask your admin first')
    lines.push('')
    lines.push(`- [ ] Send the request below to **${rec.adminRequest.target}**`)
    lines.push('')
    lines.push('> ' + rec.adminRequest.copyText.replace(/\n/g, '\n> '))
    lines.push('')
  }

  lines.push('## Steps')
  lines.push('')
  for (const step of rec.planSteps) {
    lines.push(`- [ ] **${step.title}** — ${step.detail}`)
  }
  lines.push('')

  if (rec.warnings.length > 0) {
    lines.push('## Things to watch for')
    lines.push('')
    for (const warning of rec.warnings) {
      lines.push(`- ${warning}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(`Generated ${now.toISOString().slice(0, 10)} — verify against ${docsLinkByCloud[rec.cloud]} as appropriate.`)
  lines.push('')

  return lines.join('\n')
}
