import { PLACEHOLDER } from "./placeholder";

// Industrial Fabrication service page content -- covers SS and MS
// fabrication as sub-topics, matching how Services.jsx already frames
// "SS & MS Fabrication for Chimneys, Structural Platforms, Ducting, All
// Types of Tanks, Piping" as a single combined offering.
export default {
  slug: "industrial-fabrication",
  product: "Industrial Fabrication",

  meta: {
    title: "Industrial Fabrication Services",
    description:
      "SS and MS industrial fabrication from A K Engineering -- chimneys, structural platforms, ducting, tanks and piping built to project specification.",
  },

  hero: {
    heading: "Industrial Fabrication",
    subheading:
      "Stainless steel and mild steel fabrication for chimneys, structural platforms, ducting, tanks and piping.",
    image: "/assets/Industrial Fab.jpg",
  },

  whatWeProvide: [
    "Stainless steel (SS) fabrication",
    "Mild steel (MS) fabrication",
    "Industrial chimney fabrication",
    "Structural platforms and support steel",
    "Ducting systems",
    "Storage tanks and vessels",
  ],

  overview: [
    "Industrial fabrication covers the structural and vessel work that supports a plant's core process equipment -- chimneys, platforms, ducting, tanks and piping. A K Engineering carries out both stainless steel (SS) and mild steel (MS) fabrication, selecting the material based on the application's process, hygiene or corrosion-resistance requirements.",
    "Our fabrication work is often carried out alongside our boiler and piping projects as part of a turnkey scope, and is also available as a standalone service for structural and vessel fabrication needs.",
    "Every fabrication job goes through drawing review, material verification and in-process quality checks before it leaves our shop.",
  ],

  specifications: [
    {
      label: "Fabrication Categories",
      value: "Stainless steel (SS) and mild steel (MS) fabrication",
    },
    {
      label: "Typical Structures",
      value: "Chimneys, structural platforms, ducting, tanks & vessels, piping",
    },
    { label: "Plate Thickness Range", value: PLACEHOLDER },
    { label: "Applicable Standards", value: PLACEHOLDER },
  ],

  applications: [
    "Industrial chimneys and stacks",
    "Structural platforms and support steel",
    "Ducting for process and ventilation systems",
    "Storage tanks and process vessels",
    "Custom piping and fabricated assemblies",
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
    "Material selection (SS or MS) matched to your application",
    "In-house fabrication under consistent quality checks",
    "Works alongside our boiler and piping projects for turnkey delivery",
    "Available as a standalone fabrication service",
    "Custom-built to drawing and site dimensions",
  ],

  process: [
    {
      step: "Site Survey & Requirement Study",
      detail:
        "We review your structural, ducting or vessel requirement and take site dimensions and constraints into account.",
    },
    {
      step: "Engineering Design & Drawing Approval",
      detail:
        "Fabrication drawings are prepared and shared for review before work begins.",
    },
    {
      step: "Fabrication",
      detail:
        "Cutting, forming, welding and assembly are carried out under quality checks at each stage of production.",
    },
    {
      step: "Dispatch & Site Installation",
      detail:
        "Fabricated items are transported and installed or erected at your facility.",
    },
    {
      step: "Inspection & Handover",
      detail:
        "Completed work is inspected against the approved drawings before handover.",
    },
  ],

  installation: [
    "Installation planning accounts for site access, lifting/rigging requirements and coordination with other ongoing site work.",
    "Fabricated structures, ducting, tanks or piping are erected or positioned and secured as per the approved drawings.",
    "Welded joints and connections are inspected before handover, with any project-specific testing carried out as required.",
    "A K Engineering remains available for follow-up maintenance and modification work after installation.",
  ],

  faqs: [],

  related: {
    slugs: ["industrial-piping", "pollution-control-equipment"],
    showProjects: true,
  },
};
