import { useState } from 'react';

function domainFromInput(input) {
  if (!input) return null;
  let cleaned = input.trim().toLowerCase();
  // If it looks like a URL, extract domain
  cleaned = cleaned.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  // If it has a dot, treat as domain
  if (cleaned.includes('.')) return cleaned;
  return null;
}

function domainGuessFromName(company) {
  if (!company) return null;
  // Simple heuristic: strip common suffixes and try .com
  const cleaned = company
    .toLowerCase()
    .replace(/\s+(ltd|limited|plc|inc|corp|llc|group|uk|co)\s*\.?$/i, '')
    .replace(/[^a-z0-9]/g, '');
  if (cleaned.length < 2) return null;
  return cleaned + '.com';
}

export default function CompanyLogo({ company, companyWebsite }) {
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  const domain = domainFromInput(companyWebsite) || domainGuessFromName(company);

  if (!domain || failed) return null;

  const src = `https://logo.clearbit.com/${domain}`;

  // Reset failed state if domain changes
  if (src !== currentSrc) {
    setCurrentSrc(src);
    setFailed(false);
  }

  if (failed) return null;

  return (
    <img
      className="company-logo"
      src={src}
      alt=""
      width={28}
      height={28}
      onError={() => setFailed(true)}
    />
  );
}
