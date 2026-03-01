import { useState } from 'react';
import StarRating from './StarRating';
import BenefitTags from './BenefitTags';
import AiImportModal from './AiImportModal';
import {
  calcEffectiveHourlyRate,
  calcAnnualCommuteCost,
  calcAnnualCommuteHours,
  calcTotalCompensation,
  calcOvertimeCost,
  calcNetWorkingHours,
  calcTrueNetValue,
  calcAnnualWorkplaceCost,
  calcBonusAmount,
  calcBenefitsValue,
  calcOverallScore,
  UK_DEFAULTS,
} from '../utils/calculations';

function fmt(n, decimals = 0) {
  return '\u00A3' + n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ScoreRing({ score }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? 'var(--best)' : score >= 40 ? 'var(--accent)' : 'var(--worst)';

  return (
    <div className="score-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--card-border)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="score-value">{score}</span>
    </div>
  );
}

export default function JobCard({ job, allJobs, rankings, onChange, onRemove, index }) {
  const [showAiImport, setShowAiImport] = useState(false);
  const hasSalary = parseFloat(job.salary) > 0;

  const update = (field, value) => {
    onChange({ ...job, [field]: value });
  };

  const rank = (metric) => rankings[metric]?.[job.id];

  const score = hasSalary ? calcOverallScore(job, allJobs) : 0;
  const isBestOverall = score > 0 && allJobs.filter(j => parseFloat(j.salary)).every(j => calcOverallScore(j, allJobs) <= score);

  return (
    <div className={`job-card ${isBestOverall && allJobs.filter(j => parseFloat(j.salary)).length > 1 ? 'card-recommended' : ''}`}
         style={{ animationDelay: `${index * 0.08}s` }}>

      {isBestOverall && allJobs.filter(j => parseFloat(j.salary)).length > 1 && (
        <div className="card-badge">Best Match</div>
      )}

      <button className="card-remove" onClick={onRemove} aria-label="Remove job">&times;</button>

      {/* Header */}
      <div className="card-header">
        <input
          className="card-title-input"
          value={job.title}
          onChange={e => update('title', e.target.value)}
          placeholder="Job Title"
        />
        <input
          className="card-company-input"
          value={job.company}
          onChange={e => update('company', e.target.value)}
          placeholder="Company Name"
        />
        <button
          type="button"
          className="ai-import-btn"
          onClick={() => setShowAiImport(true)}
          title="Paste a job listing and let AI fill in the fields"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4a2 2 0 0 1-2-2 4 4 0 0 1 4-4z"/>
            <path d="M8 8v2a6 6 0 0 0 8 0V8"/>
            <path d="M12 14v8"/>
            <path d="M8 18h8"/>
          </svg>
          AI Import
        </button>
        {hasSalary && <ScoreRing score={score} />}
      </div>

      {showAiImport && (
        <AiImportModal
          job={job}
          onUpdate={onChange}
          onClose={() => setShowAiImport(false)}
        />
      )}

      {/* Salary & Core */}
      <div className="card-section">
        <h3 className="section-title">Compensation</h3>

        <div className="field-row">
          <label>Base Salary</label>
          <div className="input-with-prefix">
            <span className="prefix">&pound;</span>
            <input
              type="number"
              value={job.salary}
              onChange={e => update('salary', e.target.value)}
              placeholder="45,000"
              className={rank('salary')}
            />
            <span className="suffix">/ year</span>
          </div>
        </div>

        <div className="field-row">
          <label>Bonus</label>
          <div className="bonus-input">
            <div className="input-with-prefix">
              <span className="prefix">{job.bonusIsPercent ? '%' : '\u00A3'}</span>
              <input
                type="number"
                value={job.bonusValue}
                onChange={e => update('bonusValue', e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="button"
              className="toggle-btn"
              onClick={() => update('bonusIsPercent', !job.bonusIsPercent)}
              title={job.bonusIsPercent ? 'Switch to fixed amount' : 'Switch to percentage'}
            >
              {job.bonusIsPercent ? '% of salary' : 'Fixed'}
            </button>
          </div>
        </div>

        <div className="field-row">
          <label>Employer Pension</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.pensionEmployer}
              onChange={e => update('pensionEmployer', e.target.value)}
              placeholder="3"
              min="0" max="100" step="0.5"
            />
            <span className="suffix">%</span>
          </div>
          <span className="hint">UK min: {UK_DEFAULTS.minPensionEmployer}%</span>
        </div>
      </div>

      {/* Working Hours */}
      <div className="card-section">
        <h3 className="section-title">Working Hours</h3>

        <div className="field-row">
          <label>Contractual Hours</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.contractualHours}
              onChange={e => update('contractualHours', e.target.value)}
              placeholder="37.5"
              step="0.5"
            />
            <span className="suffix">hrs/week</span>
          </div>
        </div>

        <div className="field-row">
          <label>Unpaid Overtime</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.weeklyOvertime}
              onChange={e => update('weeklyOvertime', e.target.value)}
              placeholder="0"
              step="0.5"
              className={rank('overtime')}
            />
            <span className="suffix">hrs/week</span>
          </div>
        </div>

        <div className="field-row">
          <label>Annual Leave</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.annualLeave}
              onChange={e => update('annualLeave', e.target.value)}
              placeholder="25"
              className={rank('annualLeave')}
            />
            <span className="suffix">days</span>
          </div>
          <span className="hint">UK min: {UK_DEFAULTS.minAnnualLeave} (inc. bank hols)</span>
        </div>
      </div>

      {/* Commute */}
      <div className="card-section">
        <h3 className="section-title">Commute</h3>

        <div className="field-row">
          <label>Travel Time</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.commuteMinutes}
              onChange={e => update('commuteMinutes', e.target.value)}
              placeholder="30"
              className={rank('commute')}
            />
            <span className="suffix">min each way</span>
          </div>
        </div>

        <div className="field-row">
          <label>Monthly Cost</label>
          <div className="input-with-prefix">
            <span className="prefix">&pound;</span>
            <input
              type="number"
              value={job.commuteCostMonthly}
              onChange={e => update('commuteCostMonthly', e.target.value)}
              placeholder="0"
            />
            <span className="suffix">/month</span>
          </div>
        </div>

        <div className="field-row">
          <label>Days in Office</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.daysInOffice}
              onChange={e => update('daysInOffice', e.target.value)}
              placeholder="5"
              min="0" max="5"
            />
            <span className="suffix">per week</span>
          </div>
        </div>

        <div className="field-row">
          <label>Workplace Costs</label>
          <div className="input-with-prefix">
            <span className="prefix">&pound;</span>
            <input
              type="number"
              value={job.workplaceCostMonthly}
              onChange={e => update('workplaceCostMonthly', e.target.value)}
              placeholder="0"
            />
            <span className="suffix">/month</span>
          </div>
          <span className="hint">Parking, lunches, coffee, dry cleaning, etc.</span>
        </div>
      </div>

      {/* Qualitative Ratings */}
      <div className="card-section">
        <h3 className="section-title">Your Assessment</h3>

        <div className="field-row">
          <label>Progression Potential</label>
          <StarRating value={job.progressionRating} onChange={v => update('progressionRating', v)} label="Progression" />
        </div>

        <div className="field-row">
          <label>Job Security</label>
          <StarRating value={job.jobSecurity} onChange={v => update('jobSecurity', v)} label="Job security" />
        </div>

        <div className="field-row">
          <label>Work-Life Balance</label>
          <StarRating value={job.workLifeBalance} onChange={v => update('workLifeBalance', v)} label="Work-life balance" />
        </div>

        <div className="field-row">
          <label>Culture Fit</label>
          <StarRating value={job.cultureFit} onChange={v => update('cultureFit', v)} label="Culture fit" />
        </div>
      </div>

      {/* Career Long-term */}
      <div className="card-section">
        <h3 className="section-title">Long-term Career Impact</h3>
        <textarea
          value={job.careerLongTermNotes}
          onChange={e => update('careerLongTermNotes', e.target.value)}
          placeholder="How will this role benefit your career in 3-5 years? Consider skills gained, network, industry reputation, promotion path..."
          rows={3}
          className="career-textarea"
        />
      </div>

      {/* Terms */}
      <div className="card-section">
        <h3 className="section-title">Contract Terms</h3>

        <div className="field-row">
          <label>Probation</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.probationMonths}
              onChange={e => update('probationMonths', e.target.value)}
              placeholder="3"
            />
            <span className="suffix">months</span>
          </div>
        </div>

        <div className="field-row">
          <label>Notice Period</label>
          <div className="input-with-prefix">
            <input
              type="number"
              value={job.noticePeriod}
              onChange={e => update('noticePeriod', e.target.value)}
              placeholder="1"
            />
            <span className="suffix">months</span>
          </div>
        </div>

        <div className="field-row">
          <label>Sickness Policy</label>
          <select value={job.sicknessPolicy} onChange={e => update('sicknessPolicy', e.target.value)}>
            <option value="Statutory">Statutory (SSP only)</option>
            <option value="Enhanced">Enhanced company scheme</option>
            <option value="Full">Full pay for X weeks</option>
          </select>
        </div>
      </div>

      {/* Benefits */}
      <div className="card-section">
        <h3 className="section-title">Added Benefits</h3>
        <BenefitTags benefits={job.benefits} onChange={v => update('benefits', v)} />
      </div>

      {/* Calculated Summary */}
      {hasSalary && (
        <div className="card-section card-summary">
          <h3 className="section-title">The Real Picture</h3>

          <div className={`calc-row ${rank('effectiveHourly') || ''}`}>
            <span className="calc-label">Effective Hourly Rate</span>
            <span className="calc-value">{fmt(calcEffectiveHourlyRate(job), 2)}/hr</span>
          </div>

          <div className={`calc-row ${rank('annualCommuteCost') || ''}`}>
            <span className="calc-label">Annual Commute Cost</span>
            <span className="calc-value">{fmt(calcAnnualCommuteCost(job))}</span>
          </div>

          <div className="calc-row">
            <span className="calc-label">Annual Commute Hours</span>
            <span className="calc-value">{Math.round(calcAnnualCommuteHours(job))} hrs</span>
          </div>

          <div className={`calc-row ${rank('workplaceCost') || ''}`}>
            <span className="calc-label">Annual Workplace Costs</span>
            <span className="calc-value">{fmt(calcAnnualWorkplaceCost(job))}</span>
          </div>

          <div className="calc-row">
            <span className="calc-label">Net Working Hours/Year</span>
            <span className="calc-value">{Math.round(calcNetWorkingHours(job))} hrs</span>
          </div>

          <div className={`calc-row ${rank('overtimeCost') || ''}`}>
            <span className="calc-label">Overtime Hidden Cost</span>
            <span className="calc-value">{fmt(calcOvertimeCost(job))}</span>
          </div>

          <div className="calc-row">
            <span className="calc-label">Bonus Value</span>
            <span className="calc-value">{fmt(calcBonusAmount(job))}</span>
          </div>

          <div className="calc-row">
            <span className="calc-label">Benefits Est. Value</span>
            <span className="calc-value">{fmt(calcBenefitsValue(job))}</span>
          </div>

          <div className={`calc-row total ${rank('totalComp') || ''}`}>
            <span className="calc-label">Total Compensation</span>
            <span className="calc-value">{fmt(calcTotalCompensation(job))}</span>
          </div>

          <div className={`calc-row grand-total ${rank('trueNet') || ''}`}>
            <span className="calc-label">True Net Value</span>
            <span className="calc-value">{fmt(calcTrueNetValue(job))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
