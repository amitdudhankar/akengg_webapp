import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import AboutUs from "./Pages/AboutUs";
import Contact from "./Pages/Contact";
import Projects from "./Pages/Projects";
import ProjectCaseStudy from "./Pages/ProjectCaseStudy";
import Industries from "./Pages/Industries";
import IndustryPage from "./Pages/IndustryPage";
import Services from "./Pages/Services";
import ServicePage from "./Pages/ServicePage";
import { SERVICE_PAGES } from "./content/services";
import RequestQuote from "./Pages/RequestQuote/RequestQuote";
import BlogListing from "./Pages/BlogListing";
import BlogDetail from "./Pages/BlogDetail";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import Terms from "./Pages/Terms";
import Faq from "./Pages/Faq";
import NotFound from "./Pages/NotFound";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/services" element={<Services />} />
      {/* Listing first, then the case-study child route -- react-router 7 ranks
          the static segment above the dynamic one, so /projects is never
          shadowed by /projects/:slug. */}
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:slug" element={<ProjectCaseStudy />} />
      <Route path="/industries" element={<Industries />} />
      <Route path="/industries/:slug" element={<IndustryPage />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/request-quote" element={<RequestQuote />} />
      {SERVICE_PAGES.map((page) => (
        <Route key={page.slug} path={`/${page.slug}`} element={<ServicePage page={page} />} />
      ))}
      <Route path="/blogs" element={<BlogListing />} />
      <Route path="/blogs/:slug" element={<BlogDetail />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
