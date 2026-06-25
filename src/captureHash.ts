if (typeof window !== 'undefined' && window.location.hash.includes('provider_token=')) {
  try {
    const hashStr = window.location.hash.substring(1);
    const params = new URLSearchParams(hashStr);
    const pt = params.get('provider_token');
    if (pt) {
      localStorage.setItem('app_google_token', pt);
      localStorage.setItem('app_google_token_expiry', (Date.now() + 3500 * 1000).toString());
    }
  } catch(e) {}
}
