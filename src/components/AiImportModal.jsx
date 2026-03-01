import { useState } from 'react';
import { getApiKey, saveApiKey, parseJobListing, mergeAiData } from '../utils/aiParser';

export default function AiImportModal({ job, onUpdate, onClose }) {
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(!getApiKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key.');
      setShowKey(true);
      return;
    }
    if (!text.trim()) {
      setError('Please paste a job listing.');
      return;
    }

    setLoading(true);
    setError('');
    saveApiKey(apiKey);

    try {
      const aiData = await parseJobListing(text, apiKey.trim());
      const merged = mergeAiData(job, aiData);
      onUpdate(merged);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Import</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <p className="modal-description">
          Paste a job listing below and AI will extract the salary, hours, benefits, and other
          details automatically. You can review and edit the results afterwards.
        </p>

        {showKey ? (
          <div className="modal-field">
            <label>OpenAI API Key</label>
            <div className="key-input-row">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="modal-input"
              />
              <button
                type="button"
                className="btn-sm"
                onClick={() => setShowKey(false)}
                disabled={!apiKey.trim()}
              >
                Save
              </button>
            </div>
            <span className="modal-hint">
              Stored locally in your browser. Never sent anywhere except OpenAI.
              Uses gpt-4o-mini (~0.1p per import).
            </span>
          </div>
        ) : (
          <div className="modal-field">
            <div className="key-saved">
              API key saved
              <button type="button" className="link-btn" onClick={() => setShowKey(true)}>
                Change
              </button>
            </div>
          </div>
        )}

        <div className="modal-field">
          <label>Job Listing Text</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Paste the full job listing here...\n\nCopy everything from the job advert — title, salary, benefits, working hours, location, etc. The more detail you include, the better the extraction."}
            rows={12}
            className="modal-textarea"
          />
        </div>

        {error && <div className="modal-error">{error}</div>}

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
      </div>
    </div>
  );
}
