import './CompletionScreenNormal.css';

export default function CompletionScreenNormal({ onBack, backLabel, children }) {
  return (
    <div className="completion-normal-page">
      {['tl', 'tr', 'tr2', 'ml', 'mr', 'bl', 'br', 'br2'].map((position) => (
        <span key={position} className={'completion-normal-decor-square completion-normal-decor-square--' + position} aria-hidden="true" />
      ))}
      <button className="completion-normal-back-button" aria-label={backLabel} title={backLabel} type="button" onClick={onBack}>
        <span aria-hidden="true">&larr;</span>
      </button>
      <main className="completion-normal-content">
        <img className="completion-normal-hero-image" src="/greatjob.png" alt="A fox, owl, bear and rabbit celebrating with party hats and confetti" />
        <h1 className="completion-normal-title">Great job!</h1>
        <p className="completion-normal-subtitle">
          You crossed the finish line. Remember, every time you practice and
          try your best, your brain gets a little bit stronger. Keep up the
          amazing work!
        </p>
        {children && <div className="completion-normal-status" role="status">{children}</div>}
      </main>
    </div>
  );
}
