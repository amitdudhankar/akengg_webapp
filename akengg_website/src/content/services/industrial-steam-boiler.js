import { PLACEHOLDER } from "./placeholder";

// Industrial Steam Boiler service page content -- the general/umbrella
// steam-boiler product, covering both IBR and Non-IBR configurations
// depending on the application.
export default {
  slug: "industrial-steam-boiler",
  product: "Industrial Steam Boiler",

  meta: {
    title: "Industrial Steam Boiler Systems",
    description:
      "Industrial steam boiler systems from A K Engineering -- IBR and Non-IBR configurations designed, manufactured, installed and commissioned for continuous plant operation.",
  },

  hero: {
    heading: "Industrial Steam Boilers",
    subheading:
      "Steam boiler systems engineered for continuous industrial operation, available in IBR and Non-IBR configurations.",
    image: "/assets/Boiler & Chimney Solutions.jpg",
  },

  whatWeProvide: [
    "Steam boiler design and manufacturing for industrial applications",
    "IBR and Non-IBR configurations depending on requirement",
    "Site installation and commissioning",
    "Fuel-flexible burner and combustion system integration",
    "Boiler automation and control panel setup",
    "Post-installation maintenance and service support",
  ],

  overview: [
    "Industrial steam boilers sit at the core of many manufacturing processes, supplying the steam used for heating, drying, sterilization and process operations across a wide range of industries.",
    "A K Engineering designs and manufactures industrial steam boiler systems in both IBR and Non-IBR configurations, selecting the right classification and specification based on your process steam demand, pressure requirement and site conditions.",
    "Our scope covers the full project lifecycle -- requirement study, engineering design, fabrication, site installation and commissioning -- so plant teams have a single point of contact throughout.",
  ],

  specifications: [
    { label: "Capacity Range", value: PLACEHOLDER },
    { label: "Design Working Pressure", value: PLACEHOLDER },
    {
      label: "Fuel Options",
      value:
        "Coal, wood/biomass, agro-waste, furnace oil, diesel, natural gas/PNG, LPG or electric-fired configurations",
    },
    {
      label: "Compliance Configuration",
      value:
        "Available in IBR-compliant and Non-IBR configurations depending on application",
    },
    { label: "Applicable Standards", value: PLACEHOLDER },
  ],

  applications: [
    "Process steam generation",
    "Drying and curing processes",
    "Sterilization and autoclaving",
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
    "Right-sized for your process steam demand",
    "IBR or Non-IBR configuration matched to your requirement",
    "Fuel-flexible designs suited to different plant setups",
    "Single point of contact from design through commissioning",
    "Ongoing maintenance and service support after handover",
  ],

  process: [
    {
      step: "Site Survey & Requirement Study",
      detail:
        "We assess your steam demand, available utilities and site conditions to size and classify the right system.",
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
    "Installation begins with confirming site readiness -- foundation, flue/chimney routing, water and fuel supply lines, and electrical connections are checked against the approved drawings before equipment arrives.",
    "Once positioned, the boiler and its auxiliaries (feed pumps, control panel, safety valves, instrumentation) are connected and tested as part of commissioning.",
    "Commissioning includes functional testing of safety and control systems, and a handover briefing so plant operators understand safe start-up, running and shutdown procedures.",
    "A K Engineering remains available for follow-up maintenance and service after installation.",
  ],

  faqs: [],

  related: {
    slugs: ["ibr-steam-boiler", "non-ibr-steam-boiler", "hot-water-generator"],
    showProjects: true,
  },
};
