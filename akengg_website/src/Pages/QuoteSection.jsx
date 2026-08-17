import React from "react";

export default function QuoteSection() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
        {/* Left Side */}
        <div>
          <p className="text-[#0068a8] font-medium mb-3">
            Brand new app to blow your mind
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            We’ve made a life <br /> that will change you
          </h2>
          <p className="text-gray-500 mb-3">
            We are here to listen from you deliver excellence
          </p>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim. Lorem ipsum dolor sit amet, consectetur adipiscing elit,
            sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>

          <button className="bg-[#0068a8] hover:bg-yellow-600 text-white font-semibold py-3 px-8 transition-all">
            Get Started Now
          </button>
        </div>

        {/* Right Side - Form */}
        <div className="relative">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center rounded-md"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=900&q=80')",
            }}
          ></div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gray-700 bg-opacity-60 rounded-md"></div>

          {/* Form content */}
          <div className="relative p-8 text-white rounded-md">
            <h3 className="text-2xl font-bold mb-6">Request a Quote</h3>
            <form className="space-y-4">
              <select
                className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Service
                </option>
                <option>Web Development</option>
                <option>Mobile App</option>
                <option>SEO Optimization</option>
              </select>

              <input
                type="text"
                placeholder="Name"
                className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone Number"
                className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none"
              />
              <textarea
                placeholder="Message"
                rows="3"
                className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none resize-none"
              ></textarea>

              <button
                type="submit"
                className="w-full bg-[#0068a8] hover:bg-yellow-600 text-black font-semibold py-3 transition-all"
              >
                Request Free Quote
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
