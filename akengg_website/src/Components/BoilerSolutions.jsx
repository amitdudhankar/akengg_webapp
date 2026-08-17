import React from "react";

const BoilerSolution = () => {
  return (
    <section className="bg-[#e9e9e9] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-start">
        {/* LEFT HEADING */}
        <div>
          <h2 className="text-[32px] sm:text-[42px] md:text-[56px] leading-tight font-medium text-[#1c1f26]">
            Precision-engineered <br />
            boiler systems for <br />
            modern industries
          </h2>
        </div>

        {/* RIGHT CONTENT */}
        <div className="text-[#1c1f26] text-[15px] sm:text-[16px] leading-relaxed space-y-6">
          <p>
            We provide high-performance boiler systems and thermal engineering
            solutions that power modern industries with efficiency and
            reliability.
          </p>

          <p>
            Our solutions include IBR and Non-IBR boilers, thermic fluid
            heaters, and customized heat systems designed for continuous
            operation. With complete in-house capabilities—from fabrication to
            installation—we ensure optimal performance, reduced energy
            consumption, and dependable results across industrial applications.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BoilerSolution;
