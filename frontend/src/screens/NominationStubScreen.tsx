type Props = {
  playerNames: string[]
  onBack: () => void
}

/** Task 3.4 stub — nomination + timed voting comes next. */
export function NominationStubScreen({ playerNames, onBack }: Props) {
  return (
    <main className="screen nomination-stub-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Nomination</h1>
        <p className="lede">
          TODO: nominate chancellor and run the 5s Ja/Nein vote (Task 3.4).
          Table: {playerNames.join(', ')}.
        </p>
      </header>

      <footer className="screen-actions">
        <button type="button" className="btn ghost" onClick={onBack}>
          Back to role reveal start
        </button>
      </footer>
    </main>
  )
}
