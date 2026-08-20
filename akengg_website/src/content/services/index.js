import ibrSteamBoiler from "./ibr-steam-boiler";
import nonIbrSteamBoiler from "./non-ibr-steam-boiler";
import industrialSteamBoiler from "./industrial-steam-boiler";
import thermicFluidHeater from "./thermic-fluid-heater";
import hotWaterGenerator from "./hot-water-generator";
import industrialPiping from "./industrial-piping";
import industrialFabrication from "./industrial-fabrication";
import pollutionControlEquipment from "./pollution-control-equipment";

export {
  ibrSteamBoiler,
  nonIbrSteamBoiler,
  industrialSteamBoiler,
  thermicFluidHeater,
  hotWaterGenerator,
  industrialPiping,
  industrialFabrication,
  pollutionControlEquipment,
};

// Ordered list of all service page configs -- drives the generated routes in
// routes.jsx and the "Explore our services" chip row on Services.jsx.
export const SERVICE_PAGES = [
  ibrSteamBoiler,
  nonIbrSteamBoiler,
  industrialSteamBoiler,
  thermicFluidHeater,
  hotWaterGenerator,
  industrialPiping,
  industrialFabrication,
  pollutionControlEquipment,
];

// Lookup by exact PRODUCT string (see src/config/quoteFormConfig.js) -- lets
// any call site resolve a service page config from a product value without
// scanning the array itself.
export const byProduct = SERVICE_PAGES.reduce((map, page) => {
  map[page.product] = page;
  return map;
}, {});
