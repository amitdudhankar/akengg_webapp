-- ─────────────────────────────────────────────────────────────
-- AK Engineering — Industry pages + Project case studies migration
-- (run ONCE on the existing akengg_db).
--
-- Two things happen here:
--   1. `industries` — CMS-managed industry landing pages (one row per
--      industry the company sells into), plus six seeded rows matching
--      the names already used in `industry_stats`.
--   2. `projects` grows from a thin "title / industry / description"
--      card into a full case study, and gains `project_images` for a
--      photo gallery.
--
-- Safe to re-run: tables use IF NOT EXISTS, the ALTERs use MariaDB's
-- IF NOT EXISTS (XAMPP default), and the seed uses
-- ON DUPLICATE KEY UPDATE id = id (insert-if-absent, keyed on the
-- unique slug). On real MySQL, remove "IF NOT EXISTS" from the ALTERs.
--
-- NOTE ON DEFAULTS: projects.is_published defaults to 1 on purpose —
-- the case studies already live on the site must stay visible after
-- this migration. industries.is_published defaults to 0 (draft) because
-- a new industry page is written before it is published; the six seeded
-- rows below set it to 1 explicitly.
--
-- The list-ish columns (overview/challenges/solutions/applications/
-- related_products/equipment) are LONGTEXT holding a JSON array of
-- strings, exactly like the existing services.features / projects.features
-- columns. The services parse them on read and stringify on write.
-- ─────────────────────────────────────────────────────────────

USE akengg_db;

-- industries -------------------------------------------------------------
-- One row per CMS-managed industry landing page (/industries/<slug>).
CREATE TABLE IF NOT EXISTS industries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  meta_title VARCHAR(200) NULL,
  meta_description VARCHAR(300) NULL,
  hero_heading VARCHAR(200) NULL,
  hero_subheading VARCHAR(500) NULL,
  image VARCHAR(255) NULL,         -- storage key, e.g. "industries/172..-x.webp"
  overview LONGTEXT NULL,          -- JSON array of paragraph strings
  challenges LONGTEXT NULL,        -- JSON array of strings
  solutions LONGTEXT NULL,         -- JSON array of strings
  applications LONGTEXT NULL,      -- JSON array of strings
  related_products LONGTEXT NULL,  -- JSON array of strings
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_industry_slug (slug),
  KEY idx_industries_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- projects: thin card -> full case study ---------------------------------
-- Every column is nullable and every existing column is untouched, so the
-- six rows already on the site keep rendering exactly as they do today.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(220) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(200) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(200) NULL;
-- Client names are confidential by default: the case study only prints one
-- when the owner explicitly ticks this box.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS show_client_name TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_requirement LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS problem LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS solution LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS equipment LONGTEXT NULL;   -- JSON array of strings
ALTER TABLE projects ADD COLUMN IF NOT EXISTS capacity VARCHAR(200) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_engineering LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_fabrication LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_installation LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_commissioning LONGTEXT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS result LONGTEXT NULL;
-- Soft reference to one of the eight website service pages
-- ("ibr-steam-boiler", "thermic-fluid-heater", ...) so a case study can
-- cross-link back to the service it belongs to. Deliberately NOT a FK:
-- the service pages are static content in the website repo, not DB rows.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS related_service_slug VARCHAR(120) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry_id INT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_on DATE NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS meta_description VARCHAR(300) NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 1;

-- Indexes/constraints added BEFORE the slug backfill: at this point every
-- existing slug is still NULL (and MySQL allows any number of NULLs in a
-- UNIQUE index), so the index add cannot fail on legacy data.
ALTER TABLE projects ADD UNIQUE KEY IF NOT EXISTS uq_project_slug (slug);
ALTER TABLE projects ADD KEY IF NOT EXISTS idx_projects_published (is_published);
-- MariaDB puts the IF NOT EXISTS *after* FOREIGN KEY (unlike ADD COLUMN /
-- ADD KEY, where it follows the object type). On real MySQL, drop it.
ALTER TABLE projects ADD CONSTRAINT fk_project_industry
  FOREIGN KEY IF NOT EXISTS (industry_id) REFERENCES industries(id) ON DELETE SET NULL;

-- Rough slug backfill so existing case studies get a shareable URL straight
-- away: lowercase the title and turn every run of non-alphanumerics (spaces,
-- slashes, punctuation) into a single "-". It mirrors createSlug() in
-- project.service.js but does NOT de-duplicate, so it is only a starting
-- point — the service regenerates a proper, collision-checked slug the next
-- time the row is edited.
-- A title that reduces to nothing stays NULL rather than "" (the URL then
-- falls back to the numeric id, which both frontends already handle).
-- If two existing projects share a title this UPDATE will trip
-- uq_project_slug — rename one of them, or hand-edit its slug, then re-run.
UPDATE projects
SET slug = NULLIF(
      LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(title), '[^a-z0-9]+', '-')), 200),
      '')
WHERE slug IS NULL;

-- project_images ---------------------------------------------------------
-- Case-study photo gallery. One row per uploaded image; the cover image
-- stays on projects.image. Rows are removed with the project (CASCADE); the
-- service deletes the underlying stored objects.
CREATE TABLE IF NOT EXISTS project_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  image_key VARCHAR(255) NOT NULL,   -- storage key, e.g. "projects/172..-x.webp"
  caption VARCHAR(300) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pimg_project (project_id),
  CONSTRAINT fk_pimg_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Seed: the six industry pages, matching the names already used in
-- `industry_stats`. Insert-if-absent (ON DUPLICATE KEY UPDATE id = id keyed
-- on uq_industry_slug), so re-running this file never overwrites text the
-- owner has since edited in the admin panel.
--
-- CONTENT RULE: everything below is GENERIC industry-engineering knowledge —
-- what that industry needs from boiler / piping / fabrication / pollution
-- control engineering in general. It contains NO claim about what
-- A K Engineering has supplied, no client names, no counts, no capacities
-- and no credentials. `image` is left NULL for the owner to upload.
-- ─────────────────────────────────────────────────────────────
INSERT INTO industries
  (slug, name, meta_title, meta_description, hero_heading, hero_subheading,
   overview, challenges, solutions, applications, related_products,
   sort_order, is_published)
VALUES
-- 1. Pharmaceutical -------------------------------------------------------
(
  'pharmaceutical',
  'Pharmaceutical',
  'Steam and Utility Engineering for the Pharmaceutical Industry',
  'Clean steam generation, IBR-compliant boilers, sanitary piping and utility systems for pharmaceutical manufacturing, sterilisation and GMP-qualified plant rooms.',
  'Steam and Utility Engineering for Pharmaceutical Plants',
  'Pharmaceutical manufacturing depends on dry, contaminant-free steam, tightly controlled temperatures and utility systems documented well enough to stand up to a regulatory inspection.',
  '["Pharmaceutical manufacturing is one of the most steam-intensive process industries. Steam is used not only as a heat source for reactors, dryers and jacketed vessels, but as a direct sterilising medium in autoclaves, sterilisation-in-place loops and formulation areas, which makes the quality of the steam itself part of the product quality argument.","Because of that, utility engineering in a pharmaceutical plant is governed as tightly as the process. Boilers above the statutory pressure and volume thresholds fall under the Indian Boiler Regulations (IBR), pipework carrying steam at those parameters has to be fabricated, welded and tested to approved procedures, and every stage of that work must be documented for the Boiler Inspectorate as well as for internal GMP qualification.","A well-engineered pharmaceutical steam system therefore separates duties: a plant utility boiler generating filtered, dry saturated steam for general heating, and a clean or pure steam generator producing steam free of boiler additives wherever the steam contacts the product or product-contact surfaces. Condensate recovery, correct trapping and properly sized distribution headers keep that steam dry at the point of use and keep fuel consumption in check."]',
  '["Steam reaching sterilisers must be dry, saturated and free of boiler carry-over, feedwater additives and non-condensable gases.","Boilers and steam pipework crossing IBR thresholds need approved designs, certified welders, stage inspection and statutory documentation.","Product-contact utilities have to be qualified and traceable, so material test certificates and weld records matter as much as the hardware itself.","Wet or superheated steam, poor trapping and dead legs in the distribution network cause failed sterilisation cycles and long batch delays.","Multi-product facilities run widely varying steam loads through the day, so a boiler sized only for peak demand cycles inefficiently at part load."]',
  '["IBR-compliant steam boilers sized around the real sterilisation and process load profile rather than peak demand alone.","Clean or pure steam generation downstream of the plant boiler wherever steam contacts the product or product-contact surfaces.","Stainless steel distribution piping fabricated to approved welding procedures, sloped and trapped to eliminate dead legs and condensate pockets.","Separators, filters and correctly selected steam traps at the point of use to deliver dry saturated steam at a stable pressure.","Condensate recovery and blowdown heat recovery to cut fuel consumption and reduce the feedwater treatment load."]',
  '["Autoclaves and sterilisers","Sterilisation-in-place and clean-in-place systems","Jacketed reactors, blenders and formulation vessels","Fluid bed dryers, tray dryers and granulation equipment","HVAC humidification and air handling for classified areas","Purified water and water-for-injection generation loops"]',
  '["IBR Steam Boiler","Industrial Steam Boiler","Industrial Piping","Water Treatment Plant","Industrial Fabrication"]',
  1, 1
),
-- 2. Chemical -------------------------------------------------------------
(
  'chemical',
  'Chemical',
  'Thermic Fluid and Steam Systems for the Chemical Industry',
  'Thermic fluid heaters, steam boilers, corrosion-aware process piping and pollution control equipment engineered for chemical reactors, distillation and solvent recovery duties.',
  'Process Heating for Chemical Plants',
  'Chemical processing runs on precise, sustained heat — and on utility systems engineered around the media, the temperature and the emission limits from the very first drawing.',
  '["Chemical plants run on precise, sustained heat. Reaction kinetics, distillation and solvent recovery all depend on holding a defined temperature for a defined time, so the utility system supplying that heat has as much bearing on yield and cycle time as the reactor itself.","Where the required temperature sits above what saturated steam can economically deliver — broadly beyond about 180 to 200 degrees Celsius — thermic fluid (hot oil) systems take over. They reach high temperatures at near-atmospheric pressure, which avoids the thick-walled vessels and the statutory high-pressure regime that equivalent steam would demand.","Corrosion, thermal cycling and the handling of aggressive or flammable media drive the rest of the engineering. Material selection, pipe routing, expansion allowances, hazardous-area classification and emission control all have to be settled at design stage rather than corrected after commissioning."]',
  '["Processes needing temperatures above the practical range of saturated steam without moving to a very high pressure system.","Corrosive process media and vapours that rule out plain carbon steel in wetted or exposed sections.","Wide swings in heating and cooling demand across a batch, which a fixed-output heater handles poorly.","Solvent vapours, acid gases and particulate emissions that must be controlled to meet pollution control board consent conditions.","Thermal expansion and vibration in long pipe runs that operate through large temperature swings."]',
  '["Thermic fluid heaters for high-temperature duties at low system pressure, with correctly sized expansion and de-aeration vessels.","Steam boilers with modulating firing and turndown matched to the batch load profile instead of a single fixed output.","Material selection and lined or alloy piping chosen against the actual media, temperature and concentration.","Scrubbers, cyclones and other pollution control equipment matched to the emission stream and the applicable consent limits.","Stress-aware pipe routing with expansion loops, guides and anchors on high-temperature circuits."]',
  '["Batch and continuous reactors","Distillation and solvent recovery columns","Evaporators and crystallisers","Dryers and calciners","Storage tank and line heating or tracing","Effluent treatment and vapour scrubbing"]',
  '["Thermic Fluid Heater","Industrial Steam Boiler","Non-IBR Steam Boiler","Industrial Piping","Pollution Control Equipment"]',
  2, 1
),
-- 3. Food & Beverage ------------------------------------------------------
(
  'food-beverage',
  'Food & Beverage',
  'Steam, Hot Water and Hygienic Piping for Food and Beverage Plants',
  'Boilers, culinary steam take-offs, hygienic stainless steel piping and water treatment engineered for pasteurising, cooking, evaporating, drying and clean-in-place duties.',
  'Steam and Hot Water Engineering for Food and Beverage Processing',
  'Food and beverage plants heat, cook, pasteurise and clean around the clock — on utilities that have to be hygienic, responsive and economical across a very uneven duty cycle.',
  '["Food and beverage processing uses heat at almost every step: blanching, cooking, pasteurising, sterilising, evaporating, drying and clean-in-place. Steam is the dominant medium because it carries a large amount of energy per kilogram and its temperature is fixed by its pressure, which makes it straightforward to control precisely.","Because much of that steam either touches the product or touches surfaces the product will touch, hygiene requirements sit alongside the thermal ones. Culinary steam — filtered steam produced without volatile or film-forming boiler additives — is the accepted answer for direct injection duties, while indirect duties can be served by conventional plant steam through a heat exchanger.","Food plants also tend to run seasonally and in shifts, with sharp peaks at cook and clean-in-place times and long quiet periods in between. Utility systems that hold their efficiency across that swing, and that recover heat from condensate and flue gas, have a direct effect on the cost per unit produced."]',
  '["Direct-contact steam duties require steam free of amines and other volatile boiler treatment chemicals.","Sharp, short-duration peak loads at cook and clean-in-place times against long low-load periods.","Strict hygienic design of pipework and vessels: drainable, cleanable, crevice-free and in food-grade materials.","High water consumption and a correspondingly high effluent load with heavy organic content.","Downtime inside a production season is expensive, so redundancy and maintainability have to be designed in rather than added later."]',
  '["Steam boilers sized and controlled for a peaky duty cycle, with fast response and adequate steam storage.","Culinary or filtered steam take-offs for direct injection, with plant steam retained for indirect heating.","Hygienic stainless steel piping, fully drainable and fabricated to food-industry finish and joint standards.","Water treatment plants for boiler feed and process water, plus effluent treatment sized for the organic load.","Condensate return and flue gas economisers to recover heat that would otherwise be dumped."]',
  '["Pasteurisers and sterilisers","Cookers, kettles and jacketed vessels","Evaporators and concentrators","Spray dryers and tunnel dryers","Clean-in-place hot water and caustic circuits","Bottle, crate and can washing lines"]',
  '["IBR Steam Boiler","Non-IBR Steam Boiler","Industrial Steam Boiler","Industrial Piping","Water Treatment Plant"]',
  3, 1
),
-- 4. Textile --------------------------------------------------------------
(
  'textile',
  'Textile',
  'Boiler, Heat Recovery and Effluent Engineering for Textile Processing',
  'Steam boilers, thermic fluid heaters, condensate and flash steam recovery, water treatment and effluent systems engineered for dyeing, drying and finishing operations.',
  'Steam, Heat Recovery and Effluent Engineering for Textile Processing',
  'Wet processing is one of the most steam and water hungry operations in manufacturing, which makes the utility system the single biggest lever on a dyehouse cost sheet.',
  '["Textile processing — particularly wet processing such as scouring, bleaching, dyeing, printing and finishing — is among the most steam-hungry operations in manufacturing. Steam heats dye baths, drives stenters and dryers, and supplies the hot water that every wash stage consumes.","Because energy and water are the two largest variable costs in a wet processing house, the utility system is where most of the achievable savings sit. Condensate recovery, flash steam recovery, insulation of headers and valves, and correct trap selection routinely account for a large share of a dyehouse energy bill.","Effluent is the other defining constraint. Dyehouse discharge carries colour, dissolved solids and a high chemical oxygen demand, and consent conditions in most textile clusters now call for treatment — and increasingly for recovery and reuse of the treated water — rather than simple discharge."]',
  '["Very high specific steam and hot water consumption per kilogram of fabric processed.","Batch dyeing cycles that create sharply fluctuating steam demand through the day.","Coloured, high-TDS, high-COD effluent that must be treated before discharge and increasingly recovered for reuse.","Condensate and flash steam frequently vented to atmosphere, wasting both heat and treated feedwater.","Hard feedwater causing scale in boilers, dyeing machines and heat exchangers."]',
  '["Steam boilers with good turndown and stable pressure control across fluctuating dyehouse loads.","Condensate and flash steam recovery back to the feed tank to reclaim both the heat and the treated water.","Well insulated, correctly sized distribution headers with trap stations selected duty by duty.","Softening and demineralisation plants to protect boilers and process equipment from scale.","Effluent treatment and pollution control equipment sized for the colour, COD and dissolved solids load."]',
  '["Jet, soft flow, winch and jigger dyeing machines","Stenters, dryers and curing chambers","Scouring, bleaching and mercerising ranges","Printing and steaming units","Hot water generation for wash stages","Effluent treatment and reject handling"]',
  '["IBR Steam Boiler","Industrial Steam Boiler","Thermic Fluid Heater","Hot Water Generator","Water Treatment Plant","Pollution Control Equipment"]',
  4, 1
),
-- 5. Automotive -----------------------------------------------------------
(
  'automotive',
  'Automotive',
  'Paint Shop, Oven and Utility Engineering for Automotive Manufacturing',
  'Hot water generators, thermic fluid systems, skid-mounted fabrication and pollution control equipment engineered for pretreatment lines, paint bake ovens and washing plant.',
  'Utility and Fabrication Engineering for Automotive Manufacturing',
  'Automotive lines run to takt time, so process heat has to be accurate, available and installable inside a short planned shutdown.',
  '["Automotive and component manufacturing uses process heat in a narrower but no less critical set of places: paint shops, pretreatment and phosphating lines, degreasing tanks, curing and paint bake ovens, and the utilities that support heat treatment.","Paint shop quality is especially sensitive to utility performance. Pretreatment bath temperature, rinse water temperature and oven ramp profiles all sit inside tight windows, and a deviation shows up directly as a visible finish defect rather than as a slow drift in yield.","Automotive plants also run to takt time on lines that are expensive to stop, so utilities are expected to be highly available, quick to restart and instrumented well enough that a developing fault is visible before it halts the line. Fabrication work — skids, ducting, tanks, platforms and structures — is planned around the same short shutdown windows."]',
  '["Narrow temperature windows in pretreatment, phosphating and paint bake stages where a deviation becomes a visible finish defect.","Continuous line operation that leaves only short, planned shutdown windows for utility and fabrication work.","Oil mist, solvent vapour and paint overspray emissions that have to be captured and treated.","Large hot water and hot air demands with a rapid ramp requirement at shift start.","Seasonal variation in incoming water and ambient temperature that unsettles bath control."]',
  '["Steam boilers or hot water generators matched to bath and oven demand with fast, stable response.","Thermic fluid systems for paint bake and curing ovens that need high air temperatures with even distribution.","Skid-mounted and pre-fabricated assemblies so site work fits inside a short planned shutdown.","Pollution control equipment for the solvent, mist and particulate streams from paint and machining areas.","Process water treatment and rinse water recovery to stabilise bath chemistry and cut consumption."]',
  '["Pretreatment and phosphating lines","Paint bake and curing ovens","Degreasing and component washing machines","Heat treatment and quenching support utilities","Compressed air, hot water and process piping networks","Structural fabrication, skids, platforms and ducting"]',
  '["Industrial Steam Boiler","Thermic Fluid Heater","Hot Water Generator","Industrial Fabrication","Industrial Piping","Pollution Control Equipment"]',
  5, 1
),
-- 6. Power ----------------------------------------------------------------
(
  'power',
  'Power',
  'Boiler, High Pressure Piping and Emission Engineering for Power Plants',
  'IBR-compliant boilers, high pressure steam piping, demineralisation plants and flue gas cleaning engineered for captive power and cogeneration installations.',
  'Boiler and Steam Engineering for Power and Cogeneration Plants',
  'In a power plant the boiler is not a support utility — it is the plant, which raises the bar on pressure part design, water chemistry and emissions all at once.',
  '["Power generation and captive cogeneration plants exist to turn fuel into steam and steam into shaft work, so the boiler, its feedwater system and the steam pipework are not a support utility here — they are the plant.","That raises the engineering bar in three directions at once. Pressure parts and high pressure pipework fall squarely under the Indian Boiler Regulations and must be designed, fabricated, welded and tested to approved procedures. Feedwater chemistry has to be controlled far more tightly than in a process plant, because carry-over and dissolved oxygen attack turbine blading and superheater tubes. And emissions from solid or liquid fuel firing are closely regulated.","Captive and cogeneration plants inside a process industry add a further constraint: the same boiler often serves both a turbine and a process steam header, so extraction pressures, pressure reducing stations and load-following behaviour have to be engineered together rather than in isolation."]',
  '["High pressure, high temperature pressure parts and piping subject to statutory IBR design, fabrication and inspection requirements.","Feedwater and steam purity limits far tighter than a process plant, since carry-over damages turbine blading and superheaters.","Flue gas particulate and gaseous emissions from solid and liquid fuel firing held to consent limits.","Load-following duty where one boiler serves both a turbine and a process steam header.","Ash handling, soot blowing and fuel handling systems that must run continuously with minimal manual intervention."]',
  '["IBR-compliant boilers and high pressure steam piping designed, fabricated and tested to approved procedures with full documentation.","Demineralisation and de-aeration plants sized to hold feedwater chemistry inside turbine-grade limits.","Pollution control equipment — multicyclones, bag filters, electrostatic precipitators and scrubbers — matched to the fuel and the consent limits.","Pressure reducing and de-superheating stations so a process header can be served alongside turbine extraction.","Fabricated ducting, structures, ash handling and fuel feed systems engineered as part of the same package."]',
  '["Captive and cogeneration power plants","Steam turbine supply and extraction headers","Boiler feedwater and condensate systems","Flue gas cleaning and stack systems","Fuel handling, ash handling and ducting","Plant-wide high pressure steam distribution"]',
  '["IBR Steam Boiler","Industrial Steam Boiler","Industrial Piping","Industrial Fabrication","Pollution Control Equipment","Water Treatment Plant"]',
  6, 1
)
ON DUPLICATE KEY UPDATE id = id;
