import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { parseJobListing, mergeAiData } from '../utils/aiParser';

export default function AiImportModal({ job, onUpdate, onClose }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const textareaRef = useRef(null);

  // Focus the textarea on mount, restore focus on unmount
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    textareaRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

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
    if (!text.trim()) {
      setError('Please paste a job listing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const aiData = await parseJobListing(text);
      const merged = mergeAiData(job, aiData);
      onUpdate(merged);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        {error && <div className="modal-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={loading || !text.trim()}
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
