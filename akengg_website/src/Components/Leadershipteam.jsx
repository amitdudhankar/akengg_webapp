import React, { useRef, useState, useEffect } from "react";
import { getTeam } from "../api/api";

const FALLBACK_TEAM = [
  {
    title: "Engineering Head",
    description:
      "20+ years in industrial boiler systems & thermalengineering",
    subtitle: "Technical Operations",
    image: "/assets/EnggHead.jpg", // Replace with real image
  },
  {
    title: "Project Manager",
    description: "Expert in complex project delivery on time &to quality",
    subtitle: "Operations & Delivery",
    image: "/assets/PM.jpg", // Replace with real image
  },
  {
    title: "Quality Assurance",
    description: "IBR compliance and industry quality inall projects",
    subtitle: "Compliance & StandardsEnsures",
    image: "/assets/QA.jpg",
  },
];

const LeadershipTeam = () => {
  const sectionRef = useRef(null);

  const [leadershipTeam, setLeadershipTeam] = useState(FALLBACK_TEAM);

  useEffect(() => {
    getTeam()
      .then((d) => {
        if (Array.isArray(d) && d.length) {
          setLeadershipTeam(
            d.map((m) => ({
              title: m?.title || "",
              subtitle: m?.subtitle || "",
              description: m?.description || "",
              image: m?.image || "",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <section
        ref={sectionRef}
        className="py-20 bg-gray-50"
        id="what-makes-us-different"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mt-10 mb-16">
            <h2 className="text-[35px] sm:text-[40px] md:text-[80px] leading-[1.1] uppercase mb-4 font-normal text-[#234B97]">
              <span className="font-light">Leadership </span>
              <span className="font-extrabold">Team</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {leadershipTeam.map((service, index) => (
              <div
                key={index}
                className="animated-card flex flex-col items-center transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Outer Card */}
                <div
                  className="relative w-[393px] h-[460px] rounded-t-[30px] bg-cover bg-center bg-no-repeat flex flex-col items-center"
                  style={{
                    backgroundImage: `url(${
                      service.image || "https://placehold.co/420x360"
                    })`,
                  }}
                >
                  {/* Inner Content Card */}
                  <div className="absolute -bottom-0 w-[369px] h-[190px] bg-[rgba(35,75,151,0.76)] rounded-t-[30px] p-5 flex flex-col items-center gap-3 z-10 text-white">
                    <div className="text-center font-[Inter] text-[30px] font-bold leading-[26px]">
                      {service.title}
                    </div>

                    {/* Divider line */}
                    <div className="w-3/4 h-px bg-white opacity-70"></div>

                    <div className="text-center font-[Inter] text-[18px] font-semibold leading-[18px]">
                      {service.subtitle}
                    </div>

                    <div className="text-center font-[Inter] text-[15px] font-normal leading-[18px]">
                      {service.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LeadershipTeam;
