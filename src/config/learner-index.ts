/**
 * Learner Index - Single Source of Truth
 *
 * Canonical learner list (48 learners) sourced from class_list.csv.
 * Includes all known attendance name aliases observed across all Zoom CSV reports.
 *
 * Last updated: 2026-03-03
 */

export interface LearnerRecord {
  /** Canonical full name as in class_list.csv */
  canonicalName: string;
  /** Primary email from class_list.csv */
  email: string;
  /** Canvas LMS student ID (from learner progress report) */
  canvasId?: number;
  /** All known attendance display-name aliases (Zoom name variations) */
  attendanceAliases: string[];
}

/**
 * 48 canonical learners with all known Zoom attendance aliases.
 * Aliases are matched case-insensitively during parsing.
 */
export const LEARNER_INDEX: LearnerRecord[] = [
  // ── Female learners ──────────────────────────────────────────────────────

  {
    canonicalName: "Priscilla Dardey",
    email: "priscadardey2905@gmail.com",
    canvasId: 113383,
    attendanceAliases: ["Priscilla Dardey"],
  },
  {
    canonicalName: "Sandra Ayovi Afanoukoe",
    email: "sandraxolali382@gmail.com",
    canvasId: 113384,
    attendanceAliases: ["Sandra Ayovi Afanoukoe", "Sandra Afanoukoe"],
  },
  {
    canonicalName: "Stephanie Huno",
    email: "stephanie.huno21@gmail.com",
    canvasId: 113385,
    attendanceAliases: ["Stephanie Huno"],
  },
  {
    canonicalName: "Windywell Adjei",
    email: "awindywell@gmail.com",
    canvasId: 113386,
    attendanceAliases: ["Windywell Adjei"],
  },
  {
    canonicalName: "Bamuah Zenab",
    email: "bamuahzenab2@gmail.com",
    canvasId: 113556,
    attendanceAliases: [
      "Bamuah Zenab",
      "Bamuah ZenabBamuah Zenab", // Zoom concatenated-repeat bug
      "Bamuah ZenabBamuah Zenab ",
    ],
  },
  {
    canonicalName: "Beatrice Appiah Annan",
    email: "beatriceannan951@gmail.com",
    canvasId: 113418,
    attendanceAliases: [
      "Beatrice Appiah Annan",
      "Beatrice Annan",
      "Beatrice's Smart Noter", // Beatrice's secondary device / smart noter app
    ],
  },
  {
    canonicalName: "Bless Tahima Alhassan",
    email: "blesstahima@gmail.com",
    canvasId: 113387,
    attendanceAliases: ["Bless Tahima Alhassan", "Bless Tahima"],
  },
  {
    canonicalName: "Ellen Blessing Boafo",
    email: "boafoellen52@gmail.com",
    canvasId: 113388,
    attendanceAliases: [
      "Ellen Blessing Boafo",
      "Ellen Boafo",
      "Ellen Blessing Boafo (Ellen Boafo)",
    ],
  },
  {
    canonicalName: "Emmanuella Animwaa Kumah",
    email: "e.animwaa.kumah@gmail.com",
    canvasId: 113389,
    attendanceAliases: ["Emmanuella Animwaa Kumah", "Emmanuella"],
  },
  {
    canonicalName: "Georgina Obeng Adebi",
    email: "marbella914u@gmail.com",
    canvasId: 113390,
    attendanceAliases: [
      "Georgina Obeng Adebi",
      "Georgina Boateng", // used maiden/prior surname in Zoom
      "Georgina Obeng Adebi (Georgina Boateng)",
    ],
  },
  {
    canonicalName: "Linda Anima Ohene",
    email: "lindaanima270@gmail.com",
    canvasId: 113391,
    attendanceAliases: ["Linda Anima Ohene"],
  },
  {
    canonicalName: "Linda Princess Babenaly Kipo",
    email: "kipolina154@gmail.com",
    canvasId: 113702,
    attendanceAliases: [
      "Linda Princess Babenaly Kipo",
      "kipo linda",
      "Kipo Linda Princess Babenaly",
    ],
  },
  {
    canonicalName: "Ohemaa Abena Gyanewaa Dzudzonu",
    email: "ohemaaabenadzudzonu@gmail.com",
    canvasId: 113392,
    attendanceAliases: [
      "Ohemaa Abena Gyanewaa Dzudzonu",
      "Ohemaa Abena Dzudzonu",
    ],
  },
  {
    canonicalName: "Ruweida Suhuyini Abdul Rasheed",
    email: "rasheedruweida@gmail.com",
    canvasId: 113393,
    attendanceAliases: ["Ruweida Suhuyini Abdul Rasheed", "Ruweida Rashid"],
  },
  {
    canonicalName: "Vera Dede Edjameh",
    email: "veracityberkai@gmail.com",
    canvasId: 113925,
    attendanceAliases: [
      "Vera Dede Edjameh",
      "Edjameh Vera Dede",
      "Edjameh Vera Dede )",
      "Edjameh Vera Dede(01222092D)(B)", // student ID embedded in Zoom name
      "Edjameh Vera Dede (Edjameh Vera Dede(01222092D)(B))",
    ],
  },
  {
    canonicalName: "Gifty Adankai",
    email: "giftyadankai1@gmail.com",
    canvasId: 113797,
    attendanceAliases: ["Gifty Adankai"],
  },
  {
    canonicalName: "Amanda Tsatsu",
    email: "tmandy025@gmail.com",
    canvasId: 113915,
    attendanceAliases: [
      "Amanda Tsatsu",
      "Mandy T.", // shortened informal name
    ],
  },
  {
    canonicalName: "Richard Owusu",
    email: "ROwusu2030@gmail.com",
    canvasId: 113798,
    attendanceAliases: ["Richard Owusu"],
  },

  // ── Male learners ─────────────────────────────────────────────────────────

  {
    canonicalName: "Prosper Mawunya Nudekor",
    email: "prosper3mn@gmail.com",
    canvasId: 113600,
    attendanceAliases: ["Prosper Mawunya Nudekor"],
  },
  {
    canonicalName: "Redeemer Mawunyo Kobla Quist",
    email: "quistredeemer9@gmail.com",
    canvasId: 113394,
    attendanceAliases: ["Redeemer Mawunyo Kobla Quist", "Redeemer Quist"],
  },
  {
    canonicalName: "Samuel Amofa Amoateng",
    email: "ascurtisse@gmail.com",
    canvasId: 113395,
    attendanceAliases: ["Samuel Amofa Amoateng"],
  },
  {
    canonicalName: "Samuel Tenkorang Osarfo",
    email: "smlosafo@gmail.com",
    canvasId: 113396,
    attendanceAliases: ["Samuel Tenkorang Osarfo"],
  },
  {
    canonicalName: "Sebastien Kojo Sternberg",
    email: "sternbergseb461@gmail.com",
    canvasId: 113397,
    attendanceAliases: ["Sebastien Kojo Sternberg", "Sebastien Sternberg"],
  },
  {
    canonicalName: "Semanu Kwaku Sebuava",
    email: "semanusebuava@gmail.com",
    canvasId: 113398,
    attendanceAliases: ["Semanu Kwaku Sebuava", "Semanu Sebuava"],
  },
  {
    canonicalName: "Spencer Nii Odai Ashong",
    email: "spencerash000@gmail.com",
    canvasId: 113399,
    attendanceAliases: ["Spencer Nii Odai Ashong", "Spencer Ashong"],
  },
  {
    canonicalName: "Stephen Delali Amankwa",
    email: "amankwastephen06@gmail.com",
    canvasId: 113400,
    attendanceAliases: ["Stephen Delali Amankwa", "Stephen Amankwa"],
  },
  {
    canonicalName: "Vine Volsugka Kelwini",
    email: "vinekelwini8@gmail.com",
    canvasId: 113401,
    attendanceAliases: [
      "Vine Volsugka Kelwini",
      "Vine Kelwini",
      "Vine Volsugka Kelwini (Vine Kelwini)",
    ],
  },
  {
    canonicalName: "Williams Atabisa",
    email: "atabisa.swe@gmail.com",
    canvasId: 113402,
    attendanceAliases: ["Williams Atabisa"],
  },
  {
    canonicalName: "Asanga Emmanuel Atiah",
    email: "emmanuelasanga46@gmail.com",
    canvasId: 113403,
    attendanceAliases: [
      "Asanga Emmanuel Atiah",
      "Emmanuel Asanga",
      "Emmanuel Asanga Atiah",
    ],
  },
  {
    canonicalName: "Bernard Kwaku Duah",
    email: "kwakuduahbernard136@gmail.com",
    canvasId: 113404,
    attendanceAliases: ["Bernard Kwaku Duah"],
  },
  {
    canonicalName: "Bismark Akwah",
    email: "bismarkakwah86@gmail.com",
    canvasId: 113405,
    attendanceAliases: ["Bismark Akwah"],
  },
  {
    canonicalName: "Carl Jesse Senanu Dogbey",
    email: "carljesseee@gmail.com",
    canvasId: 113490,
    attendanceAliases: ["Carl Jesse Senanu Dogbey", "Carl Jesse"],
  },
  {
    canonicalName: "Christian Kafui Kwasi Dzakpasu",
    email: "christian.dzakpasu@stu.ucc.edu.gh",
    canvasId: 113406,
    attendanceAliases: ["Christian Kafui Kwasi Dzakpasu", "Christian Dzakpasu"],
  },
  {
    canonicalName: "Elias Adams Aboagye",
    email: "eliasaboagye@gmail.com",
    canvasId: 113407,
    attendanceAliases: ["Elias Adams Aboagye"],
  },
  {
    canonicalName: "Festus Acquah",
    email: "festusacquah51@gmail.com",
    canvasId: 113408,
    attendanceAliases: ["Festus Acquah"],
  },
  {
    canonicalName: "Henry Cobbinah",
    email: "henricobb2@gmail.com",
    canvasId: 113409,
    attendanceAliases: ["Henry Cobbinah"],
  },
  {
    canonicalName: "John David Dagadu",
    email: "johndaviddagadu@gmail.com",
    canvasId: 113410,
    attendanceAliases: ["John David Dagadu"],
  },
  {
    canonicalName: "Kwaku Abednego Lamptey",
    email: "qweikujake@gmail.com",
    canvasId: 113411,
    attendanceAliases: ["Kwaku Abednego Lamptey"],
  },
  {
    canonicalName: "Mohammed Jawad Nassam",
    email: "jawadx176@gmail.com",
    canvasId: 113412,
    attendanceAliases: ["Mohammed Jawad Nassam", "Jawad Nassam"],
  },
  {
    canonicalName: "Philemon Ansah",
    email: "philemonansah45@gmail.com",
    canvasId: 113413,
    attendanceAliases: ["Philemon Ansah"],
  },
  {
    canonicalName: "Raphael Tibil Punobyin",
    email: "tipraph@gmail.com",
    canvasId: 113414,
    attendanceAliases: ["Raphael Tibil Punobyin", "RAPHAEL PUNOBYIN"],
  },
  {
    canonicalName: "Salahudeen Abdul-Moomin",
    email: "abdulmoominsolaahuddeen@gmail.com",
    canvasId: 113661,
    attendanceAliases: ["Salahudeen Abdul-Moomin", "Salahudeen Abdul moomin"],
  },
  {
    canonicalName: "Sampson Aidoo",
    email: "samqwame10@gmail.com",
    canvasId: 113415,
    attendanceAliases: ["Sampson Aidoo", "Sampson", "Sampson Aidoo (Samqwame)"],
  },
  {
    canonicalName: "Samuel Kofi Asante",
    email: "asantesamuelkofi@icloud.com",
    canvasId: 113416,
    attendanceAliases: [
      "Samuel Kofi Asante",
      "Samuel Kofi Asante 9001923", // student ID appended as suffix
      "Samuel Kofi Asante (Samuel Kofi Asante 9001923)",
    ],
  },
  {
    canonicalName: "Zakariya Umar",
    email: "zarkumar1221@gmail.com",
    canvasId: 113426,
    attendanceAliases: ["Zakariya Umar"],
  },
  {
    canonicalName: "Kelvit Aduo",
    email: "kelvitaduo@gmail.com",
    canvasId: 113417,
    attendanceAliases: ["Kelvit Aduo"],
  },
  {
    canonicalName: "Kenneth Marful",
    email: "kennethmarful42@gmail.com",
    canvasId: 113796,
    attendanceAliases: ["Kenneth Marful"],
  },
  {
    canonicalName: "Kwame Arhin Kwarteng",
    email: "arhinkwarteng2005@gmail.com",
    canvasId: 113914,
    attendanceAliases: ["Kwame Arhin Kwarteng", "Arhin Kwarteng"],
  },
];

// ── Helper: resolve a raw attendance name → canonical learner ─────────────

/** Build a case-insensitive alias → canonical-name lookup map at module load */
const _aliasMap = new Map<string, string>();
for (const learner of LEARNER_INDEX) {
  for (const alias of learner.attendanceAliases) {
    _aliasMap.set(alias.toLowerCase().trim(), learner.canonicalName);
  }
  // Also add canonical name itself
  _aliasMap.set(
    learner.canonicalName.toLowerCase().trim(),
    learner.canonicalName,
  );
}

/**
 * Resolve a raw Zoom attendance name to the canonical learner name.
 * Returns `null` if no mapping exists (the name is unknown / not in class).
 */
export function resolveAttendanceName(rawName: string): string | null {
  const key = rawName
    .replace(/\([^)]*\)/g, "") // strip parenthetical suffixes
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return _aliasMap.get(key) ?? null;
}

/**
 * Look up a learner by canonical name.
 */
export function getLearnerByName(
  canonicalName: string,
): LearnerRecord | undefined {
  return LEARNER_INDEX.find(
    (l) => l.canonicalName.toLowerCase() === canonicalName.toLowerCase(),
  );
}

/**
 * Look up a learner by email address (case-insensitive).
 */
export function getLearnerByEmail(email: string): LearnerRecord | undefined {
  return LEARNER_INDEX.find(
    (l) => l.email.toLowerCase() === email.toLowerCase(),
  );
}

/**
 * Names that appeared in Zoom attendance CSVs but are NOT in the class list.
 * These should be ignored during attendance processing.
 */
export const NON_CLASS_ATTENDEES: string[] = [
  // Instructor
  "Christian Solomon",
  // Non-enrolled attendees
  "Richard Korankye",
  "Tahiru Shaibu",
  "Zenab (Tahiru Shaibu)",
  "Osman Bashiru",
  "Bernice Awinpang",
  "Blessing Naa Amarteley Laryea",
  "Prince Ortsin",
  "Tedlee Nino Appiah-Kubi",
  "Michael Kuda",
  "Precious Amenuveve Tsewoo",
];
