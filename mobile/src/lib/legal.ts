import * as WebBrowser from 'expo-web-browser';

import { SITE_URL } from '@/lib/site';

// Hosted on the project's GitHub Pages site so app stores can link to them too.
export const PRIVACY_URL = `${SITE_URL}/privacy.html`;
export const TERMS_URL = `${SITE_URL}/terms.html`;

export function openLegalPage(url: string) {
  return WebBrowser.openBrowserAsync(url);
}
