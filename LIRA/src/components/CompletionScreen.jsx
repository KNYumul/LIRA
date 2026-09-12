import './CompletionScreen.css';

export default function CompletionScreen({ onBack, backLabel, children }) {
  return (
    <div className="completion-page">
      {['tl', 'tr', 'tr2', 'ml', 'mr', 'bl', 'br', 'br2'].map((position) => (
        <span key={position} className={'completion-decor-square completion-decor-square--' + position} aria-hidden="true" />
      ))}
      <button className="completion-back-button" aria-label={backLabel} title={backLabel} type="button" onClick={onBack}>
        <span aria-hidden="true">&larr;</span>
      </button>
      <main className="completion-content">
        <img className="completion-hero-image" src="/greatjob.png" alt="A fox, owl, bear and rabbit celebrating with party hats and confetti" />
        <h1 className="completion-title">Great job!</h1>
        <p className="completion-subtitle">
          You crossed the finish line. Remember, every time you practice and
          try your best, your brain gets a little bit stronger. Keep up the
          amazing work!
        </p>
        {children && <div className="completion-status" role="status">{children}</div>}
      </main>
    </div>
  );
}
