import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Seo from "../../Components/Seo";
import QuoteForm from "./QuoteForm";
import QuoteSuccess from "./QuoteSuccess";

// Route page for /request-quote. Owns exactly one piece of state: the
// created lead (null until the form has been successfully submitted, then
// an object describing it) — everything else about the form lives in
// QuoteForm itself.
const RequestQuote = () => {
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get("product") || "";

  const [lead, setLead] = useState(null);

  const handleSuccess = (leadData) => {
    setLead(leadData);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="">
      <Seo
        title="Request a Technical Quote"
        description="Describe your industrial boiler, piping, fabrication or pollution-control requirement and get a technical quotation from A K Engineering."
        path="/request-quote"
      />

      {/* Hero Section */}
      <section className="relative h-[200px] md:h-[300px] flex items-center text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/AboutBanner.jpg')" }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">
            Request a Technical Quote
          </h1>
        </div>
      </section>

      <div className="bg-[#F4F4F4]">
        {lead ? (
          <QuoteSuccess lead={lead} />
        ) : (
          <QuoteForm initialProduct={initialProduct} onSuccess={handleSuccess} />
        )}
      </div>
    </div>
  );
};

export default RequestQuote;
