// import React from "react";
// import { Link } from "react-router-dom";

// const SuccessProjects = () => {
//   return (
//     <div className="flex justify-center items-center my-10">
//       <div className="relative w-full max-w-7xl h-[700px] p-6">
//         {/* Background image */}
//         <div
//           className="absolute inset-0 rounded-xl bg-cover bg-center"
//           style={{ backgroundImage: "url('/assets/Success Projects.jpg')" }}
//         ></div>

//         {/* Blue overlay with transparent background only */}
//         <div className="absolute bottom-0 right-0 z-10 h-[500px] w-[800px] bg-[#0068A8]/80 rounded-lg flex items-center justify-start text-white text-left px-10">
//           <div className="opacity-100">
//             {/* One-line heading with mixed font weights */}
//             <h2 className="text-[80px] uppercase">
//               <span className="font-light">Successful </span>
//               <span className="font-bold">Projects</span>
//             </h2>

//             {/* Button below */}
//             <Link to="/projects">
//               <div className="mt-6 flex items-center justify-between w-[311px] h-[84px] flex-shrink-0 rounded-[10px] bg-[#F7F9FD] shadow-[0px_6px_10.6px_rgba(0,0,0,0.25)] px-4 cursor-pointer">
//                 <button className="text-lg font-medium text-[#0055D2]">
//                   View details
//                 </button>
//                 <img src="/assets/navigate_next.svg" alt="Next" />
//               </div>
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SuccessProjects;

import React from "react";
import { Link } from "react-router-dom";

const SuccessProjects = () => {
  return (
    <div className="flex justify-center items-center my-10 px-4 md:px-6">
      <div className="relative w-full max-w-7xl h-[700px] p-4 sm:p-6">
        {/* Background image */}
        <div
          className="absolute inset-0 rounded-xl bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/Success Projects.jpg')" }}
        ></div>

        {/* Blue overlay with text */}
        <div className="absolute bottom-0 right-0 z-10 h-[500px] w-full sm:w-[600px] lg:w-[800px] bg-[#0068A8]/80 rounded-lg flex items-center justify-start text-white px-6 sm:px-10">
          <div className="opacity-100">
            {/* One-line heading with mixed font weights */}
            <h2 className="text-[36px] sm:text-[48px] md:text-[60px] lg:text-[80px] uppercase leading-none">
              <span className="font-light">Successful </span>
              <span className="font-bold">Projects</span>
            </h2>

            {/* Button below */}
            <Link to="/projects">
              <div className="mt-6 flex items-center justify-between w-full max-w-[311px] h-[64px] sm:h-[74px] md:h-[84px] rounded-[10px] bg-[#F7F9FD] shadow-[0px_6px_10.6px_rgba(0,0,0,0.25)] px-4 cursor-pointer">
                <span className="text-base sm:text-lg font-medium text-[#0055D2]">
                  View details
                </span>
                <img
                  src="/assets/navigate_next.svg"
                  alt="Next"
                  className="w-5 sm:w-6"
                  loading="lazy"
                />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessProjects;
