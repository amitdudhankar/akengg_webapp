import React from "react";
import Seo from "../Components/Seo";
import Hero from "../Components/Hero";
import ServiceHighlights from "../Components/ServiceHighlights";
// import BannerThin from "../Components/BannerThin";
// import SuccessProjects from "../Components/SuccessProjects";
// import LeadershipTeam from "../Components/Leadershipteam";
import TestimonialSection from "../Components/Testimonials";
import GetStartedSection from "../Components/ClientLogos";
import Blogs from "./Blogs";
import BoilerSolution from "../Components/BoilerSolutions";
import EnergySection from "../Components/EnergySection";

const Home = () => {
  return (
    <div>
      <Seo
        title="Industrial Boiler, Fabrication & Pollution Control Solutions"
        description="A K Engineering provides turnkey IBR & non-IBR boiler systems, industrial fabrication, water treatment and pollution-control solutions across India."
        path="/"
      />
      <Hero />

      {/* Show BannerThin only on desktop (lg and up)
      <div className="hidden lg:block">
        <BannerThin />
      </div> */}

      <ServiceHighlights />
      <BoilerSolution/>
      <EnergySection/>
      {/* <SuccessProjects/> */}
      {/* <LeadershipTeam/> */}
      <Blogs/>
      <TestimonialSection />
      <GetStartedSection />
    </div>
  );
};

export default Home;
