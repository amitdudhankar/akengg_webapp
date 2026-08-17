import Seo from "../Components/Seo";
import JsonLd from "../Components/JsonLd";
import { SITE } from "../config/site";

// Starter engineering-relevant FAQs — edit freely. The FAQPage JSON-LD below is
// generated from this same array so the structured data always matches the
// visible Q&A (a Google requirement for FAQ rich results).
const FAQS = [
  {
    q: "What industrial services does A K Engineering provide?",
    a: "We design and execute turnkey IBR & non-IBR boiler systems, industrial fabrication, IBR/non-IBR piping, water treatment plants and pollution-control solutions for a range of industries.",
  },
  {
    q: "Do you handle IBR-compliant boiler and piping work?",
    a: "Yes. We deliver IBR and non-IBR boiler systems and piping with full statutory compliance and documentation.",
  },
  {
    q: "Which industries do you serve?",
    a: "We have delivered projects across pharmaceutical, chemical, food, textile, power generation and automotive sectors.",
  },
  {
    q: "Do you offer turnkey project execution?",
    a: "Yes — from design and fabrication through installation and commissioning, we can take full turnkey responsibility for your project.",
  },
  {
    q: "How can I request a quotation?",
    a: "Use the Contact page or the enquiry form on the site with your requirement, and our team will get back to you with a tailored quotation.",
  },
];

const Faq = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="bg-white">
      <Seo
        title="Frequently Asked Questions"
        description={`Answers to common questions about ${SITE.name}'s boiler systems, fabrication, water treatment and pollution-control services.`}
        path="/faq"
      />
      <JsonLd data={faqSchema} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#234B97] mb-10">
          Frequently Asked Questions
        </h1>

        <div className="divide-y divide-gray-200">
          {FAQS.map((item, idx) => (
            <div key={idx} className="py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {item.q}
              </h2>
              <p className="text-gray-700 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Faq;
