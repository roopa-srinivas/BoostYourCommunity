import { createContext, use, useState } from 'react';

// Bump the version to show a reworked intro to everyone again.
const STORAGE_KEY = 'intro-seen-v1';

type IntroState = { seen: boolean; markSeen: () => void };

const IntroContext = createContext<IntroState>({ seen: true, markSeen: () => {} });

function readSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'yes';
  } catch {
    // Storage unavailable: don't trap people in the intro.
    return true;
  }
}

/** Whether this device has seen the first-time intro (localStorage, like drafts). */
export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState(readSeen);

  function markSeen() {
    setSeen(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'yes');
    } catch {
      // Shown again next time; not worth bothering anyone about.
    }
  }

  return <IntroContext value={{ seen, markSeen }}>{children}</IntroContext>;
}

export function useIntro() {
  return use(IntroContext);
}
