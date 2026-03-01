const STORAGE_KEY = 'jobweigh-openai-key';

export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function saveApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

const SYSTEM_PROMPT = `You are a job listing data extractor. Given raw text from a job advert, extract structured data and return ONLY a JSON object with the following fields. Use null for any field you cannot determine. Do not guess — only extract what is explicitly stated or clearly implied.

{
  "title": "Job title (string)",
  "company": "Company name (string)",
  "salary": "Annual base salary in GBP as a number. If a range is given, use the midpoint. Convert hourly/daily rates to annual. If in USD/EUR, convert to approximate GBP. null if not stated.",
  "annualLeave": "Number of days annual leave (exclude bank holidays unless explicitly included). null if not stated.",
  "contractualHours": "Weekly contracted hours as a number. null if not stated.",
  "weeklyOvertime": "Estimated weekly unpaid overtime in hours. Usually 0 unless the listing hints at long hours culture. Default 0.",
  "commuteMinutes": "null (user should fill this in themselves)",
  "commuteCostMonthly": "null (user should fill this in themselves)",
  "daysInOffice": "Days per week in office as a number. 5 for fully on-site, 0 for fully remote. For hybrid, extract the stated number. null if not stated.",
  "workplaceCostMonthly": "null (user should fill this in themselves)",
  "bonusValue": "Bonus amount or percentage as a number. 0 if not mentioned.",
  "bonusIsPercent": "true if bonus is stated as a percentage, false if a fixed amount",
  "pensionEmployer": "Employer pension contribution as a percentage. null if not stated.",
  "probationMonths": "Probation period in months. null if not stated.",
  "noticePeriod": "Notice period in months. null if not stated.",
  "sicknessPolicy": "One of: 'Statutory', 'Enhanced', 'Full'. Default 'Statutory' if not stated.",
  "benefits": "Array of benefit strings, e.g. ['health insurance', 'gym membership', 'cycle scheme']. Empty array if none mentioned.",
  "progressionRating": "null (subjective — user should rate this)",
  "jobSecurity": "null (subjective — user should rate this)",
  "workLifeBalance": "null (subjective — user should rate this)",
  "cultureFit": "null (subjective — user should rate this)",
  "careerLongTermNotes": "null (subjective — user should fill this in)"
}

Important rules:
- Return ONLY valid JSON, no markdown, no explanation
- Salary must be annual and in GBP. Convert if needed (1 USD ≈ 0.79 GBP, 1 EUR ≈ 0.86 GBP)
- For salary ranges like "£50,000 - £60,000", use the midpoint (55000)
- Annual leave: UK standard is 25 days + 8 bank holidays. If listing says "25 days + bank holidays", return 25. If it says "33 days including bank holidays", return 25.
- Benefits: normalise to lowercase, e.g. "Private Medical Insurance" → "private medical"
- If the text is not a job listing, return {"error": "This doesn't appear to be a job listing"}`;

export async function parseJobListing(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your OpenAI key in settings.');
    }
    throw new Error(err.error?.message || `API error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Empty response from AI');
  }

  // Strip markdown code fences if present
  const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed;
}

// Merge AI-parsed data into an existing job object, only overwriting non-null values
export function mergeAiData(existingJob, aiData) {
  const merged = { ...existingJob };

  const directFields = [
    'title', 'company', 'salary', 'annualLeave', 'contractualHours',
    'weeklyOvertime', 'commuteMinutes', 'commuteCostMonthly', 'daysInOffice',
    'workplaceCostMonthly', 'bonusValue', 'bonusIsPercent', 'pensionEmployer',
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
