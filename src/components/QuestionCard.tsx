import { useState } from 'react'
import type { Question } from '../engine/types'

interface QuestionCardProps {
  question: Question
  value: string | undefined
  onAnswer: (value: string) => void
  onBack: () => void
  canGoBack: boolean
  stepNumber: number
  totalSteps: number
}

export function QuestionCard({ question, value, onAnswer, onBack, canGoBack, stepNumber, totalSteps }: QuestionCardProps) {
  const [freeText, setFreeText] = useState(value ?? '')

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-500">
          <span>
            Question {stepNumber} of {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-slate-900">{question.title}</h2>
        {question.helpText && <p className="mt-2 text-sm text-slate-500">{question.helpText}</p>}
      </div>

      {question.kind === 'single-select' && question.options && (
        <div className="flex flex-col gap-3">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value)}
              className={`rounded-xl border-2 px-5 py-4 text-left transition ${
                value === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-slate-900">{option.label}</div>
              {option.description && <div className="mt-1 text-sm text-slate-500">{option.description}</div>}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'free-text' && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && freeText.trim()) onAnswer(freeText.trim())
            }}
            placeholder={question.placeholder}
            className="rounded-xl border-2 border-slate-200 px-5 py-4 text-lg focus:border-orange-500 focus:outline-none"
            autoFocus
          />
          {question.suggestions && (
            <div className="flex flex-wrap gap-2">
              {question.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setFreeText(s)
                    onAnswer(s)
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!freeText.trim()}
            onClick={() => onAnswer(freeText.trim())}
            className="mt-2 self-start rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </div>
      )}

      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
