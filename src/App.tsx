import { useState } from 'react'
import { ResultsPage } from './components/ResultsPage'
import { Wizard } from './components/Wizard'
import type { Answers } from './engine/types'

type ViewState =
  | { mode: 'wizard'; answers: Partial<Answers>; questionId?: keyof Answers }
  | { mode: 'results'; answers: Answers }

function App() {
  const [view, setView] = useState<ViewState>({ mode: 'wizard', answers: {} })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-0.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <span className="font-semibold text-slate-900">Databricks Deployment Wizard</span>
          <span className="text-xs text-slate-400">No login · nothing leaves your browser</span>
        </div>
      </header>

      <main>
        {view.mode === 'wizard' ? (
          <Wizard
            initialAnswers={view.answers}
            initialQuestionId={view.questionId}
            onComplete={(answers) => setView({ mode: 'results', answers })}
          />
        ) : (
          <ResultsPage
            answers={view.answers}
            onChangeAnswer={(questionId) => setView({ mode: 'wizard', answers: view.answers, questionId })}
            onRestart={() => setView({ mode: 'wizard', answers: {} })}
          />
        )}
      </main>
    </div>
  )
}

export default App
