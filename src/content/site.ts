// All portfolio content lives here. Facts come from jomariexe.me and github.com/jarreugse09.
// Fields set to null are unknown: fill them in rather than inventing them.

export const person = {
  name: "Jomarie Esguerra",
  fullName: "Jomarie D. Esguerra",
  handle: "jomariexe",
  role: "Full-Stack Developer",
  location: "Manila, Philippines",
  timezone: "Asia/Manila",
  email: "jomariexesguerra@gmail.com",
  portrait: "/images/joms.webp",
  line: "Transforming brilliant ideas into tangible necessity.",
  socials: [
    { label: "GitHub", href: "https://github.com/jarreugse09", handle: "jarreugse09" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/jomarie-esguerra-844b893a3/", handle: "jomarie-esguerra" },
    { label: "Facebook", href: "https://www.facebook.com/jarreugse/", handle: "jarreugse" },
    { label: "Instagram", href: "https://www.instagram.com/mojojomss/", handle: "mojojomss" },
  ],
} as const;

export type Experience = {
  org: string;
  role: string;
  kind: "Internship" | "Freelance" | "Client project";
  location: string | null;
  start: string | null; // "MM.YYYY"
  end: string | null;   // "MM.YYYY" or "Present"
  period?: string;      // exact dates as written by the owner; shown instead of start–end
  length?: string;      // exact duration as written by the owner; shown instead of the computed one
  summary?: string;
  points: string[];
  stack: string[];
  href?: string;
  placeholder?: boolean; // true = owner still needs to fill this in
};

export const experience: Experience[] = [
  {
    org: "Musa-Binagatan Law Office (RMB Law Office)",
    role: "Full-Stack Developer Intern",
    kind: "Internship",
    location: "Imus, Cavite, Philippines",
    start: "02.2026",
    end: "05.2026",
    period: "Feb 2 – May 15, 2026",
    length: "3 months, 2 weeks",
    points: [
      "Built and shipped the firm's official site in Next.js and TypeScript on its own domain (rmblawph.com): attorney and paralegal profiles, contact and consultation booking, plus privacy, terms and disclaimer pages.",
      "Built RMBot, a Gemini-powered assistant embedded in the site that answers visitor questions.",
      "Contributed to Setmona, a MERN booking platform, across scheduling, staff and service management, and admin tools.",
      "Ran deployments on Vercel and Render, configured custom domains and DNS, and handled the office's IT support.",
    ],
    stack: ["Next.js", "React", "TypeScript", "JavaScript", "Node.js", "Express", "MongoDB", "Tailwind CSS", "Gemini AI", "Git", "Vercel", "Render"],
    href: "https://rmblawph.vercel.app/",
  },
  {
    org: "BYD Alabang",
    role: "Freelance Web Developer",
    kind: "Freelance",
    location: "Remote · Philippines",
    start: "06.2026",
    end: "07.2026",
    period: "Jun – Jul 2026",
    length: "About 2 months",
    summary: "Automotive dealership website.",
    points: [
      "Designed, built, and deployed the dealership's site end to end with Next.js and Tailwind CSS, live at bydalabang.com.",
      "Built a showroom of 15 model pages, from the Seagull to the Tang DM-i, each with specs, pricing, color variants, and a gallery.",
      "Built a multi-step quotation form (personal info, model, location) with a confirm-email check, delivered to the sales team over SMTP.",
      "Added a car-loan application page with requirements per applicant type (locally employed, OFW/seafarer, business owner) and a downloadable form.",
      "Set up per-page titles and SEO metadata, with mobile-first layouts throughout.",
    ],
    stack: ["Next.js", "React", "JavaScript", "Tailwind CSS", "SMTP", "Vercel", "Git"],
    href: "https://bydalabang.com",
  },
];

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  width: number;
  height: number;
  stack: string[];
  live?: string;
  repo?: string;
};

export const projects: Project[] = [
  {
    slug: "setmona",
    name: "Setmona",
    tagline: "A modular SaaS for running a business",
    description:
      "Centralizes business operations, monitoring systems, and organizational management into one platform: bookings calendar, services, staff, payments, and analytics.",
    image: "/images/projects/setmona.webp",
    width: 1600, height: 924,
    stack: ["TypeScript", "React", "Node.js", "Express", "MongoDB"],
    live: "https://setmona.vercel.app/",
  },
  {
    slug: "rmb-law",
    name: "RMB Law",
    tagline: "Law firm website with an AI assistant",
    description:
      "The firm's official site: legal services, brand identity, and contact information, with an integrated Gemini chatbot that answers visitor questions.",
    image: "/images/projects/rmb_law.webp",
    width: 1600, height: 769,
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Gemini AI"],
    live: "https://rmblawph.vercel.app/",
  },
  {
    slug: "byd-alabang",
    name: "BYD Alabang",
    tagline: "Car dealership catalogue",
    description:
      "Browse BYD vehicles, compare specifications, request quotations, submit applications, and find the dealership.",
    image: "/images/projects/bydalabang.webp",
    width: 1600, height: 931,
    stack: ["Next.js", "React", "JavaScript", "Tailwind CSS"],
    live: "https://bydalabang.com",
  },
  {
    slug: "tupasok",
    name: "TUPasok",
    tagline: "QR visitor management for TUP",
    description:
      "QR-based visitor management system for the university, with a dashboard for managing visitor records.",
    image: "/images/projects/tup_vms.webp",
    width: 1600, height: 1047,
    stack: ["TypeScript", "React", "Node.js", "Express", "Tailwind CSS"],
    live: "https://tupasok.vercel.app/",
    repo: "https://github.com/jarreugse09/TUP-VMS-Frontend",
  },
  {
    slug: "perps",
    name: "Perps",
    tagline: "Campus chatbot",
    description: "A personal chatbot for the University of Perpetual Help, Molino campus, built on Gemini AI.",
    image: "/images/projects/perps_bot.webp",
    width: 1600, height: 763,
    stack: ["Gemini AI", "TypeScript", "Node.js", "MongoDB", "React", "Tailwind CSS"],
    live: "https://uphmc-chatbot.vercel.app/",
    repo: "https://github.com/jarreugse09/Perpetual-Chatbot",
  },
  {
    slug: "ai-see",
    name: "AI-SEE",
    tagline: "Real-time hide-face detection",
    description: "Detects in real time whether a face is bare or covered, using a YOLO model behind a Flask app.",
    image: "/images/projects/ai_see.webp",
    width: 1600, height: 817,
    stack: ["Python", "Flask", "YOLO", "JavaScript"],
    repo: "https://github.com/jarreugse09/Bareface-Hideface-Detection",
  },
  {
    slug: "librag",
    name: "Librag",
    tagline: "Library management system",
    description: "Catalogue, borrowing, and member management for a library.",
    image: "/images/projects/library_management.webp",
    width: 1600, height: 771,
    stack: ["Node.js", "Express", "MongoDB", "JavaScript"],
    live: "https://librag.vercel.app/",
    repo: "https://github.com/jarreugse09/Library-Management",
  },
];

export const stack = [
  { group: "Frontend", items: ["TypeScript", "JavaScript", "React", "Next.js", "Tailwind CSS", "HTML", "CSS"] },
  { group: "Backend", items: ["Node.js", "Express", "MongoDB", "MySQL"] },
  { group: "Data & AI", items: ["Python", "Flask", "YOLO", "Gemini AI"] },
  { group: "Tools", items: ["Git", "Linux", "Vercel", "Render"] },
] as const;

/**
 * SD cards in the walkman. Songs, lengths and covers come from Apple Music's catalogue
 * (src/lib/albums.ts); the player streams Apple's official 30-second previews. No audio is hosted.
 * collectionId = a whole album; trackIds = hand-picked songs (original recordings) in this order.
 */
export type AlbumCard = { key: string; short: string; hand: string; color: string; name?: string; collectionId?: number; trackIds?: number[] };
// Owner's picks (2026-11-07). Songs missing from the US store are looked up in the Philippine store.
export const albums: AlbumCard[] = [
  // Michael Jackson, Thriller (1982, original 9-track album)
  { key: "thriller", short: "Thriller", hand: "MJ · Thriller", color: "#c8141b", collectionId: 269572838 },
  // Hero's Come Back!!, Blue Bird, Closer, Sign, Diver, newsong, Silhouette, Blood Circulator
  { key: "shippuden", name: "Shippuden Openings", short: "Shippuden", hand: "Shippuden · openings", color: "#101114", trackIds: [1536898529, 1089186523, 394731050, 1536382006, 673586565, 1537248451, 1538157315, 1536461315] },
  // Odo, Backlight, Usseewa, Take Me to the Beach (Imagine Dragons feat. Ado)
  { key: "ado", name: "Ado", short: "Ado", hand: "Ado · picks", color: "#2f3d57", trackIds: [1562772211, 1636446964, 1535123742, 1783452556] },
  // Oo, Tadhana, Unti-Unti, Sigurado
  { key: "udd", name: "Up Dharma Down", short: "UDD", hand: "Up Dharma Down", color: "#5a3fd1", trackIds: [1623885965, 1623878835, 1623885397, 1194266450] },
  // Slave to the Rhythm (MJ), Orasa (Dilaw), Kalawakan (juan karlos), VISA (SB19), Since Day One (Skusta Clee)
  { key: "singles", name: "Singles", short: "Singles", hand: "Singles", color: "#7d838e", trackIds: [850697803, 1703728429, 1485359560, 1874942275, 1874403321] },
];
