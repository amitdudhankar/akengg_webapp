import RequestQuoteCta from "./RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

const EnergySection = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
        {/* LEFT IMAGE */}
        <div className="flex justify-center md:justify-start">
          <div className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px] rounded-full overflow-hidden">
            <img
              src="/assets/Boiler & Chimney Solutions.jpg" // replace with your image
              alt="Energy"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div>
          <h3 className="text-[22px] sm:text-[26px] md:text-[30px] font-medium text-[#1c1f26] mb-4">
            Reliable Boiler & Chimney Solutions
          </h3>

          <p className="text-[#1c1f26] text-[15px] leading-relaxed mb-6">
            As industries demand efficient heat generation and safe emission
            control, high-performance boiler systems and industrial chimneys
            play a critical role in maintaining operational efficiency and
            compliance.
          </p>

          <p className="text-[#1c1f26] text-[15px] leading-relaxed mb-8">
            We design and deliver robust IBR and Non-IBR boilers along with
            precision-engineered industrial chimneys that ensure optimal draft,
            reduced emissions, and long-term durability. Our end-to-end
            solutions help industries achieve reliable performance, regulatory
            compliance, and improved energy efficiency.
          </p>

          <RequestQuoteCta
            className="inline-block bg-[#1c1f26] text-[#F4C542] px-8 py-3 text-sm font-medium hover:opacity-90 transition"
            onClick={() =>
              trackEvent("quote_request_started", {
                context: "energy_section",
              })
            }
          >
            Request a Quote
          </RequestQuoteCta>
        </div>
      </div>
    </section>
  );
};

export default EnergySection;
