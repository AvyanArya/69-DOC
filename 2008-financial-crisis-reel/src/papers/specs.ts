/**
 * Front pages used in the opening "newspaper explosion".
 *
 * IMPORTANT — authenticity: these are STYLISED RECREATIONS, not real newspapers. The mastheads are
 * invented and every page carries "ILLUSTRATIVE EDITION" in its folio line. The headlines and copy
 * describe real, verifiable events of September 2008. The photographs printed on them are genuine
 * archival pictures (see CREDITS.md). The genuine news pages in the film are the Wikinews Print
 * Editions (see WIKINEWS below), which are reproduced unaltered apart from being printed in black
 * and white on a paper texture.
 */
export type PaperSpec = {
  id: string;
  masthead: string;
  mast: "gothic" | "serif" | "caps" | "slab";
  mastSize: number;
  texture: "a" | "b" | "c";
  date: string;
  kicker?: string;
  /** each headline line is fitted to the full measure */
  headline: { text: string; size: number }[];
  headFont: "serif" | "impact" | "news";
  deck: string;
  photo: string;
  photoH: number;
  caption: string;
  layout: "wide" | "split" | "tabloid";
  body: string[];
  side: { head: string; text: string }[];
};

export const PAGE_W = 800;
export const PAGE_H = 1220;
export const WIKI_H = 1035;

const P = {
  lehman1:
    "NEW YORK — Lehman Brothers Holdings Inc., the fourth-largest investment bank in the United States, filed for Chapter 11 bankruptcy protection early Monday after weekend talks to find a buyer collapsed.",
  lehman2:
    "The 158-year-old firm listed $639 billion in assets and $613 billion in debts, making it the largest bankruptcy filing in American history.",
  lehman3:
    "Senior bankers and regulators had met through the weekend at the Federal Reserve Bank of New York. Barclays and Bank of America both walked away from a deal for Lehman after the government declined to provide financial backing.",
  merrill:
    "The filing came hours after Bank of America agreed to buy Merrill Lynch for about $50 billion, ending 94 years of independence for the brokerage, and as the insurer American International Group sought emergency funding.",
  markets:
    "Stock markets around the world fell sharply as investors weighed which institution might be next. In New York the Dow Jones industrial average dropped 504 points, its steepest one-day fall since September 2001.",
  housing:
    "The firm's troubles trace back to the collapse of the American housing market. Lehman held tens of billions of dollars in real-estate assets and mortgage-backed securities whose value fell steeply as borrowers defaulted.",
  staff:
    "Employees were seen leaving the bank's Manhattan headquarters carrying boxes of belongings. About 25,000 people worked for the firm worldwide.",
  central:
    "Central banks moved to steady the financial system, pumping tens of billions of dollars into money markets as lending between banks slowed.",
  aig:
    "WASHINGTON — The Federal Reserve agreed late Tuesday to lend up to $85 billion to American International Group in exchange for a stake of nearly 80 percent, taking control of one of the world's largest insurers.",
  aig2:
    "Officials concluded that a disorderly failure of the insurer, which had written protection on hundreds of billions of dollars of mortgage-linked debt, could deepen an already fragile market.",
  money:
    "A large money-market fund said its shares had fallen below one dollar after losses on Lehman debt, an event known as breaking the buck, and investors rushed to withdraw cash from similar funds.",
  bailout:
    "WASHINGTON — The Treasury asked Congress for authority to spend up to $700 billion buying troubled mortgage assets from banks, the largest financial rescue proposed in the nation's history.",
  vote:
    "WASHINGTON — The House of Representatives rejected the $700 billion rescue plan on Monday. The Dow Jones industrial average fell 777 points, the largest one-day point decline on record.",
};

const body = (...keys: (keyof typeof P)[]) => keys.map((k) => P[k]);

export const PAPERS: PaperSpec[] = [
  {
    id: "hero",
    masthead: "The Financial Record",
    mast: "gothic",
    mastSize: 66,
    texture: "a",
    date: "MONDAY, SEPTEMBER 15, 2008",
    kicker: "CRISIS ON WALL STREET",
    headline: [
      { text: "LEHMAN BROTHERS", size: 77 },
      { text: "FILES FOR BANKRUPTCY", size: 58 },
    ],
    headFont: "serif",
    deck: "158-year-old investment bank collapses with $613 billion in debts · Merrill Lynch sold to Bank of America · A.I.G. seeks emergency funds",
    photo: "n_lehman_day",
    photoH: 372,
    caption: "Lehman Brothers' headquarters at 745 Seventh Avenue, New York. Photograph: David Shankbone (CC BY-SA 3.0).",
    layout: "split",
    body: body("lehman1", "lehman2", "lehman3", "merrill", "markets", "housing", "staff", "central"),
    side: [
      { head: "Merrill Lynch sold in $50 billion deal", text: P.merrill },
      { head: "Central banks flood markets with cash", text: P.central },
      { head: "How the housing bust reached Wall Street", text: P.housing },
    ],
  },
  {
    id: "courier",
    masthead: "THE MARKET COURIER",
    mast: "serif",
    mastSize: 58,
    texture: "b",
    date: "TUESDAY, SEPTEMBER 16, 2008",
    kicker: "WORST DAY SINCE 2001",
    headline: [
      { text: "WALL STREET", size: 112 },
      { text: "IN CRISIS", size: 138 },
    ],
    headFont: "serif",
    deck: "Dow plunges 504 points after Lehman Brothers fails and Merrill Lynch is sold",
    photo: "n_wall_street",
    photoH: 400,
    caption: "Wall Street and the New York Stock Exchange, 16 September 2008. Photograph: elbpresse.de (CC BY-SA 4.0).",
    layout: "wide",
    body: body("markets", "lehman1", "lehman2", "central", "housing", "merrill", "staff", "lehman3"),
    side: [],
  },
  {
    id: "dispatch",
    masthead: "The Capital Dispatch",
    mast: "gothic",
    mastSize: 62,
    texture: "c",
    date: "MONDAY, SEPTEMBER 15, 2008",
    kicker: "A WEEKEND THAT REMADE WALL STREET",
    headline: [
      { text: "MERRILL LYNCH SOLD", size: 84 },
      { text: "IN $50 BILLION DEAL", size: 80 },
    ],
    headFont: "news",
    deck: "Bank of America buys the brokerage as Lehman Brothers heads for bankruptcy court",
    photo: "n_nyse_flag",
    photoH: 420,
    caption: "The New York Stock Exchange, September 2008. Photograph: Roland Weber (CC BY 3.0).",
    layout: "split",
    body: body("merrill", "lehman1", "lehman3", "markets", "central", "lehman2", "housing", "staff"),
    side: [
      { head: "Lehman files for Chapter 11", text: P.lehman2 },
      { head: "Insurer A.I.G. seeks a lifeline", text: P.aig2 },
    ],
  },
  {
    id: "ledger",
    masthead: "THE WORLD LEDGER",
    mast: "caps",
    mastSize: 60,
    texture: "a",
    date: "WEDNESDAY, SEPTEMBER 17, 2008",
    kicker: "GOVERNMENT TAKES CONTROL OF INSURER",
    headline: [
      { text: "FED RESCUES A.I.G.", size: 92 },
      { text: "WITH $85 BILLION LOAN", size: 76 },
    ],
    headFont: "serif",
    deck: "Central bank takes a stake of nearly 80 percent a day after letting Lehman Brothers fail",
    photo: "n_crews",
    photoH: 380,
    caption: "News crews outside Lehman Brothers, New York, 15 September 2008. Photograph: Robert Scoble (CC BY 2.0).",
    layout: "wide",
    body: body("aig", "aig2", "money", "markets", "central", "lehman2", "housing", "merrill"),
    side: [],
  },
  {
    id: "metro",
    masthead: "METRO JOURNAL",
    mast: "slab",
    mastSize: 74,
    texture: "b",
    date: "TUESDAY, SEPTEMBER 16, 2008",
    headline: [{ text: "MELTDOWN", size: 236 }],
    headFont: "impact",
    deck: "Lehman gone. Merrill sold. Markets reel.",
    photo: "n_floor",
    photoH: 470,
    caption: "The trading floor of the New York Stock Exchange. Photograph: Carol M. Highsmith / Library of Congress.",
    layout: "tabloid",
    body: body("markets", "lehman1", "merrill", "central"),
    side: [],
  },
  {
    id: "broadsheet",
    masthead: "The Daily Broadsheet",
    mast: "gothic",
    mastSize: 60,
    texture: "c",
    date: "THURSDAY, SEPTEMBER 18, 2008",
    kicker: "LENDING BETWEEN BANKS DRIES UP",
    headline: [
      { text: "MARKETS", size: 150 },
      { text: "IN TURMOIL", size: 124 },
    ],
    headFont: "serif",
    deck: "Money-market fund 'breaks the buck' as fear spreads from Wall Street to the world",
    photo: "n_london",
    photoH: 400,
    caption: "Lehman Brothers' European headquarters, Canary Wharf, London, 16 September 2008. Photograph: conorwithonen (CC BY 2.0).",
    layout: "split",
    body: body("money", "markets", "central", "aig", "housing", "lehman2", "staff", "aig2"),
    side: [
      { head: "Fed takes control of A.I.G.", text: P.aig },
      { head: "Where the losses began", text: P.housing },
    ],
  },
  {
    id: "gazette",
    masthead: "THE REPUBLIC GAZETTE",
    mast: "serif",
    mastSize: 54,
    texture: "a",
    date: "SATURDAY, SEPTEMBER 20, 2008",
    kicker: "TREASURY ASKS CONGRESS TO ACT",
    headline: [
      { text: "U.S. PLANS", size: 124 },
      { text: "$700 BILLION BAILOUT", size: 74 },
    ],
    headFont: "news",
    deck: "The largest financial rescue ever proposed would buy troubled mortgage assets from banks",
    photo: "n_bush",
    photoH: 390,
    caption: "President Bush with Treasury Secretary Paulson and Fed Chairman Bernanke, 19 September 2008. White House photograph: Joyce N. Boghosian.",
    layout: "wide",
    body: body("bailout", "aig", "money", "markets", "housing", "central", "lehman2", "aig2"),
    side: [],
  },
  {
    id: "city",
    masthead: "CITY & FINANCE",
    mast: "caps",
    mastSize: 66,
    texture: "b",
    date: "TUESDAY, SEPTEMBER 30, 2008",
    kicker: "HOUSE REJECTS RESCUE PLAN",
    headline: [
      { text: "DOW PLUNGES", size: 112 },
      { text: "777 POINTS", size: 126 },
    ],
    headFont: "serif",
    deck: "Largest one-day point drop on record after lawmakers vote down the $700 billion bailout",
    photo: "n_lehman_night",
    photoH: 400,
    caption: "Lehman Brothers' headquarters on the night of 15 September 2008. Photograph: Robert Scoble (CC BY 2.0).",
    layout: "split",
    body: body("vote", "bailout", "markets", "money", "central", "aig", "housing", "lehman2"),
    side: [
      { head: "What the rescue plan would do", text: P.bailout },
      { head: "A month that shook finance", text: P.lehman2 },
    ],
  },
];

/** Genuine archival pages: Wikinews Print Edition, page 1 (CC BY 2.5, Wikinews contributors). */
export const WIKINEWS = ["17sep2008", "16sep2008", "18sep2008", "25sep2008", "26sep2008"];

/** Hero headline box in page coordinates (px on the 800-wide page) – the camera and the red circle aim here. */
export const HERO_HEAD = { x: 34, y: 182, w: 732, h: 119 };
