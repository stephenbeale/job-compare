import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { parseJobListing, parseJobUrl, mergeAiData } from '../utils/aiParser';

export default function AiImportModal({ job, onUpdate, onClose }) {
  const [mode, setMode] = useState('url');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const urlInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Focus the active input on mount/mode change, restore focus on unmount
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    if (mode === 'url') {
      urlInputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
    return () => previouslyFocused?.focus();
  }, [mode]);

  // Trap focus inside the modal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll(
      'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  const handleImport = async () => {
    setError('');

    if (mode === 'url') {
      if (!url.trim()) {
        setError('Please paste a job listing URL.');
        return;
      }
      if (!/^https?:\/\/.+/.test(url.trim())) {
        setError('Please enter a valid URL starting with http:// or https://');
        return;
      }
    } else {
      if (!text.trim()) {
        setError('Please paste a job listing.');
        return;
      }
    }

    setLoading(true);

    try {
      const aiData = mode === 'url'
        ? await parseJobUrl(url.trim())
        : await parseJobListing(text);
      const merged = mergeAiData(job, aiData);
      onUpdate(merged);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === 'url' ? url.trim() : text.trim();

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-import-heading"
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id="ai-import-heading">AI Import</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="ai-import-tabs" role="tablist" aria-label="Import method">
          <button
            role="tab"
            aria-selected={mode === 'url'}
            className={`ai-import-tab ${mode === 'url' ? 'active' : ''}`}
            onClick={() => setMode('url')}
          >
            Paste URL
          </button>
          <button
            role="tab"
            aria-selected={mode === 'text'}
            className={`ai-import-tab ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            Paste text
          </button>
        </div>

        {mode === 'url' ? (
          <>
            <p className="modal-description">
              Paste the URL of a job listing and AI will fetch and extract the details automatically.
            </p>
            <div className="modal-field">
              <label htmlFor="ai-import-url">Job Listing URL</label>
              <input
                id="ai-import-url"
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.indeed.co.uk/viewjob?jk=..."
                className="modal-input"
              />
            </div>
            <p className="modal-hint">
              Works with most job sites. If the site blocks fetching, switch to "Paste text" instead.
            </p>
          </>
        ) : (
          <>
            <p className="modal-description">
              Paste a job listing below and AI will extract the salary, hours, benefits, and other
              details automatically. You can review and edit the results afterwards.
            </p>
            <div className="modal-field">
              <label htmlFor="ai-import-text">Job Listing Text</label>
              <textarea
                id="ai-import-text"
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Paste the full job listing here...\n\nCopy everything from the job advert \u2014 title, salary, benefits, working hours, location, etc. The more detail you include, the better the extraction."}
                rows={12}
                className="modal-textarea"
              />
            </div>
          </>
        )}

        {error && <div className="modal-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Extracting...' : 'Extract & Fill'}
          </button>
        </div>

        <p className="modal-hint" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
          Free to use &mdash; powered by Claude AI. Limited to 20 imports per day.
        </p>
      </div>
    </div>,
    document.body
  );
}
