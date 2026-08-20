import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { hasConsent, onConsentChange } from "./cookieConsent";

// GA4 wrapper, gated on cookie consent (see ./cookieConsent).
//
// - The gtag script is only ever loaded after the "analytics" consent
//   category is granted — never on page load, never speculatively.
// - Events fired before that (e.g. an early page view) are queued in memory
//   only — never written to localStorage/sessionStorage, never sent over the
//   network — capped at MAX_QUEUE_SIZE so a visitor who never decides can't
//   grow it unbounded. The queue is replayed through gtag the moment consent
//   is granted, and dropped entirely (never sent) the moment consent is
//   denied or reset.
// - If VITE_GA4_ID is not set (e.g. local development), every export in this
//   module is a complete no-op: no window/document access, no network
//   request, no throw.
const MEASUREMENT_ID = import.meta.env.VITE_GA4_ID;

const MAX_QUEUE_SIZE = 20;

let gtagLoaded = false;
let eventQueue = [];

/**
 * Injects the gtag.js loader and initializes window.gtag/dataLayer, then
 * flushes any queued events. Idempotent: safe to call repeatedly.
 */
function loadGtag() {
  if (gtagLoaded || !MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    // This is an SPA — page views are tracked manually via trackPageView,
    // not by gtag's own (full-reload-oriented) auto page_view.
    send_page_view: false,
    anonymize_ip: true,
  });

  const alreadyInjected = Boolean(
    document.querySelector('script[src*="googletagmanager.com/gtag/js"]')
  );

  if (!alreadyInjected) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  gtagLoaded = true;

  eventQueue.forEach(({ name, params }) => {
    window.gtag("event", name, params);
  });
  eventQueue = [];
}

/**
 * Call once on app mount. Loads gtag immediately if consent is already
 * granted, and subscribes to future consent changes: granted loads gtag,
 * anything else (declined or reset) drops the pending queue without sending.
 */
export function initAnalytics() {
  if (!MEASUREMENT_ID) return;

  if (hasConsent("analytics")) {
    loadGtag();
  }

  onConsentChange((state) => {
    if (state && state.analytics) {
      loadGtag();
    } else {
      eventQueue = [];
    }
  });
}

/**
 * Track a GA4 event. Sends immediately if gtag is loaded; loads gtag and
 * sends immediately if consent is already granted; otherwise queues it
 * in memory (dropped silently once the queue is full) for later replay.
 * @param {string} name
 * @param {Record<string, unknown>} params
 */
export function trackEvent(name, params = {}) {
  if (!MEASUREMENT_ID) return;

  if (gtagLoaded) {
    window.gtag("event", name, params);
    return;
  }

  if (hasConsent("analytics")) {
    loadGtag();
    window.gtag("event", name, params);
    return;
  }

  if (eventQueue.length < MAX_QUEUE_SIZE) {
    eventQueue.push({ name, params });
  }
  // Queue full: drop silently rather than growing unbounded.
}

/** Track a virtual page view (this is an SPA, so route changes don't reload). */
export function trackPageView(path, title) {
  trackEvent("page_view", { page_path: path, page_title: title });
}

/** Drop into any routed component to auto-track page views on navigation. */
export function usePageTracking() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!MEASUREMENT_ID) return;
    trackPageView(pathname, document.title);
  }, [pathname]);
}
