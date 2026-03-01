const STORAGE_KEY = 'jobweigh-jobs';

export function loadJobs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveJobs(jobs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // storage full or unavailable
  }
}
