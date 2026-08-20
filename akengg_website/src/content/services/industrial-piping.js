import { PLACEHOLDER } from "./placeholder";

// Industrial Piping service page content -- covers IBR and Non-IBR piping
// as sub-topics within one combined service, matching how Services.jsx
// already frames "IBR/Non-IBR Piping Projects" as a single offering.
export default {
  slug: "industrial-piping",
  product: "Industrial Piping",

  meta: {
    title: "Industrial Piping Design & Installation",
    description:
      "IBR and Non-IBR industrial piping design, fabrication and installation from A K Engineering -- steam distribution and process piping systems built to regulatory standards.",
  },

  hero: {
    heading: "Industrial Piping",
    subheading:
      "IBR and Non-IBR piping systems designed and installed for steam distribution and process applications.",
    image: "/assets/IBR.jpg",
  },

  whatWeProvide: [
    "IBR-compliant piping design and installation",
    "Non-IBR industrial piping for general process use",
    "Steam distribution system design",
    "Process piping installation",
    "Pressure testing and documentation support",
    "Piping maintenance and upgrades",
  ],

  overview: [
    "Industrial piping carries steam, process fluids and utilities between equipment, and its design has a direct bearing on plant safety, energy efficiency and reliability. A K Engineering designs and installs both IBR-compliant and Non-IBR industrial piping, depending on what the application and regulatory classification require.",
    "IBR piping applies where the piping is connected to or forms part of a statutory-classified boiler system, and is designed, fabricated and tested under that regulatory framework. Non-IBR piping covers general process and utility routing that falls outside that specific scope.",
    "We handle piping design, fabrication, installation and pressure testing as part of new boiler and process projects, as well as standalone piping upgrades and replacements for existing plants.",
  ],

  specifications: [
    {
      label: "Pipe Categories",
      value: "IBR-compliant and Non-IBR industrial piping",
    },
    { label: "Working Pressure Range", value: PLACEHOLDER },
    { label: "Material Options", value: PLACEHOLDER },
    { label: "Applicable Standards", value: PLACEHOLDER },
    { label: "Pressure Testing & Certification", value: PLACEHOLDER },
  ],

  applications: [
    "Steam distribution piping",
    "Process fluid piping",
    "Condensate return lines",
    "Utility piping (compressed air, water, fuel)",
    "Piping tie-ins for new and existing boiler systems",
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
    "IBR and Non-IBR classification handled correctly for your application",
    "Designed to minimize steam and heat losses in distribution",
    "Pressure-tested before handover",
    "Works alongside our boiler and fabrication scope for turnkey projects",
    "Available for standalone upgrades on existing piping systems",
  ],

  process: [
    {
      step: "Site Survey & Requirement Study",
      detail:
        "We review your process layout, existing piping (if any), and routing constraints on site.",
    },
    {
      step: "Engineering Design & Drawing Approval",
      detail:
        "Piping layout, sizing and classification (IBR / Non-IBR) are worked out and shared for review before fabrication.",
    },
    {
      step: "Fabrication",
      detail:
        "Piping spools and supports are fabricated under quality checks at each stage of production.",
    },
    {
      step: "Site Installation",
      detail:
        "Piping is installed and connected at site, coordinated with other trades and existing plant equipment.",
    },
    {
      step: "Pressure Testing & Handover",
      detail:
        "Installed piping is pressure-tested before being handed over ready for use, with documentation as applicable.",
    },
  ],

  installation: [
    "Installation is planned around your existing plant layout and any tie-in points with running equipment, to minimize disruption to ongoing operations.",
    "Piping is routed, supported and insulated as specified, with attention to expansion allowance, drainage and accessibility for future maintenance.",
    "Before handover, installed sections are pressure-tested to confirm integrity, with IBR-classified piping following the applicable statutory testing and documentation process.",
    "A K Engineering remains available for follow-up maintenance and upgrades after installation.",
  ],

  faqs: [
    {
      question: "When does piping need to be IBR-compliant?",
      answer:
        "Piping that is connected to or forms part of a statutory-classified (IBR) boiler system generally needs to be designed, fabricated and tested under that same regulatory framework. General process and utility piping that isn't part of such a system is typically handled as Non-IBR piping.",
    },
  ],

  related: {
    slugs: ["ibr-steam-boiler", "non-ibr-steam-boiler", "industrial-fabrication"],
    showProjects: true,
  },
};
