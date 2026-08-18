// Cookie-consent state, kept out of the component so non-React code (an
// analytics loader, say) can ask about it too.
//
// The site currently sets NO tracking cookies at all — there is no Google
// Analytics, no tag manager, no pixel. This module exists so that when one is
// added it can be gated properly instead of firing on page load:
//
//   import { hasConsent } from "./utils/cookieConsent";
//   if (hasConsent("analytics")) loadAnalytics();
//   onConsentChange((state) => { if (state.analytics) loadAnalytics(); });
//
// Consent is stored in localStorage rather than a cookie on purpose: writing a
// cookie to record "no cookies please" is the one thing a consent tool should
// not do. Strictly necessary storage like this needs no consent either way.
const STORAGE_KEY = "akengg.cookie-consent";

// Bump when the categories change, so a stored choice from an older banner is
// treated as unanswered and the visitor is asked again.
const VERSION = 1;

const DENIED = { analytics: false };
const GRANTED = { analytics: true };

const listeners = new Set();

const canUseStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    // Safari in private mode and hardened browsers throw on access alone.
    return false;
  }
};

/**
 * The stored decision, or null if the visitor has not answered yet.
 * @returns {{analytics: boolean} | null}
 */
export function getConsent() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;

    return { analytics: Boolean(parsed.analytics) };
  } catch {
    // Corrupt or hand-edited value — treat as unanswered.
    return null;
  }
}

/** Has the visitor granted a given category? Defaults to false until they do. */
export function hasConsent(category = "analytics") {
  const consent = getConsent();
  return Boolean(consent && consent[category]);
}

/** Record a decision and notify listeners. */
export function setConsent(granted) {
  const state = granted ? GRANTED : DENIED;

  if (canUseStorage()) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, version: VERSION, decidedAt: new Date().toISOString() })
      );
    } catch {
      // Storage full or blocked. The banner still closes for this session; the
      // visitor is simply asked again next time, which is the safe direction.
    }
  }

  listeners.forEach((listener) => listener(state));
  return state;
}

/**
 * Subscribe to consent changes. Returns an unsubscribe function.
 * @param {(state: {analytics: boolean}) => void} listener
 */
export function onConsentChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Clear the stored decision so the banner appears again (used by the footer link). */
export function resetConsent() {
  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing useful to do */
    }
  }

  listeners.forEach((listener) => listener(null));
}
