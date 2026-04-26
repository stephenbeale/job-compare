const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || 'https://job-compare-ai.stephenbeale.workers.dev';

async function callProxy(body) {
  const response = await fetch(`${PROXY_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `AI service error (${response.status})`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function parseJobListing(text) {
  return callProxy({ text });
}

export async function parseJobUrl(url) {
  return callProxy({ url });
}

// Merge AI-parsed data into an existing job object, only overwriting non-null values
export function mergeAiData(existingJob, aiData) {
  const merged = { ...existingJob };

  const directFields = [
    'title', 'company', 'salary', 'annualLeave', 'contractualHours',
    'weeklyOvertime', 'commuteMinutes', 'commuteCostMonthly', 'daysInOffice',
    'workplaceCostMonthly', 'bonusValue', 'bonusIsPercent', 'pensionEmployer',
    'pensionEmployerMatchMax', 'pensionEmployeeMax', 'pensionType',
    'commuteMethod', 'commuteDistanceMiles', 'commuteVehicleMpg',
    'probationMonths', 'noticePeriod', 'sicknessPolicy', 'progressionRating',
    'jobSecurity', 'workLifeBalance', 'cultureFit', 'careerLongTermNotes',
  ];

  for (const field of directFields) {
    if (aiData[field] !== null && aiData[field] !== undefined) {
      merged[field] = String(aiData[field]);
    }
  }

  // Boolean fields
  if (aiData.bonusIsPercent !== null && aiData.bonusIsPercent !== undefined) {
    merged.bonusIsPercent = aiData.bonusIsPercent === true;
  }

  // Numeric rating fields — keep as numbers not strings
  for (const field of ['progressionRating', 'jobSecurity', 'workLifeBalance', 'cultureFit']) {
    if (aiData[field] !== null && aiData[field] !== undefined) {
      merged[field] = Number(aiData[field]);
    }
  }

  // Benefits array
  if (Array.isArray(aiData.benefits) && aiData.benefits.length > 0) {
    merged.benefits = aiData.benefits;
  }

  return merged;
}
