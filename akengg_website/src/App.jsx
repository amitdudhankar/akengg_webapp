import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes.jsx";
import Header from "./Components/Header.jsx";
import Footer from "./Components/Footer.jsx";
import Popup from "./Components/Popup/Popup.jsx";
import ScrollToTop from "./Components/ScrollToTop/ScrollToTop.jsx";
import FloatingCtaBar from "./Components/FloatingCtaBar.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import SiteSchema from "./Components/SiteSchema.jsx";
import CookieConsent from "./Components/CookieConsent.jsx";
import { ToastProvider } from "./Components/Toast/ToastProvider.jsx";
import { captureAttribution } from "./utils/attribution";
import { initAnalytics, usePageTracking } from "./utils/analytics";

// How long to wait, once per browser session, before showing the enquiry
// popup for the first time.
const POPUP_DELAY_MS = 45 * 1000;

// Session-scoped: the visitor already closed the popup this session — don't
// show it again until a new tab/session. sessionStorage (not localStorage)
// is exactly "this session" semantics for free.
const POPUP_DISMISSED_KEY = "akengg.popup-dismissed";

// Persisted: the visitor already submitted the popup form recently. Uses a
// timestamp + freshness window rather than a permanent flag, the same
// pattern attribution.js uses for its own TTL check.
const POPUP_SUBMITTED_KEY = "akengg.popup-submitted";
const POPUP_SUBMITTED_TTL_DAYS = 7;
const POPUP_SUBMITTED_TTL_MS = POPUP_SUBMITTED_TTL_DAYS * 24 * 60 * 60 * 1000;

const canUseSessionStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    // Safari in private mode and hardened browsers throw on access alone.
    return false;
  }
};

const canUseLocalStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

function wasPopupDismissedThisSession() {
  if (!canUseSessionStorage()) return false;
  try {
    return window.sessionStorage.getItem(POPUP_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function markPopupDismissedThisSession() {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(POPUP_DISMISSED_KEY, "1");
  } catch {
    // Storage full or blocked — the popup may reappear this session, which
    // is the safe direction.
  }
}

function wasPopupSubmittedRecently() {
  if (!canUseLocalStorage()) return false;
  try {
    const raw = window.localStorage.getItem(POPUP_SUBMITTED_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const submittedAt = parsed?.submittedAt ? new Date(parsed.submittedAt).getTime() : NaN;
    if (!Number.isFinite(submittedAt)) return false;

    const age = Date.now() - submittedAt;
    return age >= 0 && age < POPUP_SUBMITTED_TTL_MS;
  } catch {
    // Corrupt or hand-edited value — treat as not submitted.
    return false;
  }
}

function markPopupSubmitted() {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(
      POPUP_SUBMITTED_KEY,
      JSON.stringify({ submittedAt: new Date().toISOString() })
    );
  } catch {
    // Storage full or blocked — the popup may reappear sooner than ideal,
    // which is the safe direction.
  }
}

// Tracks virtual page views on every route change. Rendered inside <Router>
// rather than called from App's own body: App's function body executes
// *outside* the Router element it returns (App is Router's ancestor, not a
// descendant), and usePageTracking depends on useLocation, which only works
// inside a Router's render tree.
function PageTracker() {
  usePageTracking();
  return null;
}

function App() {
  const [popupVisible, setPopupVisible] = useState(false);

  // First-touch attribution and analytics init — as early as possible in
  // the component (first effect, first thing it does) so nothing has a
  // chance to strip query params (utm_*, etc.) out of the URL first.
  useEffect(() => {
    captureAttribution();
    initAnalytics();
  }, []);

  // One-time delayed popup, shown at most once per browser session.
  useEffect(() => {
    if (window.location.pathname === "/request-quote") return undefined;
    if (wasPopupDismissedThisSession() || wasPopupSubmittedRecently()) return undefined;

    const timer = setTimeout(() => {
      if (window.location.pathname === "/request-quote") return;
      if (wasPopupDismissedThisSession() || wasPopupSubmittedRecently()) return;
      setPopupVisible(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleClosePopup = () => {
    markPopupDismissedThisSession();
    setPopupVisible(false);
  };

  const handlePopupSubmitSuccess = () => {
    markPopupSubmitted();
  };

  return (
    <SettingsProvider>
      <ToastProvider>
        <SiteSchema />
        <Router>
          <ScrollToTop />
          <PageTracker />
          <Popup
            visible={popupVisible}
            onClose={handleClosePopup}
            onSubmitSuccess={handlePopupSubmitSuccess}
          />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <Footer />
          </div>
          <FloatingCtaBar />
          <CookieConsent />
        </Router>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
