// import React from "react";

// const BannerThin = () => {
//   return (
//     <div className="px-4 sm:px-6 md:px-10 lg:px-20">
//       <div className="bg-[#0068A8] flex justify-center">
//         <div className="w-full max-w-[1280px] h-[59px] flex items-center px-4 sm:px-6 lg:px-6">
//           <p className="text-[#EAF9EF] text-[13px] sm:text-[14px] font-light leading-[22px] sm:leading-[45px] uppercase tracking-wide flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
//             <span>10+ Years of Industry Experience</span>
//             <span>|</span>
//             <span>24/7 Customer Support</span>
//             <span>|</span>
//             <span>Customizable & Scalable Solutions</span>
//             <span>|</span>
//             <span>Data Security & Compliance Focused</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BannerThin;

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

const BannerThin = () => {
  const bannerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      bannerRef.current,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        delay: 0.3,
      }
    );
  }, []);

  return (
    <div ref={bannerRef} className="px-4 sm:px-6 md:px-10 lg:px-20">
      <div className="bg-[#0068A8] flex justify-center">
        <div className="w-full max-w-[1280px] h-[59px] flex items-center px-4 sm:px-6 lg:px-6">
          <p className="text-[#EAF9EF] text-[13px] sm:text-[14px] font-light leading-[22px] sm:leading-[45px] uppercase tracking-wide flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
            <span>30+ Years of Industry Expertise</span>
            <span>|</span>
            <span>500+ Projects Successfully Delivered</span>
            <span>|</span>
            <span>100+ Industrial Clients Nationwide</span>
            <span>|</span>
            <span>24/7 Operational Support</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BannerThin;
