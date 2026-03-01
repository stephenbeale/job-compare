// UK statutory minimums and defaults
export const UK_DEFAULTS = {
  minAnnualLeave: 28, // including bank holidays
  bankHolidays: 8,
  standardWeeklyHours: 37.5,
  weeksPerYear: 52,
  workingDaysPerWeek: 5,
  minPensionEmployer: 3, // % of qualifying earnings
  nationalInsuranceThreshold: 12570,
};

export const BENEFIT_ESTIMATES = {
  'health insurance': 1500,
  'dental insurance': 500,
  'gym membership': 600,
  'cycle scheme': 400,
  'life insurance': 300,
  'income protection': 500,
  'eye care': 100,
  'mental health support': 200,
  'childcare vouchers': 2400,
  'season ticket loan': 200,
  'free parking': 1200,
  'company car': 5000,
  'phone allowance': 360,
  'remote working allowance': 600,
  'professional development': 1000,
  'share scheme': 1500,
  'enhanced maternity': 2000,
  'enhanced paternity': 1000,
  'sabbatical': 500,
  'private medical': 1500,
};

export function createEmptyJob(id) {
  return {
    id,
    title: '',
    company: '',
    salary: '',
    annualLeave: '25',
    contractualHours: '37.5',
    weeklyOvertime: '0',
    commuteMinutes: '30',
    commuteCostMonthly: '0',
    bonusValue: '0',
    bonusIsPercent: false,
    progressionRating: 3,
    careerLongTermNotes: '',
    benefits: [],
    daysInOffice: '5',
    workplaceCostMonthly: '0',
    pensionEmployer: '3',
    probationMonths: '3',
    noticePeriod: '1',
    sicknessPolicy: 'Statutory',
    jobSecurity: 3,
    workLifeBalance: 3,
    cultureFit: 3,
  };
}

export function calcEffectiveHourlyRate(job) {
  const salary = parseFloat(job.salary) || 0;
  const weeklyHours = parseFloat(job.contractualHours) || 37.5;
  const overtime = parseFloat(job.weeklyOvertime) || 0;
  const totalWeeklyHours = weeklyHours + overtime;
  const annualLeave = parseFloat(job.annualLeave) || 25;
  const workingWeeks = UK_DEFAULTS.weeksPerYear - (annualLeave / UK_DEFAULTS.workingDaysPerWeek);
  const annualHours = totalWeeklyHours * workingWeeks;
  if (annualHours === 0) return 0;
  return salary / annualHours;
}

export function calcAnnualCommuteCost(job) {
  const monthlyCost = parseFloat(job.commuteCostMonthly) || 0;
  const daysInOffice = parseFloat(job.daysInOffice) || 5;
  const ratio = daysInOffice / UK_DEFAULTS.workingDaysPerWeek;
  return monthlyCost * 12 * ratio;
}

export function calcAnnualCommuteHours(job) {
  const minutesEachWay = parseFloat(job.commuteMinutes) || 0;
  const annualLeave = parseFloat(job.annualLeave) || 25;
  const workingDays = (UK_DEFAULTS.weeksPerYear * UK_DEFAULTS.workingDaysPerWeek) - annualLeave;
  const daysInOffice = parseFloat(job.daysInOffice) || 5;
  const ratio = daysInOffice / UK_DEFAULTS.workingDaysPerWeek;
  return (minutesEachWay * 2 * workingDays * ratio) / 60;
}

export function calcAnnualWorkplaceCost(job) {
  const monthlyCost = parseFloat(job.workplaceCostMonthly) || 0;
  const daysInOffice = parseFloat(job.daysInOffice) || 5;
  const ratio = daysInOffice / UK_DEFAULTS.workingDaysPerWeek;
  return monthlyCost * 12 * ratio;
}

export function calcBonusAmount(job) {
  const salary = parseFloat(job.salary) || 0;
  const bonusValue = parseFloat(job.bonusValue) || 0;
  if (job.bonusIsPercent) {
    return (salary * bonusValue) / 100;
  }
  return bonusValue;
}

export function calcBenefitsValue(job) {
  return job.benefits.reduce((total, benefit) => {
    const key = benefit.toLowerCase().trim();
    return total + (BENEFIT_ESTIMATES[key] || 500); // default £500 for unknown benefits
  }, 0);
}

export function calcTotalCompensation(job) {
  const salary = parseFloat(job.salary) || 0;
  const bonus = calcBonusAmount(job);
  const benefits = calcBenefitsValue(job);
  const pensionPercent = parseFloat(job.pensionEmployer) || 0;
  const pensionValue = (salary * pensionPercent) / 100;
  return salary + bonus + benefits + pensionValue;
}

export function calcOvertimeCost(job) {
  const hourlyRate = calcEffectiveHourlyRate(job);
  const overtime = parseFloat(job.weeklyOvertime) || 0;
  const annualLeave = parseFloat(job.annualLeave) || 25;
  const workingWeeks = UK_DEFAULTS.weeksPerYear - (annualLeave / UK_DEFAULTS.workingDaysPerWeek);
  return hourlyRate * overtime * workingWeeks;
}

export function calcNetWorkingHours(job) {
  const weeklyHours = parseFloat(job.contractualHours) || 37.5;
  const annualLeave = parseFloat(job.annualLeave) || 25;
  const workingWeeks = UK_DEFAULTS.weeksPerYear - (annualLeave / UK_DEFAULTS.workingDaysPerWeek);
  return weeklyHours * workingWeeks;
}

// True hourly rate: net value / total hours given to the job (work + overtime + commute)
export function calcTrueHourlyRate(job) {
  const trueNet = calcTrueNetValue(job);
  const weeklyHours = parseFloat(job.contractualHours) || 37.5;
  const overtime = parseFloat(job.weeklyOvertime) || 0;
  const annualLeave = parseFloat(job.annualLeave) || 25;
  const workingWeeks = UK_DEFAULTS.weeksPerYear - (annualLeave / UK_DEFAULTS.workingDaysPerWeek);
  const totalWorkHours = (weeklyHours + overtime) * workingWeeks;
  const commuteHours = calcAnnualCommuteHours(job);
  const totalHoursGiven = totalWorkHours + commuteHours;
  if (totalHoursGiven === 0) return 0;
  return trueNet / totalHoursGiven;
}

export function calcTrueNetValue(job) {
  const totalComp = calcTotalCompensation(job);
  const commuteCost = calcAnnualCommuteCost(job);
  const overtimeCost = calcOvertimeCost(job);
  const workplaceCost = calcAnnualWorkplaceCost(job);
  return totalComp - commuteCost - overtimeCost - workplaceCost;
}

// Score each job out of 100 based on weighted factors
export function calcOverallScore(job, allJobs) {
  if (!parseFloat(job.salary)) return 0;

  const scores = {};
  const weights = {
    trueNetValue: 25,
    effectiveHourlyRate: 20,
    annualLeave: 10,
    commuteTime: 10,
    progression: 10,
    benefits: 8,
    workLifeBalance: 7,
    jobSecurity: 5,
    cultureFit: 5,
  };

  // Gather values for all jobs for relative scoring
  const values = allJobs.filter(j => parseFloat(j.salary)).map(j => ({
    trueNetValue: calcTrueNetValue(j),
    effectiveHourlyRate: calcEffectiveHourlyRate(j),
    annualLeave: parseFloat(j.annualLeave) || 0,
    commuteTime: -(parseFloat(j.commuteMinutes) || 0), // negative = less is better
    progression: j.progressionRating || 0,
    benefits: j.benefits.length,
    workLifeBalance: j.workLifeBalance || 0,
    jobSecurity: j.jobSecurity || 0,
    cultureFit: j.cultureFit || 0,
  }));

  const thisValues = {
    trueNetValue: calcTrueNetValue(job),
    effectiveHourlyRate: calcEffectiveHourlyRate(job),
    annualLeave: parseFloat(job.annualLeave) || 0,
    commuteTime: -(parseFloat(job.commuteMinutes) || 0),
    progression: job.progressionRating || 0,
    benefits: job.benefits.length,
    workLifeBalance: job.workLifeBalance || 0,
    jobSecurity: job.jobSecurity || 0,
    cultureFit: job.cultureFit || 0,
  };

  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const allVals = values.map(v => v[key]);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min;
    const normalized = range === 0 ? 1 : (thisValues[key] - min) / range;
    totalScore += normalized * weight;
  }

  return Math.round(totalScore);
}

// Determine best/worst for a metric across jobs (higher is better unless inverted)
export function rankJobs(jobs, metricFn, lowerIsBetter = false) {
  const validJobs = jobs.filter(j => parseFloat(j.salary));
  if (validJobs.length < 2) return {};

  const values = validJobs.map(j => ({ id: j.id, value: metricFn(j) }));
  const sorted = [...values].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);

  const result = {};
  if (sorted.length > 0) result[sorted[0].id] = 'best';
  if (sorted.length > 1) result[sorted[sorted.length - 1].id] = 'worst';
  return result;
}

export function exportToMarkdown(jobs) {
  const validJobs = jobs.filter(j => j.title || j.company);
  if (validJobs.length === 0) return '';

  let md = '# JobWeigh Comparison\n\n';
  md += '| Metric | ' + validJobs.map(j => `${j.title || 'Untitled'} (${j.company || '?'})` ).join(' | ') + ' |\n';
  md += '| --- | ' + validJobs.map(() => '---').join(' | ') + ' |\n';

  const rows = [
    ['Base Salary', j => fmt(parseFloat(j.salary) || 0)],
    ['Annual Leave', j => `${j.annualLeave} days`],
    ['Weekly Hours', j => `${j.contractualHours}h`],
    ['Unpaid Overtime', j => `${j.weeklyOvertime}h/week`],
    ['Commute', j => `${j.commuteMinutes} min each way`],
    ['Commute Cost', j => `${fmt(parseFloat(j.commuteCostMonthly) || 0)}/month`],
    ['Days in Office', j => `${j.daysInOffice}/week`],
    ['Workplace Costs', j => `${fmt(parseFloat(j.workplaceCostMonthly) || 0)}/month`],
    ['Bonus', j => j.bonusIsPercent ? `${j.bonusValue}%` : fmt(parseFloat(j.bonusValue) || 0)],
    ['Employer Pension', j => `${j.pensionEmployer}%`],
    ['Benefits', j => j.benefits.join(', ') || 'None'],
    ['Progression', j => `${'★'.repeat(j.progressionRating)}${'☆'.repeat(5 - j.progressionRating)}`],
    ['Career Long-term', j => j.careerLongTermNotes || '-'],
    ['Job Security', j => `${j.jobSecurity}/5`],
    ['Work-Life Balance', j => `${j.workLifeBalance}/5`],
    ['Culture Fit', j => `${j.cultureFit}/5`],
    ['---', () => '---'],
    ['Effective Hourly Rate', j => fmt(calcEffectiveHourlyRate(j), 2)],
    ['Annual Commute Cost', j => fmt(calcAnnualCommuteCost(j))],
    ['Annual Commute Hours', j => `${Math.round(calcAnnualCommuteHours(j))}h`],
    ['Total Compensation', j => fmt(calcTotalCompensation(j))],
    ['Overtime Hidden Cost', j => fmt(calcOvertimeCost(j))],
    ['True Net Value', j => fmt(calcTrueNetValue(j))],
    ['True Hourly Rate', j => fmt(calcTrueHourlyRate(j), 2)],
    ['Overall Score', j => `${calcOverallScore(j, validJobs)}/100`],
  ];

  for (const [label, fn] of rows) {
    if (label === '---') {
      md += '| **Calculated** | ' + validJobs.map(() => '---').join(' | ') + ' |\n';
    } else {
      md += `| ${label} | ${validJobs.map(fn).join(' | ')} |\n`;
    }
  }

  return md;
}

function fmt(n, decimals = 0) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
