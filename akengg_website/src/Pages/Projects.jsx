import { useState, useEffect } from "react";
import { getProjects, getIndustryStats } from "../api/api";
import Seo from "../Components/Seo";

const FALLBACK_PROJECTS = [
    {
      title: "Pharmaceutical Boiler Installation",
      industry: "Pharmaceutical",
      description:
        "Complete IBR boiler system installation for a leading pharmaceutical manufacturing facility",
      features: [
        "IBR Compliance",
        "Steam Generation",
        "Automated Controls",
        "Safety Systems",
      ],
      image: "/assets/Pharmaceutical.jpg",
    },
    {
      title: "Chemical Plant Water Treatment",
      industry: "Chemical",
      description:
        "Comprehensive water treatment plant for chemical processing with advanced filtration systems",
      features: [
        "Reverse Osmosis",
        "Chemical Dosing",
        "Automated Monitoring",
        "Effluent Treatment",
      ],
      image: "/assets/Chemical Water Treat.jpg",
    },
    {
      title: "Food Industry Fabrication",
      industry: "Food & Beverage",
      description:
        "Stainless steel fabrication project including tanks, piping, and structural platforms",
      features: [
        "Food Grade SS",
        "Hygienic Design",
        "CIP Systems",
        "Quality Compliance",
      ],
      image: "/assets/Food Industry Fabrication.jpg",
    },
    {
      title: "Textile Mill Pollution Control",
      industry: "Textiles",
      description:
        "Complete pollution control system with dust collectors and ETP for textile manufacturing",
      features: [
        "Dust Collection",
        "Air Scrubbers",
        "Waste Water Treatment",
        "Environmental Compliance",
      ],
      image: "/assets/Textile Mill Pollution Control.jpg",
    },
    {
      title: "Power Plant Chimney Construction",
      industry: "Power Generation",
      description:
        "Industrial chimney construction and installation for thermal power generation facility",
      features: [
        "High Temperature Resistance",
        "Structural Engineering",
        "Environmental Standards",
        "Safety Compliance",
      ],
      image: "/assets/Power Plant Chimney Construction.jpg",
    },
    {
      title: "Automotive Fabrication Solutions",
      industry: "Automotive",
      description:
        "Custom fabrication solutions for automotive component manufacturing facility",
      features: [
        "Precision Fabrication",
        "Quality Systems",
        "Process Optimization",
        "Lean Manufacturing",
      ],
      image: "/assets/Automotive Fabrication.jpg",
    },
  ];

const FALLBACK_INDUSTRIES = [
  { name: "Pharmaceutical", count: 8, color: "bg-blue-500" },
  { name: "Chemical", count: 12, color: "bg-green-500" },
  { name: "Food & Beverage", count: 6, color: "bg-orange-500" },
  { name: "Textiles", count: 9, color: "bg-purple-500" },
  { name: "Automotive", count: 5, color: "bg-red-500" },
  { name: "Power Generation", count: 4, color: "bg-yellow-500" },
];

const Projects = () => {
  const [projects, setProjects] = useState(FALLBACK_PROJECTS);
  const [industries, setIndustries] = useState(FALLBACK_INDUSTRIES);

  useEffect(() => {
    getProjects()
      .then((d) => {
        if (Array.isArray(d) && d.length) setProjects(d);
      })
      .catch(() => {});

    getIndustryStats()
      .then((d) => {
        if (Array.isArray(d) && d.length)
          setIndustries(
            d.map((row, i) => ({
              ...row,
              color: row?.color || FALLBACK_INDUSTRIES[i]?.color,
            }))
          );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="">
      <Seo
        title="Projects & Case Studies"
        description="Explore A K Engineering's completed projects across pharmaceutical, chemical, food, textile, power and automotive industries."
        path="/projects"
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
            Our Projects
          </h1>
        </div>
      </section>

      {/* Industry Stats */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-4"></div>

            <h2 className="text-[32px] sm:text-[40px] font-semibold text-[#1c1f26] mb-4">
              Industries We Serve
            </h2>

            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
              Delivering reliable engineering solutions tailored for diverse
              industrial sectors.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="group bg-white border border-gray-200 p-6 text-center hover:border-[#F4C542] transition duration-300"
              >
                {/* Count */}
                <div className="text-[28px] font-semibold text-[#1c1f26] mb-2 group-hover:text-[#F4C542] transition">
                  {industry.count}+
                </div>

                {/* Industry Name */}
                <p className="text-[14px] font-medium text-[#1c1f26] mb-1">
                  {industry.name}
                </p>

                {/* Label */}
                <p className="text-[12px] text-gray-500">Projects Delivered</p>

                {/* Bottom Accent */}
                <div className="mt-4 h-[2px] w-0 bg-[#F4C542] group-hover:w-full transition-all duration-300 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-4"></div>

            <h2 className="text-[32px] sm:text-[40px] font-semibold text-[#1c1f26] mb-4">
              Featured Projects
            </h2>

            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
              A glimpse into our successfully executed industrial projects
              across various sectors.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div
                key={index}
                className="group bg-white border border-gray-200 overflow-hidden hover:border-[#F4C542] transition duration-300"
              >
                {/* Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-52 object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Industry Tag */}
                  <div className="absolute top-4 left-4 bg-[#1c1f26] text-[#F4C542] text-xs px-3 py-1 font-medium">
                    {project.industry}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Title */}
                  <h3 className="text-[18px] font-semibold text-[#1c1f26] mb-3 group-hover:text-[#F4C542] transition">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[14px] text-gray-600 mb-5 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    {(project.features || []).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-[6px] h-[6px] bg-[#F4C542]"></div>
                        <span className="text-[13px] text-gray-700">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Accent Line */}
                  <div className="mt-6 h-[2px] w-0 bg-[#F4C542] group-hover:w-full transition-all duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Solutions */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* LEFT CONTENT */}
            <div>
              {/* Accent Line */}
              <div className="w-12 h-[3px] bg-[#F4C542] mb-4"></div>

              {/* Heading */}
              <h2 className="text-[30px] sm:text-[36px] font-semibold text-[#1c1f26] mb-6">
                Custom Engineering Solutions
              </h2>

              {/* Description */}
              <p className="text-[15px] text-gray-700 mb-8 leading-relaxed max-w-xl">
                Every project is unique, and we deliver tailored engineering
                solutions that align with your operational requirements while
                maintaining the highest standards of quality, efficiency, and
                compliance.
              </p>

              {/* Features */}
              <div className="space-y-6">
                {/* Item 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    01
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Tailored Design
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Custom-built solutions designed to match your exact
                      industrial and operational needs.
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    02
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Quality Assurance
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Strict quality checks and adherence to industry standards
                      to ensure long-term reliability.
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    03
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Timely Delivery
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Efficient project execution ensuring delivery within
                      timelines and budget constraints.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT IMAGE */}
            <div>
              <div className="relative overflow-hidden border border-gray-200">
                <img
                  src="/assets/Custom Engineering.jpg"
                  alt="Custom solutions"
                  className="w-full h-[320px] object-cover transition duration-500 hover:scale-105"
                  loading="lazy"
                />

                {/* Bottom Accent */}
                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#F4C542]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

    {/* Accent Line */}
    <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6"></div>

    {/* Heading */}
    <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
      Ready to Start Your Project?
    </h2>

    {/* Description */}
    <p className="text-[16px] text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
      Partner with A K Engineering to deliver reliable, high-performance
      industrial solutions tailored to your specific operational requirements.
    </p>

    {/* CTA Button */}
    <a
      href="/contact"
      className="inline-block bg-[#F4C542] text-[#1c1f26] px-10 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
    >
      START YOUR PROJECT
    </a>

  </div>
</section>
    </div>
  );
};

export default Projects;
