export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Terms Watcher
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl">
          AI-powered analysis of terms and conditions to identify potentially
          unfair clauses and protect your rights. Get clear, transparent risk
          assessments with detailed explanations.
        </p>
        <div className="mt-10 flex items-center gap-x-6">
          <a
            href="/analysis"
            className="rounded-md bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Analyze Terms
          </a>
          <a
            href="/about"
            className="text-sm font-semibold leading-6 text-black"
          >
            Learn more <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/10 p-3">
              <svg
                className="h-6 w-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold">Transparent Analysis</h3>
            <p className="mt-2 text-sm text-gray-600">
              Clear explanations for every risk assessment with confidence
              scores
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/10 p-3">
              <svg
                className="h-6 w-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold">Privacy Protected</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your terms text is never stored, only analysis results
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-black/10 p-3">
              <svg
                className="h-6 w-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold">Fast & Accurate</h3>
            <p className="mt-2 text-sm text-gray-600">
              AI-powered analysis in under 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}