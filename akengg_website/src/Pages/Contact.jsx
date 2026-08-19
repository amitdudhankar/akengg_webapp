import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { submitContact } from "../api/api";
import { useSettings } from "../context/SettingsContext";
import Seo from "../Components/Seo";
import { useToast } from "../Components/Toast/ToastProvider";

// Used until an admin sets map_embed_url in Site Settings — same pattern as
// every other settings-backed value on the site.
const FALLBACK_MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3784.8285182863474!2d73.89896461378555!3d18.446093483849268!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2ebae42480ce1%3A0xb56bf27a244c9cd4!2sA%20K%20Engineering!5e0!3m2!1sen!2sin!4v1762797596159!5m2!1sen!2sin";

const Contact = () => {
  const { settings } = useSettings();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitContact({
        name: formData.name,
        number: String(formData.phone).replace(/\D/g, ""),
        email: formData.email,
        message: formData.message,
        source: "contact_page",
      });
      toast.success("We have received your message and will get back to you soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="">
      <Seo
        title="Contact Us"
        description="Get in touch with A K Engineering for boiler, fabrication, water treatment and pollution-control enquiries and quotations."
        path="/contact"
      />
      {/* Hero Section */}
      <section className="relative h-[200px] md:h-[300px] flex items-center text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/AboutBanner.jpg')" }} // replace with your image
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">
            Contact Us
          </h1>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 bg-[#e9e9e9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2">
          {/* LEFT SIDE */}
          <div className="bg-[#e9e9e9] p-8 md:p-12">
            <h2 className="text-[26px] sm:text-[32px] font-medium text-[#1c1f26] mb-6">
              Get in Touch with Our Experts
            </h2>

            <p className="text-[#1c1f26] text-[15px] leading-relaxed mb-6">
              We’re here to answer any questions you have about our industrial
              engineering solutions and how they can benefit your business.
            </p>

            <p className="text-[#1c1f26] text-[15px] leading-relaxed mb-6">
              Whether you need boiler systems, fabrication services, or
              pollution control solutions, our team at A K Engineering is ready
              to assist you.
            </p>

            {/* Contact Info */}
            <div className="text-[#1c1f26] text-[14px] space-y-4">
              <p>
                <strong>Phone:</strong> {settings?.company_phone || "+91 9822845408"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                <a
                  href={`mailto:${settings?.company_email || "akengineering73@gmail.com"}`}
                  className="underline"
                >
                  {settings?.company_email || "akengineering73@gmail.com"}
                </a>
              </p>

              <div>
                <strong>Address:</strong>
                <p className="mt-1">
                  {settings?.company_address || (
                    <>
                      A K Engineering, Sai Shraddha Bungalow Society,
                      <br />
                      near KUMAR PALMCREST, Anthon Nagar,
                      <br />
                      Pisoli, Pune, Maharashtra 411060
                    </>
                  )}
                </p>
              </div>

              <div>
                <strong>Business Hours:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {settings?.business_hours ? (
                    <li>{settings.business_hours}</li>
                  ) : (
                    <>
                      <li>Monday - Saturday: 9 AM - 6 PM</li>
                      <li>Sunday: Closed</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE (FORM) */}
          <div className="bg-[#F4C542] p-8 md:p-12">
            <h2 className="text-[22px] sm:text-[26px] font-semibold text-[#1c1f26] mb-6 uppercase">
              Get A Quote
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-sm text-[#1c1f26]">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full mt-1 px-4 py-3 bg-gray-200 outline-none"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-[#1c1f26]">
                  Telephone number*
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Your phone number"
                  className="w-full mt-1 px-4 py-3 bg-gray-200 outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-[#1c1f26]">Your email*</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your email address"
                  className="w-full mt-1 px-4 py-3 bg-gray-200 outline-none"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-sm text-[#1c1f26]">Message*</label>
                <textarea
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Enter your message"
                  className="w-full mt-1 px-4 py-3 bg-gray-200 outline-none resize-none"
                  required
                ></textarea>
              </div>

              {/* Button */}
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  className="bg-black text-white px-10 py-3 text-sm font-medium hover:bg-[#1c1f26] transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[#1c1f26] mb-4">
              Visit Our Facility
            </h2>
            <p className="text-[16px] text-gray-600 max-w-2xl mx-auto">
              Experience our advanced manufacturing capabilities and engineering
              expertise firsthand. Our facility is equipped with modern
              infrastructure to deliver reliable and high-performance industrial
              solutions.
            </p>
          </div>

          {/* Google Map Embed */}
          <div className="relative bg-[#1c1f26] p-4 md:p-6">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[#F4C542]" />

            {/* Map Container */}
            <div className="overflow-hidden border border-gray-700">
              <iframe
                src={settings?.map_embed_url || FALLBACK_MAP_EMBED_URL}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="A K Engineering Location"
                className="w-full"
              ></iframe>
            </div>

            {/* Bottom Info Bar */}
            <div className="bg-[#F4C542] text-[#1c1f26] px-4 py-3 text-sm font-medium flex justify-between items-center">
              <span>A K Engineering • Pune, Maharashtra</span>

              <a
                href="https://maps.google.com/?q=A+K+Engineering+Pune"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
