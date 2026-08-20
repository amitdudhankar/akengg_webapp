// First-touch marketing attribution, kept out of the component so it can be
// captured once near the app root and read later by whichever component
// builds a lead submission (the quote form, primarily).
//
// This capture is consent-independent: it is first-party data that is never
// transmitted anywhere by this module itself — the stored record only ever
// leaves the browser inside a visitor's own quote-form submission, exactly
// like the rest of that form's data. That makes it the same kind of
// strictly-necessary storage as the cookie-consent key (see
// cookieConsent.js), so it is captured unconditionally, no consent gate
// required.
//
//   import { captureAttribution, getAttribution } from "./utils/attribution";
//   useEffect(() => { captureAttribution(); }, []); // once, near the app root
//   const attribution = getAttribution(); // when building a quote submission
const STORAGE_KEY = "akengg.attribution";

// Bump when the record shape changes, so a stored value from an older
// version is treated as absent and a fresh first-touch record is captured.
const VERSION = 1;

// First-touch attribution should survive a realistic consideration window
// but not persist forever.
const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const MAX_FIELD_LENGTH = 500;

const SEARCH_ENGINES = ["google", "bing", "duckduckgo", "yahoo"];
const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "t.co",
  "youtube",
  "wa.me",
  "whatsapp",
];

const canUseStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    // Safari in private mode and hardened browsers throw on access alone.
    return false;
  }
};

const truncate = (value) => (value ? value.slice(0, MAX_FIELD_LENGTH) : value);

/**
 * Derive {source, medium} for the current page: UTM params win when present,
 * otherwise the referrer's hostname is classified as search / social /
 * direct / referral. Shared by captureAttribution (building the record to
 * persist) and getAttribution's fallback (recomputing on the fly when
 * nothing valid is stored), so the classification rules live in one place.
 */
function deriveSourceMedium(params) {
  const utmSource = params.get("utm_source") || undefined;
  const utmMedium = params.get("utm_medium") || undefined;

  if (utmSource) {
    // Presence of utm_source with no utm_medium looks like paid traffic that
    // forgot the medium — "cpc" is a reasonable default rather than blank.
    return { source: utmSource, medium: utmMedium || "cpc" };
  }

  let referrerHost = "";
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
  } catch {
    // Malformed or inaccessible referrer — treat as no referrer.
    referrerHost = "";
  }

  const searchEngine = SEARCH_ENGINES.find((engine) => referrerHost.includes(engine));
  if (searchEngine) {
    return { source: searchEngine, medium: "organic" };
  }

  const socialPlatform = SOCIAL_PLATFORMS.find((platform) => referrerHost.includes(platform));
  if (socialPlatform) {
    return { source: socialPlatform, medium: "social" };
  }

  if (!referrerHost || referrerHost === window.location.hostname.toLowerCase()) {
    return { source: "direct", medium: "none" };
  }

  return { source: referrerHost, medium: "referral" };
}

/** Build a fresh attribution object from the current page. */
function buildAttributionRecord() {
  const params = new URLSearchParams(window.location.search);
  const { source, medium } = deriveSourceMedium(params);

  return {
    source,
    medium,
    campaign: params.get("utm_campaign") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_content: params.get("utm_content") || undefined,
    landing_page: truncate(window.location.pathname + window.location.search),
    referrer: truncate(document.referrer || ""),
  };
}

/**
 * Capture first-touch attribution. Intended to run once on app mount, but
 * safe to call on every mount: if a valid, unexpired record is already
 * stored it is left untouched — first-touch attribution must never be
 * clobbered by a later visit.
 */
export function captureAttribution() {
  if (!canUseStorage()) return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === VERSION && parsed.first_touch_at) {
        const age = Date.now() - new Date(parsed.first_touch_at).getTime();
        if (Number.isFinite(age) && age >= 0 && age < TTL_MS) {
          return; // Existing first-touch record is still valid — keep it.
        }
      }
    }
  } catch {
    // Corrupt or hand-edited value — fall through and capture a fresh one.
  }

  try {
    const record = {
      ...buildAttributionRecord(),
      first_touch_at: new Date().toISOString(),
      version: VERSION,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked — attribution simply won't be available later.
  }
}

/**
 * Read the stored first-touch attribution for attaching to a lead
 * submission. Falls back to a best-effort attribution of the current page
 * (same derivation rules as captureAttribution) when nothing valid is
 * stored — blocked storage, a version mismatch, or captureAttribution was
 * never called.
 * @returns {{source: string, medium: string, campaign?: string, utm_term?: string, utm_content?: string, landing_page: string, referrer: string}}
 */
export function getAttribution() {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION) {
          return {
            source: parsed.source,
            medium: parsed.medium,
            campaign: parsed.campaign,
            utm_term: parsed.utm_term,
            utm_content: parsed.utm_content,
            landing_page: parsed.landing_page,
            referrer: parsed.referrer,
          };
        }
      }
    } catch {
      // Corrupt or hand-edited value — fall through to a best-effort recompute.
    }
  }

  return buildAttributionRecord();
}
