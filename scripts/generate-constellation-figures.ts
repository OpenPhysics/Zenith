/**
 * generate-constellation-figures.ts
 *
 * Builds the full IAU constellation stick-figure tables from Stellarium's
 * western skyculture (HIP polylines) plus cached Hipparcos coordinates.
 *
 * Prerequisites: scripts/data/hip-constellation-stars.json (691 HIPs used by
 * the western culture lines). Re-fetch from VizieR I/239/hip_main if HIP ids
 * change, then re-run this script.
 *
 * Run: npx tsx scripts/generate-constellation-figures.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const SKYCULTURE = join(ROOT, "reference/stellarium-web-engine/apps/test-skydata/skycultures/western/index.json");
const HIP_CACHE = join(SCRIPT_DIR, "data/hip-constellation-stars.json");
const OUT_TS = join(ROOT, "src/zenith-screen/model/ConstellationLines.ts");
const STRINGS = {
  en: join(ROOT, "src/i18n/strings_en.json"),
  fr: join(ROOT, "src/i18n/strings_fr.json"),
  es: join(ROOT, "src/i18n/strings_es.json"),
} as const;

type HipStar = { raHours: number; decDeg: number; mag: number };
type CultureConstellation = {
  iau: string;
  lines: number[][];
  // Stellarium skyculture JSON uses snake_case keys.
  // biome-ignore lint/style/useNamingConvention: matches upstream JSON schema
  common_name: { english: string; native: string };
};

/** Latin → camelCase id (Ursa Major → ursaMajor). */
const toCamelId = (latin: string): string => {
  const parts = latin.trim().split(/\s+/);
  const first = parts[0];
  if (!first) {
    throw new Error(`Empty latin name: ${latin}`);
  }
  return (
    first.toLowerCase() +
    parts
      .slice(1)
      .map((p) => {
        const initial = p.charAt(0);
        if (!initial) {
          return "";
        }
        return initial.toUpperCase() + p.slice(1).toLowerCase();
      })
      .join("")
  );
};

const FR_NAMES: Record<string, string> = {
  andromeda: "Andromède",
  antlia: "Machine pneumatique",
  apus: "Oiseau de paradis",
  aquarius: "Verseau",
  aquila: "Aigle",
  ara: "Autel",
  aries: "Bélier",
  auriga: "Cocher",
  bootes: "Bouvier",
  caelum: "Burin",
  camelopardalis: "Girafe",
  cancer: "Cancer",
  canesVenatici: "Chiens de chasse",
  canisMajor: "Grand Chien",
  canisMinor: "Petit Chien",
  capricornus: "Capricorne",
  carina: "Carène",
  cassiopeia: "Cassiopée",
  centaurus: "Centaure",
  cepheus: "Céphée",
  cetus: "Baleine",
  chamaeleon: "Caméléon",
  circinus: "Compas",
  columba: "Colombe",
  comaBerenices: "Chevelure de Bérénice",
  coronaAustralis: "Couronne australe",
  coronaBorealis: "Couronne boréale",
  corvus: "Corbeau",
  crater: "Coupe",
  crux: "Croix du Sud",
  cygnus: "Cygne",
  delphinus: "Dauphin",
  dorado: "Dorade",
  draco: "Dragon",
  equuleus: "Petit Cheval",
  eridanus: "Éridan",
  fornax: "Fourneau",
  gemini: "Gémeaux",
  grus: "Grue",
  hercules: "Hercule",
  horologium: "Horloge",
  hydra: "Hydre",
  hydrus: "Hydre mâle",
  indus: "Indien",
  lacerta: "Lézard",
  leo: "Lion",
  leoMinor: "Petit Lion",
  lepus: "Lièvre",
  libra: "Balance",
  lupus: "Loup",
  lynx: "Lynx",
  lyra: "Lyre",
  mensa: "Table",
  microscopium: "Microscope",
  monoceros: "Licorne",
  musca: "Mouche",
  norma: "Règle",
  octans: "Octant",
  ophiuchus: "Serpentaire",
  orion: "Orion",
  pavo: "Paon",
  pegasus: "Pégase",
  perseus: "Persée",
  phoenix: "Phénix",
  pictor: "Peintre",
  pisces: "Poissons",
  piscisAustrinus: "Poisson austral",
  puppis: "Poupe",
  pyxis: "Boussole",
  reticulum: "Réticule",
  sagitta: "Flèche",
  sagittarius: "Sagittaire",
  scorpius: "Scorpion",
  sculptor: "Sculpteur",
  scutum: "Écu",
  serpens: "Serpent",
  sextans: "Sextant",
  taurus: "Taureau",
  telescopium: "Télescope",
  triangulum: "Triangle",
  triangulumAustrale: "Triangle austral",
  tucana: "Toucan",
  ursaMajor: "Grande Ourse",
  ursaMinor: "Petite Ourse",
  vela: "Voiles",
  virgo: "Vierge",
  volans: "Poisson volant",
  vulpecula: "Petit Renard",
};

const ES_NAMES: Record<string, string> = {
  andromeda: "Andrómeda",
  antlia: "Máquina Neumática",
  apus: "Ave del Paraíso",
  aquarius: "Acuario",
  aquila: "Águila",
  ara: "Altar",
  aries: "Aries",
  auriga: "Auriga",
  bootes: "Boyero",
  caelum: "Cincel",
  camelopardalis: "Jirafa",
  cancer: "Cáncer",
  canesVenatici: "Lebreles",
  canisMajor: "Can Mayor",
  canisMinor: "Can Menor",
  capricornus: "Capricornio",
  carina: "Quilla",
  cassiopeia: "Casiopea",
  centaurus: "Centauro",
  cepheus: "Cefeo",
  cetus: "Ballena",
  chamaeleon: "Camaleón",
  circinus: "Compás",
  columba: "Paloma",
  comaBerenices: "Cabellera de Berenice",
  coronaAustralis: "Corona Austral",
  coronaBorealis: "Corona Boreal",
  corvus: "Cuervo",
  crater: "Copa",
  crux: "Cruz del Sur",
  cygnus: "Cisne",
  delphinus: "Delfín",
  dorado: "Dorado",
  draco: "Dragón",
  equuleus: "Caballito",
  eridanus: "Erídano",
  fornax: "Horno",
  gemini: "Géminis",
  grus: "Grulla",
  hercules: "Hércules",
  horologium: "Reloj",
  hydra: "Hidra",
  hydrus: "Hidra Macho",
  indus: "Indio",
  lacerta: "Lagarto",
  leo: "Leo",
  leoMinor: "León Menor",
  lepus: "Liebre",
  libra: "Libra",
  lupus: "Lobo",
  lynx: "Lince",
  lyra: "Lira",
  mensa: "Mesa",
  microscopium: "Microscopio",
  monoceros: "Unicornio",
  musca: "Mosca",
  norma: "Escuadra",
  octans: "Octante",
  ophiuchus: "Ofiuco",
  orion: "Orión",
  pavo: "Pavo",
  pegasus: "Pegaso",
  perseus: "Perseo",
  phoenix: "Fénix",
  pictor: "Pintor",
  pisces: "Piscis",
  piscisAustrinus: "Pez Austral",
  puppis: "Popa",
  pyxis: "Brújula",
  reticulum: "Retículo",
  sagitta: "Flecha",
  sagittarius: "Sagitario",
  scorpius: "Escorpión",
  sculptor: "Escultor",
  scutum: "Escudo",
  serpens: "Serpiente",
  sextans: "Sextante",
  taurus: "Tauro",
  telescopium: "Telescopio",
  triangulum: "Triángulo",
  triangulumAustrale: "Triángulo Austral",
  tucana: "Tucán",
  ursaMajor: "Osa Mayor",
  ursaMinor: "Osa Menor",
  vela: "Velas",
  virgo: "Virgo",
  volans: "Pez Volador",
  vulpecula: "Zorra",
};

const culture = JSON.parse(readFileSync(SKYCULTURE, "utf8")) as {
  constellations: CultureConstellation[];
};
const hipCache = JSON.parse(readFileSync(HIP_CACHE, "utf8")) as {
  stars: Record<string, HipStar>;
};

const figures = culture.constellations.map((c) => {
  const id = toCamelId(c.common_name.native);
  const segments: { fromId: string; toId: string }[] = [];
  for (const line of c.lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const from = line[i];
      const to = line[i + 1];
      if (from === undefined || to === undefined) {
        continue;
      }
      segments.push({ fromId: `hip${from}`, toId: `hip${to}` });
    }
  }
  return {
    id,
    iau: c.iau,
    latin: c.common_name.native,
    english: c.common_name.english,
    segments,
  };
});

figures.sort((a, b) => a.id.localeCompare(b.id));

const usedHips = new Set<string>();
for (const figure of figures) {
  for (const segment of figure.segments) {
    usedHips.add(segment.fromId.slice(3));
    usedHips.add(segment.toId.slice(3));
  }
}

const missing = [...usedHips].filter((hip) => !(hip in hipCache.stars));
if (missing.length > 0) {
  throw new Error(`Missing HIP coords for: ${missing.slice(0, 20).join(", ")}`);
}

const idUnion = figures.map((f) => `"${f.id}"`).join("\n  | ");

const starEntries = [...usedHips]
  .sort((a, b) => Number(a) - Number(b))
  .map((hip) => {
    const star = hipCache.stars[hip];
    if (!star) {
      throw new Error(`Missing HIP ${hip} after earlier check`);
    }
    return `  hip${hip}: { id: "hip${hip}", raHours: ${star.raHours}, decDeg: ${star.decDeg} }`;
  });

const figureBlocks = figures.map((f) => {
  const segs = f.segments.map((s) => `      { fromId: "${s.fromId}", toId: "${s.toId}" }`).join(",\n");
  return `  {\n    id: "${f.id}",\n    segments: [\n${segs},\n    ],\n  }`;
});

const ts = `/**
 * ConstellationLines.ts
 *
 * Stick-figure segments for all 88 IAU constellations (Stellarium western
 * skyculture polylines). Stars are keyed by Hipparcos id (\`hipNNNN\`) with
 * J1991.25 equatorial coordinates from VizieR I/239/hip_main — close enough
 * to J2000 for classroom FOV stick figures.
 *
 * @generated by scripts/generate-constellation-figures.ts — do not edit by hand.
 */

export type ConstellationId =
  | ${idUnion};

export type ConstellationStar = {
  readonly id: string;
  readonly raHours: number;
  readonly decDeg: number;
};

export type ConstellationSegment = {
  readonly fromId: string;
  readonly toId: string;
};

export type ConstellationFigure = {
  readonly id: ConstellationId;
  readonly segments: readonly ConstellationSegment[];
};

/** Stars referenced by constellation stick figures (not labeled in the UI). */
export const CONSTELLATION_STARS: Readonly<Record<string, ConstellationStar>> = {
${starEntries.join(",\n")},
};

export const constellationStarById = (id: string): ConstellationStar | undefined => CONSTELLATION_STARS[id];

/** Full IAU set — 88 constellations. */
export const CONSTELLATION_FIGURES: readonly ConstellationFigure[] = [
${figureBlocks.join(",\n")},
];
`;

writeFileSync(OUT_TS, ts);

const enNames: Record<string, string> = {};
const frNames: Record<string, string> = {};
const esNames: Record<string, string> = {};
for (const f of figures) {
  enNames[f.id] = f.latin;
  frNames[f.id] = FR_NAMES[f.id] ?? f.latin;
  esNames[f.id] = ES_NAMES[f.id] ?? f.latin;
  if (!(f.id in FR_NAMES && f.id in ES_NAMES)) {
    console.warn(`Missing FR/ES name for ${f.id}`);
  }
}

for (const [locale, path] of Object.entries(STRINGS)) {
  const json = JSON.parse(readFileSync(path, "utf8")) as {
    constellations: Record<string, string>;
  };
  json.constellations = locale === "en" ? enNames : locale === "fr" ? frNames : esNames;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

console.log(`Wrote ${figures.length} figures, ${usedHips.size} stars → ${OUT_TS}`);
console.log("Updated constellation strings in en/fr/es.");
