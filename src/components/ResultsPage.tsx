import type { AnchorHTMLAttributes } from 'react'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { questions } from '../content/questions'
import { recommend } from '../engine/decisionTree'
import { generateBicep } from '../engine/generators/armBicep'
import { generateCloudFormation } from '../engine/generators/cloudformation'
import { generateChecklist } from '../engine/generators/checklist'
import { generateTerraform } from '../engine/generators/terraform'
import type { Answers } from '../engine/types'
import { CodeBlock } from './CodeBlock'
import { DownloadButton } from './DownloadButton'
import { MarkdownPreview } from './MarkdownPreview'

interface ResultsPageProps {
  answers: Answers
  onChangeAnswer: (questionId: keyof Answers) => void
  onRestart: () => void
}

type Tab = 'checklist' | 'infra' | 'plan' | 'admin'

const cloudDisplayName: Record<Answers['cloud'], string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  unsure: 'Not sure yet',
}

function ExternalLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} target="_blank" rel="noreferrer" />
}

function answerLabel(question: (typeof questions)[number], value: string | undefined): string {
  if (value === undefined) return ''
  if (question.kind === 'free-text') return value
  return question.options?.find((o) => o.value === value)?.label ?? value
}

export function ResultsPage({ answers, onChangeAnswer, onRestart }: ResultsPageProps) {
  const [tab, setTab] = useState<Tab>('checklist')

  const rec = useMemo(() => recommend(answers), [answers])
  const checklist = useMemo(() => generateChecklist(answers, rec), [answers, rec])
  const terraformFiles = useMemo(() => generateTerraform(answers, rec), [answers, rec])
  const cloudformationFile = useMemo(() => generateCloudFormation(answers, rec), [answers, rec])
  const bicepFile = useMemo(() => generateBicep(answers, rec), [answers, rec])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'checklist', label: 'Checklist' },
    { id: 'infra', label: 'Infrastructure code' },
    { id: 'plan', label: 'First 60 minutes' },
  ]
  if (rec.adminRequest) tabs.push({ id: 'admin', label: 'Admin request' })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-900">
            {cloudDisplayName[rec.cloud]} · {rec.routeLabel}
          </h1>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
            {rec.timeToFirstQuery} to first query
          </span>
        </div>
        <p className="mt-2 text-slate-600">{rec.routeDescription}</p>
        <a
          href={rec.signupUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          {rec.signupLabel} ↗
        </a>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="rounded-md bg-slate-100 px-2.5 py-1">{rec.workspaceLabel}</span>
          {rec.pricingTier && <span className="rounded-md bg-slate-100 px-2.5 py-1">{rec.pricingTier} tier</span>}
          {rec.cloudWasInferred && <span className="rounded-md bg-slate-100 px-2.5 py-1">Cloud recommended for you</span>}
        </div>
        {rec.billingNote && <p className="mt-3 text-sm text-slate-500">{rec.billingNote}</p>}
        {rec.warnings.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {rec.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {questions
          .filter((q) => !q.skipWhen || !q.skipWhen(answers))
          .map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onChangeAnswer(q.id)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {answerLabel(q, answers[q.id] as string | undefined)} <span className="text-slate-400">· change</span>
            </button>
          ))}
      </div>

      <div>
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                tab === t.id ? 'border-b-2 border-orange-500 text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'checklist' && (
            <div className="flex flex-col gap-4">
              <DownloadButton filename="databricks-checklist.md" contents={checklist} label="Download checklist (.md)" />
              <MarkdownPreview markdown={checklist} />
            </div>
          )}

          {tab === 'infra' && (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Terraform</h3>
                <div className="flex flex-col gap-4">
                  {terraformFiles.map((f) => (
                    <div key={f.filename} className="flex flex-col gap-2">
                      <DownloadButton filename={f.filename} contents={f.contents} />
                      <CodeBlock filename={f.filename} contents={f.contents} />
                    </div>
                  ))}
                </div>
              </div>
              {cloudformationFile && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">CloudFormation</h3>
                  <div className="flex flex-col gap-2">
                    <DownloadButton filename={cloudformationFile.filename} contents={cloudformationFile.contents} />
                    <CodeBlock filename={cloudformationFile.filename} contents={cloudformationFile.contents} />
                  </div>
                </div>
              )}
              {bicepFile && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Bicep</h3>
                  <div className="flex flex-col gap-2">
                    <DownloadButton filename={bicepFile.filename} contents={bicepFile.contents} />
                    <CodeBlock filename={bicepFile.filename} contents={bicepFile.contents} />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'plan' && (
            <ol className="flex flex-col gap-4">
              {rec.planSteps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">{step.title}</div>
                    <div className="prose prose-sm max-w-none text-slate-600 prose-p:my-0 prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ExternalLink }}>
                        {step.detail}
                      </ReactMarkdown>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {tab === 'admin' && rec.adminRequest && (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">Ask: </span>
                {rec.adminRequest.neededRole} — send to <span className="font-medium text-slate-900">{rec.adminRequest.target}</span>.
              </div>
              <p className="text-sm text-slate-600">{rec.adminRequest.justification}</p>
              <div className="flex flex-col gap-2">
                <DownloadButton filename="admin-request.txt" contents={rec.adminRequest.copyText} label="Download request (.txt)" />
                <CodeBlock filename="admin-request.txt" contents={rec.adminRequest.copyText} />
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="button" onClick={onRestart} className="self-start text-sm font-medium text-slate-500 transition hover:text-slate-700">
        ← Start over
      </button>
    </div>
  )
}
