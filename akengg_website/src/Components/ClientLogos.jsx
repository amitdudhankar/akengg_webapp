// const ClientLogos = () => {
//   const industries = [
//     "Pharmaceutical",
//     "Chemical",
//     "Food & Beverage",
//     "Textiles",
//     "Automotive",
//     "Power Generation"
//   ];

//   return (
//     <section className="py-16 bg-gray-100">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="text-center mb-12">
//           <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
//             Industries We Serve
//           </h2>
//           <p className="text-lg text-gray-600">
//             Customized Industrial Engineering Services across multiple sectors
//           </p>
//         </div>

//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
//           {industries.map((industry, index) => (
//             <div
//               key={index}
//               className="bg-white rounded-lg p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300"
//             >
//               <div className="text-3xl mb-2">🏭</div>
//               <p className="text-sm font-semibold text-gray-700">{industry}</p>
//             </div>
//           ))}
//         </div>

//         <div className="text-center mt-12">
//           <p className="text-lg text-gray-600 mb-6">
//             Ready to discuss your industrial engineering needs?
//           </p>
//           <a
//             href="/contact"
//             className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 inline-block"
//           >
//             Contact Us Today
//           </a>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default ClientLogos;
import React, { useState } from "react";
import { subscribeNewsletter } from "../api/api";
import { useToast } from "./Toast/ToastProvider";

export default function GetStartedSection() {
  const [email, setEmail] = useState("");
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await subscribeNewsletter(email);
      toast.success("You are subscribed. Look out for updates from us.", "Thanks for subscribing");
      setEmail("");
    } catch (err) {
      toast.error(err.message || "Could not subscribe. Please try again.");
    }
  };

  return (
    <div className="w-full bg-white py-16 px-4 md:px-20">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
        {/* LEFT SIDE */}
        <div>
          <h2 className="text-[28px] sm:text-[34px] md:text-[40px] font-medium text-[#1c1f26] mb-6 leading-snug">
            Considering Industrial <br />
            Solutions Upgrade?
          </h2>

          <p className="text-[#1c1f26] text-[15px] leading-relaxed max-w-md">
            We understand that upgrading industrial systems is a big decision.
            Whether you're planning to improve efficiency, reduce emissions, or
            modernize your operations, we’re here to guide you with the right
            engineering solutions.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div>
          <p className="text-[#1c1f26] text-[14px] leading-relaxed mb-6 italic">
            Enter your email below, and we’ll share updates, insights, and
            solutions tailored for your industrial needs.
          </p>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm text-[#1c1f26] mb-2">
              Email address
            </label>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-300 px-4 py-3 outline-none text-sm"
            />
          </div>

          {/* Button */}
          <button onClick={handleSubmit} className="bg-[#1c1f26] text-[#F4C542] px-8 py-3 text-sm font-medium hover:opacity-90 transition">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
