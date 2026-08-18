import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes.jsx";
import Header from "./Components/Header.jsx";
import Footer from "./Components/Footer.jsx";
import Popup from "./Components/Popup/Popup.jsx";
import ScrollToTop from "./Components/ScrollToTop/ScrollToTop.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import SiteSchema from "./Components/SiteSchema.jsx";
import CookieConsent from "./Components/CookieConsent.jsx";
import { ToastProvider } from "./Components/Toast/ToastProvider.jsx";

function App() {
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    // Function to show popup
    const showPopup = () => setPopupVisible(true);

    // Show initially after 5 minutes, then every 5 minutes
    const interval = setInterval(showPopup, 5 * 60 * 1000); // 5 mins in milliseconds

    // Optionally, show once after initial delay
    // setTimeout(showPopup, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Function to close popup
  const handleClosePopup = () => setPopupVisible(false);

  return (
    <SettingsProvider>
      <ToastProvider>
        <SiteSchema />
        <Router>
          <ScrollToTop />
          <Popup visible={popupVisible} onClose={handleClosePopup} />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <Footer />
          </div>
          <CookieConsent />
        </Router>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
