import { PLACEHOLDER } from "./placeholder";

// IBR Steam Boiler service page content. "IBR" refers to boiler systems that
// fall under the statutory inspection/certification framework administered
// under Indian boiler law -- see faqs below for a plain-language definition.
export default {
  slug: "ibr-steam-boiler",
  product: "IBR Steam Boiler",

  meta: {
    title: "IBR Steam Boiler Manufacturer & Installation",
    description:
      "IBR steam boiler design, manufacturing, installation and commissioning from A K Engineering -- statutory-compliant boiler systems for industrial steam generation.",
  },

  hero: {
    heading: "IBR Steam Boilers",
    subheading:
      "Statutory-compliant steam boiler systems engineered, manufactured and commissioned for continuous industrial operation.",
    image: "/assets/BoilerHeroSection.jpg",
  },

  whatWeProvide: [
    "IBR-compliant steam boiler design and manufacturing",
    "Statutory documentation and inspection support",
    "Site installation and commissioning",
    "Fuel-flexible burner and combustion system integration",
    "Boiler automation and control panel setup",
    "Post-installation maintenance and service support",
  ],

  overview: [
    "IBR steam boilers are pressure vessels that fall under the statutory inspection and certification framework administered under Indian boiler law. They are typically specified where an industrial process needs a larger or higher-pressure steam supply than a Non-IBR system is built to deliver.",
    "A K Engineering designs, manufactures and installs IBR steam boiler systems, taking projects from initial requirement study through statutory documentation, fabrication, site installation and commissioning.",
    "Because these systems operate under regulatory oversight, we work closely with clients through the approval and inspection process alongside the core engineering and fabrication work.",
  ],

  specifications: [
    { label: "Capacity Range", value: PLACEHOLDER },
    { label: "Design Working Pressure", value: PLACEHOLDER },
    {
      label: "Fuel Options",
      value:
        "Coal, wood/biomass, agro-waste, furnace oil, diesel, natural gas/PNG, LPG or electric-fired configurations",
    },
    { label: "Applicable Standards / IBR Registration", value: PLACEHOLDER },
  ],

  applications: [
    "Process steam generation",
    "Sterilization and autoclaving",
    "Drying and curing processes",
    "Heating and space conditioning",
    "Power and utility steam supply",
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
    "Engineered for continuous, reliable steam output",
    "Statutory compliance handled alongside the core project",
    "Fuel-flexible designs suited to different plant setups",
    "Single point of contact from design through commissioning",
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
      step: "Statutory Documentation & Inspection Support",
      detail:
        "We assist with the documentation and inspection steps required for IBR-compliant systems.",
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
    "Installation begins with confirming site readiness -- foundation, flue/chimney routing, water and fuel supply lines, and electrical connections are checked against the approved drawings before equipment arrives.",
    "Once positioned, the boiler and its auxiliaries (feed pumps, control panel, safety valves, instrumentation) are connected and pressure-tested as part of commissioning.",
    "Commissioning includes functional testing of safety and control systems, and a handover briefing so plant operators understand safe start-up, running and shutdown procedures.",
    "A K Engineering remains available for follow-up maintenance and service after installation.",
  ],

  faqs: [
    {
      question: "What does \"IBR\" mean for a steam boiler?",
      answer:
        "IBR refers to the Indian Boiler Regulations framework -- steam boilers and related equipment that fall under this statutory inspection and certification regime are designed, fabricated and commissioned under that regulatory oversight, in addition to standard engineering practice.",
    },
  ],

  related: {
    slugs: ["non-ibr-steam-boiler", "industrial-steam-boiler", "thermic-fluid-heater"],
    showProjects: true,
  },
};
