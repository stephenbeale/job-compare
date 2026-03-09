import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import JobCard from './components/JobCard';
import {
  createEmptyJob,
  calcEffectiveHourlyRate,
  calcAnnualCommuteCost,
  calcOvertimeCost,
  calcTotalCompensation,
  calcTrueNetValue,
  calcTrueHourlyRate,
  calcAnnualWorkplaceCost,
  rankJobs,
  exportToMarkdown,
} from './utils/calculations';
import { loadJobs, saveJobs } from './utils/storage';

let nextId = 1;

function App() {
  const [jobs, setJobs] = useState(() => {
    const saved = loadJobs();
    if (saved && saved.length > 0) {
      nextId = Math.max(...saved.map(j => j.id)) + 1;
      return saved;
    }
    const initial = [createEmptyJob(nextId++), createEmptyJob(nextId++)];
    return initial;
  });

  useEffect(() => {
    saveJobs(jobs);
  }, [jobs]);

  const addJob = () => {
    if (jobs.length >= 4) return;
    setJobs([...jobs, createEmptyJob(nextId++)]);
  };

  const removeJob = (id) => {
    if (jobs.length <= 1) return;
    setJobs(jobs.filter(j => j.id !== id));
  };

  const updateJob = useCallback((updated) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
  }, []);

  const clearAll = () => {
    nextId = 1;
    setJobs([createEmptyJob(nextId++), createEmptyJob(nextId++)]);
  };

  const handleExport = () => exportToMarkdown(jobs);

  // Calculate rankings across all jobs
  const rankings = {
    salary: rankJobs(jobs, j => parseFloat(j.salary) || 0),
    annualLeave: rankJobs(jobs, j => parseFloat(j.annualLeave) || 0),
    commute: rankJobs(jobs, j => parseFloat(j.commuteMinutes) || 0, true),
    overtime: rankJobs(jobs, j => parseFloat(j.weeklyOvertime) || 0, true),
    effectiveHourly: rankJobs(jobs, j => calcEffectiveHourlyRate(j)),
    annualCommuteCost: rankJobs(jobs, j => calcAnnualCommuteCost(j), true),
    overtimeCost: rankJobs(jobs, j => calcOvertimeCost(j), true),
    workplaceCost: rankJobs(jobs, j => calcAnnualWorkplaceCost(j), true),
    totalComp: rankJobs(jobs, j => calcTotalCompensation(j)),
    trueNet: rankJobs(jobs, j => calcTrueNetValue(j)),
    trueHourly: rankJobs(jobs, j => calcTrueHourlyRate(j)),
  };

  return (
    <div className="app">
      <Header onExport={handleExport} onClearAll={clearAll} jobCount={jobs.length} />

      <main className="main">
        <div className={`cards-grid cards-${Math.min(jobs.length, 4)}`}>
          {jobs.map((job, i) => (
            <JobCard
              key={job.id}
              job={job}
              allJobs={jobs}
              rankings={rankings}
              onChange={updateJob}
              onRemove={() => removeJob(job.id)}
              index={i}
            />
          ))}

          {jobs.length < 4 && (
            <button className="add-card" onClick={addJob}>
              <span className="add-icon">+</span>
              <span>Add Job</span>
            </button>
          )}
        </div>

        <footer className="app-footer">
          <p>
            Calculations are estimates. Benefit values are UK averages.
            Always verify terms directly with the employer.
          </p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.6 }}>
            Found this useful?{' '}
            <a
              href="https://buymeacoffee.com/stephenbeale"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Buy me a coffee
            </a>
          </p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.5 }}>
            <a
              href="MONZO_REFERRAL_URL"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-muted, #999)' }}
            >
              Starting a new job? Monzo makes budgeting easy
            </a>
            {' \u00B7 '}
            <a
              href="QUIDCO_REFERRAL_URL"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-muted, #999)' }}
            >
              Make your salary go further with Quidco cashback
            </a>
            {' \u00B7 '}
            <a
              href="CLAUDE_REFERRAL_URL"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-muted, #999)' }}
            >
              AI-powered job import built with Claude
            </a>
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.65rem', opacity: 0.35 }}>
            Some links are referral links
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
