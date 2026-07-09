import { useState } from 'react'
import { questions } from '../content/questions'
import type { Answers } from '../engine/types'
import { QuestionCard } from './QuestionCard'

interface WizardProps {
  initialAnswers?: Partial<Answers>
  initialQuestionId?: keyof Answers
  onComplete: (answers: Answers) => void
}

function visibleQuestions(answers: Partial<Answers>) {
  return questions.filter((q) => !q.skipWhen || !q.skipWhen(answers))
}

export function Wizard({ initialAnswers = {}, initialQuestionId, onComplete }: WizardProps) {
  const [answers, setAnswers] = useState<Partial<Answers>>(initialAnswers)
  const [stepIndex, setStepIndex] = useState(() => {
    if (!initialQuestionId) return 0
    const idx = visibleQuestions(initialAnswers).findIndex((q) => q.id === initialQuestionId)
    return idx >= 0 ? idx : 0
  })

  const active = visibleQuestions(answers)
  const question = active[stepIndex]

  function handleAnswer(value: string) {
    const newAnswers: Partial<Answers> = { ...answers, [question.id]: value }
    setAnswers(newAnswers)

    const newActive = visibleQuestions(newAnswers)
    const currentPosition = newActive.findIndex((q) => q.id === question.id)
    const nextIndex = currentPosition + 1

    if (nextIndex >= newActive.length) {
      onComplete(newAnswers as Answers)
    } else {
      setStepIndex(nextIndex)
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <QuestionCard
        key={question.id}
        question={question}
        value={answers[question.id] as string | undefined}
        onAnswer={handleAnswer}
        onBack={handleBack}
        canGoBack={stepIndex > 0}
        stepNumber={stepIndex + 1}
        totalSteps={active.length}
      />
    </div>
  )
}
