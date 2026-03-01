import { useState } from 'react';

export default function Header({ onExport, onClearAll, jobCount }) {
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const md = onExport();
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--accent)" />
              <path d="M12 28V14L20 10L28 14V28L20 24L12 28Z" fill="white" opacity="0.9" />
              <path d="M20 10V24" stroke="white" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="3" fill="var(--accent)" />
            </svg>
            <div>
              <h1>JobWeigh</h1>
              <p className="tagline">Weigh up your options</p>
            </div>
          </div>
        </div>
        <p className="header-description">
          Compare job offers side by side. Enter salaries, benefits, commute costs and more —
          see the true value of each role beyond the headline number.
        </p>
        <div className="header-actions">
          {jobCount > 0 && (
            <>
              <button className="btn btn-outline" onClick={handleExport}>
                {copied ? 'Copied!' : 'Export'}
              </button>
              <button className="btn btn-ghost" onClick={onClearAll}>
                Clear All
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
