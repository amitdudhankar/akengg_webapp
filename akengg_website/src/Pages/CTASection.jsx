import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 bg-[#f5f5f5]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="flex flex-col lg:flex-row items-stretch">

      {/* LEFT */}
      <div className="bg-[#F4C542] flex-1 p-8 md:p-12 flex flex-col justify-center">
        <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#1c1f26] mb-4">
          Power Your Industry with Reliable Engineering Solutions
        </h2>

        <p className="text-[#1c1f26] text-[15px] leading-relaxed max-w-md">
          Get in touch with A K Engineering for high-performance boiler
          systems, industrial fabrication, and pollution control solutions
          designed for efficiency, safety, and long-term reliability.
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex-1">
        <img
          src="/assets/AboutCTA.jpg" // replace with your image
          alt="Industrial Solutions"
          className="w-full h-full object-cover"
        />
      </div>

    </div>

    {/* ✅ CENTER BUTTON BELOW */}
    <div className="flex justify-center mt-10">
      <Link
        to="/contact"
        className="bg-black text-white px-10 py-4 text-sm font-medium shadow-lg hover:bg-[#1c1f26] transition"
      >
        Get A Quote
      </Link>
    </div>

  </div>
</section>
  );
};

export default CTASection;