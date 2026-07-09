import { entryRoutes, flowSteps, workspaceTypes } from '../content/overview'

interface OptionsOverviewProps {
  onStart: () => void
}

export function OptionsOverview({ onStart }: OptionsOverviewProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">From zero to your first query</h1>
        <p className="mt-3 text-slate-600">
          Getting Databricks running is simpler than it looks. There's a handful of ways in, and a couple of workspace
          types to choose between — here's the shape of it, then answer six quick questions and we'll pick the right
          path for you.
        </p>
      </div>

      <div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          {flowSteps.map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-2 sm:flex-1 sm:flex-row sm:gap-3">
              <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-orange-600">Step {i + 1}</div>
                <div className="mt-0.5 font-medium text-slate-900">{step}</div>
              </div>
              {i < flowSteps.length - 1 && (
                <div className="text-slate-300" aria-hidden>
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Ways to get in</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entryRoutes.map((route) => (
            <div key={route.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="font-medium text-slate-900">{route.title}</div>
              <p className="mt-1.5 text-sm text-slate-600">{route.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Serverless or classic?</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {workspaceTypes.map((type) => (
            <div key={type.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-900">{type.title}</div>
                <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  {type.badge}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="self-start rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-orange-700"
      >
        Answer six quick questions →
      </button>
    </div>
  )
}
