import { PLACEHOLDER } from "./placeholder";

// Non-IBR Steam Boiler service page content.
export default {
  slug: "non-ibr-steam-boiler",
  product: "Non-IBR Steam Boiler",

  meta: {
    title: "Non-IBR Steam Boiler Manufacturer & Installation",
    description:
      "Non-IBR steam boiler design, manufacturing, installation and commissioning from A K Engineering -- reliable steam systems for smaller and mid-scale industrial needs.",
  },

  hero: {
    heading: "Non-IBR Steam Boilers",
    subheading:
      "Compact, reliable steam boiler systems for industrial processes that fall outside the IBR statutory framework.",
    image: "/assets/Boiler Systems.jpg",
  },

  whatWeProvide: [
    "Non-IBR steam boiler design and manufacturing",
    "Site installation and commissioning",
    "Fuel-flexible burner and combustion system integration",
    "Boiler automation and control panel setup",
    "Post-installation maintenance and service support",
  ],

  overview: [
    "Non-IBR steam boilers are steam-generating systems that fall outside the statutory inspection and certification framework administered under Indian boiler law, generally because of their lower capacity or pressure rating. They remain a common choice for smaller and mid-scale industrial processes where a full IBR system is not required.",
    "A K Engineering designs, manufactures and installs Non-IBR steam boiler systems, built to the same standard of engineering care and quality control we apply across our boiler range.",
    "These systems are typically quicker to specify and deploy than IBR-class boilers, since they sit outside the statutory registration process, while still being engineered for safe, dependable operation.",
  ],

  specifications: [
    { label: "Capacity Range", value: PLACEHOLDER },
    { label: "Design Working Pressure", value: PLACEHOLDER },
    {
      label: "Fuel Options",
      value:
        "Coal, wood/biomass, agro-waste, furnace oil, diesel, natural gas/PNG, LPG or electric-fired configurations",
    },
    { label: "Applicable Standards", value: PLACEHOLDER },
  ],

  applications: [
    "Process steam generation",
    "Space and process heating",
    "Drying and curing processes",
    "Utility steam supply for smaller plants",
    "Standby or supplementary steam capacity",
  ],

  industries: [
    "Pharmaceutical",
    "Chemical",
    "Food & Beverage",
    "Textiles",
    "Automotive",
    "Power Generation",
  ],

  benefits: [
    "Cost-effective steam solution for smaller-scale needs",
    "Faster specification and deployment than IBR-class systems",
    "Fuel-flexible designs suited to different plant setups",
    "Consistent quality control across manufacturing and fabrication",
    "Ongoing maintenance and service support after handover",
  ],

  process: [
    {
      step: "Site Survey & Requirement Study",
      detail:
        "We assess your steam demand, available utilities and site conditions to size the right system for your process.",
    },
    {
      step: "Engineering Design & Drawing Approval",
      detail:
        "Detailed engineering drawings are prepared and shared for review before fabrication begins.",
    },
    {
      step: "Manufacturing & Fabrication",
      detail:
        "The boiler and associated components are fabricated under quality checks at each stage of production.",
    },
    {
      step: "Dispatch & Site Installation",
      detail:
        "The system is transported and installed at your facility, with civil and utility interfaces coordinated in advance.",
    },
    {
      step: "Commissioning & Handover",
      detail:
        "Commissioning tests are carried out, operators are briefed on safe operation, and the system is handed over ready for use.",
    },
  ],

  installation: [
    "Installation begins with confirming site readiness -- foundation, flue routing, water and fuel supply lines, and electrical connections are checked against the approved drawings before equipment arrives.",
    "Once positioned, the boiler and its auxiliaries (feed pumps, control panel, safety valves, instrumentation) are connected and tested as part of commissioning.",
    "Commissioning includes functional testing of safety and control systems, and a handover briefing so plant operators understand safe start-up, running and shutdown procedures.",
    "A K Engineering remains available for follow-up maintenance and service after installation.",
  ],

  faqs: [
    {
      question: "How is a Non-IBR boiler different from an IBR boiler?",
      answer:
        "IBR boilers fall under the statutory inspection and certification regime for boilers under Indian boiler law, typically because of their capacity or pressure rating, while Non-IBR boilers sit outside that regulatory framework. Both are engineered for safe, reliable operation -- the distinction is about which regulatory regime applies, not general build quality.",
    },
  ],

  related: {
    slugs: ["ibr-steam-boiler", "industrial-steam-boiler", "hot-water-generator"],
    showProjects: true,
  },
};
