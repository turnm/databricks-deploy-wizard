import { useState } from 'react'
import { OptionsOverview } from './components/OptionsOverview'
import { ResultsPage } from './components/ResultsPage'
import { Wizard } from './components/Wizard'
import type { Answers } from './engine/types'

type ViewState =
  | { mode: 'overview' }
  | { mode: 'wizard'; answers: Partial<Answers>; questionId?: keyof Answers }
  | { mode: 'results'; answers: Answers }

function App() {
  const [view, setView] = useState<ViewState>({ mode: 'overview' })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-slate-900">Databricks Deployment Wizard</span>
          <div className="flex items-center gap-4">
            {view.mode !== 'overview' && (
              <button
                type="button"
                onClick={() => setView({ mode: 'overview' })}
                className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
              >
                How it works
              </button>
            )}
            <span className="text-xs text-slate-400">No login · nothing leaves your browser</span>
          </div>
        </div>
      </header>

      <main>
        {view.mode === 'overview' && <OptionsOverview onStart={() => setView({ mode: 'wizard', answers: {} })} />}

        {view.mode === 'wizard' && (
          <Wizard
            initialAnswers={view.answers}
            initialQuestionId={view.questionId}
            onComplete={(answers) => setView({ mode: 'results', answers })}
          />
        )}

        {view.mode === 'results' && (
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
