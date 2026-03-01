import { useState } from 'react';
import { BENEFIT_ESTIMATES } from '../utils/calculations';

const SUGGESTIONS = Object.keys(BENEFIT_ESTIMATES);

export default function BenefitTags({ benefits, onChange }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = SUGGESTIONS.filter(
    s => s.includes(input.toLowerCase()) && !benefits.map(b => b.toLowerCase()).includes(s)
  );

  const addBenefit = (text) => {
    const trimmed = text.trim();
    if (trimmed && !benefits.map(b => b.toLowerCase()).includes(trimmed.toLowerCase())) {
      onChange([...benefits, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const removeBenefit = (index) => {
    onChange(benefits.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addBenefit(input);
    }
  };

  return (
    <div className="benefit-tags">
      <div className="tags-list">
        {benefits.map((b, i) => (
          <span key={i} className="tag">
            {b}
            <button type="button" onClick={() => removeBenefit(i)} aria-label={`Remove ${b}`}>
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="tag-input-wrap">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Add benefit..."
          className="tag-input"
        />
        {showSuggestions && input && filtered.length > 0 && (
          <ul className="tag-suggestions">
            {filtered.slice(0, 6).map(s => (
              <li key={s} onMouseDown={() => addBenefit(s)}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
