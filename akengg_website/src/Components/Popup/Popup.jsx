import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { submitContact } from "../../api/api";

const Popup = ({ visible, onClose }) => {
  const popupRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitContact({
        name: formData.name,
        number: String(formData.phone).replace(/\D/g, ""),
        email: formData.email,
        message: formData.message,
        service: formData.service,
        source: "popup",
      });
      alert("Thank you! We'll be in touch soon.");
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (visible) {
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, scale: 0.8, y: -50, boxShadow: "0 0 0 rgba(0,0,0,0)" },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.2, // Increased from 0.6 to 1.2
          ease: "power3.out",
          boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
        },
      );
      gsap.fromTo(
        popupRef.current.querySelectorAll(".popup-child"),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8, // Increased from 0.5 to 0.8
          ease: "power2.out",
          stagger: 0.18, // Slightly increased for more spread
          delay: 0.3, // Increased delay so children start a bit after popup opens
        },
      );
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 px-4 sm:px-6">
      <div
        ref={popupRef}
        style={{
          opacity: 0,
          transform: "scale(0.8) translateY(-50px)",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        }}
        className="bg-white shadow-xl max-w-3xl w-full p-6 sm:p-8 relative"
      >
        {/* Close button */}
        <button
          className="absolute top-3 right-3 sm:top-4 sm:right-4 hover:opacity-80 transition-opacity"
          onClick={onClose}
        >
          <X className="w-7 h-7 sm:w-9 sm:h-9 text-gray-500" />
        </button>

        {/* Heading */}
        <h2 className="text-center font-light text-[26px] sm:text-[40px] leading-[32px] sm:leading-[45px] text-[#1c1f26]">
          To Unleash The Possibilities - <br />
          <span className="font-bold text-[#F4C542]">Connect Now</span>
        </h2>

        {/* Form */}
        <form className="mt-6 sm:mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name *"
              className="border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
              required
            />

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email *"
              className="border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
              required
            />

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone number *"
              className="border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
              required
            />

            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
              required
            >
              <option value="">Select Service</option>
              <option value="boiler">Boiler Systems</option>
              <option value="fabrication">Industrial Fabrication</option>
              <option value="pollution">Pollution Control</option>
              <option value="water">Water Treatment</option>
            </select>
          </div>

          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Message *"
            rows="3"
            className="w-full border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#F4C542]"
            required
          ></textarea>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-[#1c1f26] text-[#F4C542] py-3 text-sm sm:text-base font-medium hover:bg-[#2a2d33] transition"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export default Popup;
