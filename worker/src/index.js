const ALLOWED_ORIGINS = [
  'https://stephenbeale.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

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

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function rateLimitKey(ip) {
  const today = new Date().toISOString().slice(0, 10);
  return `rate:${ip}:${today}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o));

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin || ALLOWED_ORIGINS[0]),
      });
    }

    if (!allowedOrigin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const headers = corsHeaders(allowedOrigin);

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
    }

    const ip = getClientIP(request);
    const dailyLimit = parseInt(env.DAILY_LIMIT || '20', 10);

    // Rate limiting via KV
    const key = rateLimitKey(ip);
    const current = parseInt(await env.RATE_LIMIT.get(key) || '0', 10);

    if (current >= dailyLimit) {
      return Response.json(
        { error: `Daily limit reached (${dailyLimit} imports per day). Try again tomorrow.` },
        { status: 429, headers }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers });
    }

    const { text } = body;
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return Response.json({ error: 'Please provide job listing text (at least 20 characters).' }, { status: 400, headers });
    }

    // Cap input length to prevent abuse
    const trimmedText = text.slice(0, 8000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: trimmedText },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Anthropic API error:', response.status, err);
        return Response.json(
          { error: 'AI service temporarily unavailable. Please try again.' },
          { status: 502, headers }
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text?.trim();

      if (!content) {
        return Response.json({ error: 'Empty response from AI' }, { status: 502, headers });
      }

      // Strip markdown code fences if present
      const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return Response.json({ error: 'Failed to parse AI response' }, { status: 502, headers });
      }

      // Increment rate limit counter (expire at end of day)
      await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 86400 });

      return Response.json(parsed, { headers });
    } catch (err) {
      console.error('Worker error:', err);
      return Response.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500, headers }
      );
    }
  },
};
