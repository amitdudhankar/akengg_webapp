import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { getTestimonials } from "../api/api";

// Testimonials
const FALLBACK_TESTIMONIALS = [
  {
    text: `"A K Engineering delivered our boiler system on time and within budget. Their technical expertise and professional approach made all the difference."`,
    author: "Rajesh Kumar",
    company: "Pharma Industries Ltd",
  },
  {
    text: `"Their customer support is outstanding. The team was always available to address our concerns, and we couldn’t be happier with the results."`,
    author: "Sneha Patel",
    company: "EcoTech Pvt Ltd",
  },
  {
    text: `"Working with A K Engineering was a smooth and efficient experience. We would highly recommend their services to anyone in the industry."`,
    author: "Arun Mishra",
    company: "Mishra Steel Works",
  },
];

export default function TestimonialSection() {
  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState("right");
  const testimonialRef = useRef();

  useEffect(() => {
    getTestimonials()
      .then((d) => {
        if (Array.isArray(d) && d.length)
          setTestimonials(
            d.map((t) => ({
              text: t?.content || "",
              author: t?.client_name || "",
              company: t?.company || "",
            })),
          );
      })
      .catch(() => {});
  }, []);

  const animateSlide = () => {
    const element = testimonialRef.current;

    const xFrom = direction === "right" ? 200 : -200;
    gsap.fromTo(
      element,
      { opacity: 0, x: xFrom },
      { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" },
    );
  };

  useEffect(() => {
    animateSlide();
  }, [current]);

  const handlePrev = () => {
    setDirection("left");
    setCurrent((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection("right");
    setCurrent((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-[#F4F4F4] py-20 px-4">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Subtitle */}
        <p className="text-[18px] sm:text-[20px] text-[#F4C542] font-medium mb-2">
          Our Clients Trust Us
        </p>

        {/* Heading */}
        <h2 className="text-[28px] sm:text-[34px] md:text-[42px] font-bold leading-[40px] sm:leading-[48px] md:leading-[60px] text-[#1c1f26] max-w-3xl">
          <span className="underline underline-offset-[4px]">
            Real Stories, Real Results
          </span>{" "}
          - Hear from Our{" "}
          <span className="text-[#F4C542]">Satisfied Clients</span>
        </h2>

        {/* Testimonial Card */}
        <div
          ref={testimonialRef}
          className="w-full max-w-3xl bg-white border border-gray-200 shadow-md p-6 mt-10 relative text-left"
        >
          <p className="text-[#555] text-sm sm:text-[15px] leading-relaxed mb-12">
            {testimonials[current].text}
          </p>

          <div className="absolute bottom-4 left-6">
            <p className="text-[#1c1f26] font-semibold text-sm">
              {testimonials[current].author}
            </p>
            <p className="text-gray-500 text-xs">
              {testimonials[current].company}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handlePrev}
            className="w-10 h-10 flex items-center justify-center text-black bg-[#F4C542] shadow-md hover:bg-[#e0b837] transition"
          >
            <ArrowLeft size={18} />
          </button>

          <button
            onClick={handleNext}
            className="w-10 h-10 flex items-center justify-center text-black bg-[#F4C542] shadow-md hover:bg-[#e0b837] transition"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
