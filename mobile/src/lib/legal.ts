import * as WebBrowser from 'expo-web-browser';

// Hosted on the project's GitHub Pages site so app stores can link to them too.
const BASE_URL = 'https://roopa-srinivas.github.io/BoostYourCommunity';

export const PRIVACY_URL = `${BASE_URL}/privacy.html`;
export const TERMS_URL = `${BASE_URL}/terms.html`;

export function openLegalPage(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
