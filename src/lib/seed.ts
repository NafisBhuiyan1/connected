// Clearly-labeled demo data. Every seeded person is fictional (isDemo: true) and the UI says so.
// CrownHacks dates/venue come from the public event page; the zone layout is illustrative.

import type {
  CollabType,
  ConnectedEvent,
  ConnectionRequest,
  Database,
  Level,
  LiveMode,
  Membership,
  Message,
  Mission,
  Notification,
  PersonRole,
  Profile,
  Team,
} from "./types";

import crypto from "node:crypto";
import { CROWNHACKS_ID } from "./constants";
import { tagText } from "./ontology";
import type { Account, Post } from "./types";

export { CROWNHACKS_ID };
export const DB_VERSION = 7;

// Precise venue coordinates (OpenStreetMap / Nominatim lookups, Nov 2026). EPIC and PORTAL are approximate.
const V = {
  mceniry: [35.307103, -80.730068, "McEniry Hall, UNC Charlotte"],
  union: [35.308613, -80.733727, "Popp Martin Student Union, UNC Charlotte"],
  woodward: [35.307243, -80.735731, "Woodward Hall, UNC Charlotte"],
  atkins: [35.305771, -80.73211, "Atkins Library, UNC Charlotte"],
  storrs: [35.304655, -80.729198, "Storrs Hall, UNC Charlotte"],
  cone: [35.305299, -80.733169, "Cone University Center, UNC Charlotte"],
  duke: [35.311954, -80.741103, "Duke Centennial Hall, UNC Charlotte"],
  epic: [35.3092, -80.7413, "EPIC Building, UNC Charlotte"],
  portal: [35.3113, -80.7436, "PORTAL, UNC Charlotte"],
  campnorthend: [35.246779, -80.833207, "Camp North End"],
  optimist: [35.234334, -80.827283, "Optimist Hall"],
  jcsu: [35.243795, -80.855432, "Johnson C. Smith University"],
  queens: [35.18882, -80.833332, "Queens University of Charlotte"],
  davidson: [35.503219, -80.83393, "Davidson College"],
  southpark: [35.152466, -80.831866, "SouthPark"],
  ballantyne: [35.072444, -80.842884, "Ballantyne"],
  noda: [35.251496, -80.812265, "NoDa Brewing Company"],
  athertonmill: [35.209299, -80.860681, "Atherton Mill, South End"],
  bearden: [35.226837, -80.847618, "Romare Bearden Park"],
  plaza: [35.220271, -80.810849, "Plaza Midwood"],
  cpcc: [35.130417, -80.897605, "CPCC Harper Campus"],
  convention: [35.222096, -80.845261, "Charlotte Convention Center"],
  packard: [35.226846, -80.846221, "Packard Place"],
  imaginon: [35.22694, -80.837675, "ImaginOn"],
  discovery: [35.229618, -80.841197, "Discovery Place Science"],
} as const;
type VenueKey = keyof typeof V;
const venueGeo = (k: VenueKey, radiusM = 400) => ({ lat: V[k][0], lng: V[k][1], radiusM, label: V[k][2] });

// Clearly-labeled sample events around Charlotte — every major type, so the map and events tab feel alive.
// [id, title, kind, dayOffset, startHourET, hours, venue, area, tags, description]
type ExtraEvent = [string, string, ConnectedEvent["kind"], number, number, number, VenueKey, string, string[], string];
const EXTRA_EVENTS: ExtraEvent[] = [
  // Hackathons
  ["ev_gamejam", "Game Jam Kickoff", "hackathon", 9, 12, 30, "jcsu", "West End", ["gaming", "edtech"], "48-hour game jam. Artists, devs and sound designers wanted."],
  ["ev_davidson", "Davidson Hack Night", "hackathon", 12, 18, 5, "davidson", "Davidson", ["ai", "dev-tools"], "Evening hack night. Bring a half-built project."],
  ["ev_civichack", "Civic Hack Day", "hackathon", 7, 10, 9, "imaginon", "Uptown Charlotte", ["social-impact", "data", "edtech"], "Build tools with city open data. Designers and data folks wanted."],
  ["ev_healthhack", "Healthcare Hackathon", "hackathon", 18, 9, 30, "duke", "UNC Charlotte main campus", ["healthtech", "ai", "biotech"], "Clinicians bring problems, teams build prototypes."],
  // Career fairs
  ["ev_queens", "Queens Entrepreneurship Fair", "career-fair", 10, 11, 4, "queens", "Myers Park", ["entrepreneurship", "startups", "careers"], "Student ventures and local investors."],
  ["ev_engfair", "Engineering & Tech Expo", "career-fair", 5, 10, 5, "cone", "UNC Charlotte main campus", ["careers", "dev-tools", "hardware"], "50+ employers hiring engineers and interns."],
  ["ev_cpccfair", "Tech Careers Fair", "career-fair", 13, 10, 4, "cpcc", "Southwest Charlotte", ["careers", "cybersecurity", "data"], "IT, cybersecurity and data roles — entry level welcome."],
  // Pitch nights
  ["ev_portalpitch", "Pitch Practice @ PORTAL", "pitch", 6, 17, 2, "portal", "UNC Charlotte main campus", ["startups", "entrepreneurship"], "Three-minute pitches, instant feedback from founders."],
  ["ev_packardpitch", "Packard Place Demo Night", "pitch", 8, 18, 3, "packard", "Uptown Charlotte", ["startups", "fintech", "ai"], "Early-stage founders demo to operators and angels."],
  ["ev_noda", "Founders & Brews", "pitch", 11, 18, 3, "noda", "NoDa", ["startups", "consumer"], "One-minute pitches, then founders' social."],
  // Meetups
  ["ev_wit", "Women in Tech Mixer", "meetup", 2, 18, 2, "union", "UNC Charlotte main campus", ["careers", "social-impact", "dev-tools"], "Casual mixer for women and allies in tech. Mentors from local companies."],
  ["ev_aibuilders", "Charlotte AI Builders Night", "meetup", 3, 18, 3, "campnorthend", "North Charlotte", ["ai", "startups", "dev-tools"], "Lightning demos of LLM apps and agents, then open networking."],
  ["ev_fintechbfast", "Fintech Founders Breakfast", "meetup", 4, 8, 2, "bearden", "Uptown Charlotte", ["fintech", "startups"], "Early-stage fintech founders swap notes over coffee."],
  ["ev_health", "Health Innovation Meetup", "meetup", 7, 18, 2, "discovery", "Uptown Charlotte", ["healthtech", "biotech", "ai"], "Clinicians and builders talk real healthcare problems."],
  ["ev_climate", "Climate Tech Charlotte", "meetup", 8, 18, 2, "optimist", "Optimist Park", ["climate", "hardware", "data"], "Energy, mobility and sustainability builders."],
  ["ev_pmcoffee", "Product People Coffee", "meetup", 5, 9, 2, "athertonmill", "South End", ["startups", "consumer"], "PMs, designers and founders talk product."],
  ["ev_web3", "Blockchain Builders", "meetup", 11, 19, 2, "plaza", "Plaza Midwood", ["crypto", "fintech", "cybersecurity"], "Smart contracts, security and real use cases."],
  ["ev_edtech", "Educators × Builders", "meetup", 13, 17, 2, "storrs", "UNC Charlotte main campus", ["edtech", "social-impact"], "Teachers and developers co-design classroom tools."],
  ["ev_mobile", "Mobile Dev Meetup", "meetup", 14, 18, 2, "southpark", "SouthPark", ["consumer", "design"], "iOS, Android and React Native talks."],
  // Workshops
  ["ev_epic", "EPIC Robotics Open Lab", "workshop", 1, 14, 3, "epic", "UNC Charlotte main campus", ["hardware", "ai"], "Bring a robot or borrow one. Embedded, CV and controls folks all welcome."],
  ["ev_designcrit", "Design Critique Night", "workshop", 4, 19, 2, "noda", "NoDa", ["design", "consumer"], "Bring a Figma file, get kind and useful feedback."],
  ["ev_ctf", "CTF Practice Session", "workshop", 2, 17, 3, "woodward", "UNC Charlotte main campus", ["cybersecurity", "crypto"], "Beginner-friendly capture-the-flag practice in teams."],
  ["ev_dataoh", "Data Science Office Hours", "workshop", 1, 16, 2, "atkins", "UNC Charlotte main campus", ["data", "ai", "research"], "Stuck on a model or a dataset? Drop in."],
  ["ev_resume", "Resume & LinkedIn Clinic", "workshop", 3, 12, 2, "cone", "UNC Charlotte main campus", ["careers"], "Recruiters review resumes one-on-one, 15 minutes each."],
  // Conferences
  ["ev_founders", "Women Founders Fireside", "conference", 15, 17, 3, "ballantyne", "Ballantyne", ["startups", "entrepreneurship"], "Fireside chats with founders, then open networking."],
  ["ev_techsummit", "Charlotte Tech Summit", "conference", 20, 9, 8, "convention", "Uptown Charlotte", ["ai", "fintech", "dev-tools", "careers"], "Talks, startup alley and a big networking hall."],
  ["ev_devfest", "DevFest Carolinas", "conference", 16, 9, 8, "convention", "Uptown Charlotte", ["dev-tools", "ai", "consumer"], "Community developer conference: web, mobile, cloud and AI."],
  // Seminars
  ["ev_posters", "Research Poster Session", "seminar", 6, 13, 3, "union", "UNC Charlotte main campus", ["research", "biotech", "ai"], "Undergrad and grad research, plus collaborator matching."],
  ["ev_quantsem", "Quant Finance Seminar", "seminar", 9, 16, 2, "woodward", "UNC Charlotte main campus", ["quant-finance", "data", "fintech"], "Market microstructure talk, then Q&A with practitioners."],
  ["ev_aiethics", "Responsible AI Seminar", "seminar", 14, 15, 2, "atkins", "UNC Charlotte main campus", ["ai", "social-impact", "research"], "Bias, privacy and safety in deployed ML systems."],
];

/** Public demo login shown on the login page. Fictional account, clearly labeled. */
export const DEMO_EMAIL = "demo@connected.app";
export const DEMO_PASSWORD = "crownhacks";
export const DEMO_USER_ID = "u_riley";
/** Shown on screens at the venue; lets people check in when GPS is unavailable. */
export const CROWNHACKS_CHECKIN_CODE = "CROWN26";

type SkillSpec = [string, Level];

interface P {
  id: string;
  name: string;
  pronouns?: string;
  headline: string;
  role: PersonRole;
  university?: string;
  major?: string;
  gradYear?: number;
  bio: string;
  skills: SkillSpec[];
  interests: string[];
  gives: string[];
  ask: string;
  lookingFor: string[];
  openTo: CollabType[];
  introsOffered?: string[];
  availability?: "high" | "medium" | "low";
  visibility?: "everyone" | "events" | "hidden";
}

const UNCC = "UNC Charlotte";

const PEOPLE: P[] = [
  { id: DEMO_USER_ID, name: "Riley Park", pronouns: "they/them", headline: "Finance student exploring AI startups", role: "student", university: UNCC, major: "Finance", gradYear: 2027, bio: "Interested in where AI and finance meet. Has a startup idea and wants to find people to build it with.", skills: [["finance", 3], ["business-strategy", 2], ["public-speaking", 2]], interests: ["ai", "fintech", "startups"], gives: ["Financial modeling basics", "Practicing your pitch"], ask: "I want to build an AI startup but need a developer and a designer.", lookingFor: ["backend-engineer", "designer", "ml-engineer"], openTo: ["cofounder", "hackathon-team"], availability: "high" },
  { id: "u_alex", name: "Alex Rivera", pronouns: "he/him", headline: "Backend + ML engineer · loves early-stage chaos", role: "student", university: UNCC, major: "Computer Science", gradYear: 2027, bio: "Built a Python service that scores loan risk for a class project. Wants to turn hackathon projects into real startups.", skills: [["python", 3], ["backend", 3], ["machine-learning", 2], ["databases", 2], ["cloud", 1]], interests: ["ai", "startups", "fintech"], gives: ["Python and API architecture", "Reviewing backend designs"], ask: "Looking for a business-minded cofounder with a real problem to solve.", lookingFor: ["business-lead", "designer"], openTo: ["cofounder", "hackathon-team", "project"], availability: "high" },
  { id: "u_maya", name: "Maya Chen", pronouns: "she/her", headline: "Product designer · Figma + user research", role: "student", university: UNCC, major: "Art & Design (UX)", gradYear: 2026, bio: "Designed a patient check-in flow tested with 12 nurses. Happiest when a prototype turns into a real product.", skills: [["product-design", 3], ["figma", 3], ["ux-research", 3], ["ui-design", 2], ["branding", 1]], interests: ["design", "healthtech", "ai", "social-impact"], gives: ["Portfolio feedback", "Quick usability review of your prototype"], ask: "Want engineers who care about UX for a hackathon team.", lookingFor: ["frontend-engineer", "backend-engineer"], openTo: ["hackathon-team", "project", "quick-chat"], availability: "high" },
  { id: "u_jordan", name: "Jordan Patel", pronouns: "they/them", headline: "Frontend engineer · React, Next.js, motion", role: "student", university: UNCC, major: "Software Engineering", gradYear: 2027, bio: "Shipped three Next.js apps and a finance dashboard used by a student investment club.", skills: [["react", 3], ["nextjs", 3], ["typescript", 3], ["html-css", 2], ["data-viz", 1]], interests: ["fintech", "ai", "consumer", "design"], gives: ["Debugging React apps", "Next.js deployment help"], ask: "Want to join an ambitious fintech or AI hackathon project.", lookingFor: ["backend-engineer", "designer"], openTo: ["hackathon-team", "cofounder", "project"], availability: "high" },
  { id: "u_priya", name: "Priya Raman", pronouns: "she/her", headline: "LLM apps & agents · ML research assistant", role: "student", university: UNCC, major: "Data Science (MS)", gradYear: 2026, bio: "Researches retrieval-augmented generation in a campus AI lab. Has built three LLM agents end to end.", skills: [["llm-apps", 3], ["machine-learning", 3], ["python", 3], ["nlp", 2], ["research-methods", 2]], interests: ["ai", "research", "edtech"], gives: ["Prompting and RAG design", "Choosing the right model for your app"], ask: "Looking for a team that needs a real AI engineer, not a wrapper.", lookingFor: ["frontend-engineer", "product-lead"], openTo: ["hackathon-team", "research", "project"], availability: "medium" },
  { id: "u_marcus", name: "Marcus Johnson", pronouns: "he/him", headline: "Investment banking analyst · UNCC alum", role: "professional", university: UNCC, major: "Finance (alum)", bio: "Two years in banking in Charlotte. Remembers how confusing recruiting was the first time.", skills: [["finance", 3], ["business-strategy", 2], ["fundraising", 2], ["public-speaking", 2]], interests: ["fintech", "careers", "startups"], gives: ["Banking internship advice", "Resume review for finance roles", "Mock superday questions"], ask: "Happy to give back — and curious about student fintech ideas.", lookingFor: [], openTo: ["mentorship-give", "quick-chat"], introsOffered: ["fintech", "careers"], availability: "medium" },
  { id: "u_elena", name: "Dr. Elena Vasquez", pronouns: "she/her", headline: "Research mentor · applied ML", role: "mentor", university: UNCC, bio: "Mentors students on turning class projects into research papers and grant proposals.", skills: [["research-methods", 3], ["machine-learning", 3], ["statistics", 3], ["writing", 2]], interests: ["research", "ai", "healthtech"], gives: ["Feedback on research ideas", "How to evaluate an ML model honestly"], ask: "Looking for students with ambitious, well-scoped research questions.", lookingFor: ["researcher", "ml-engineer"], openTo: ["mentorship-give", "research"], introsOffered: ["research"], availability: "low" },
  { id: "u_sam", name: "Sam Okafor", pronouns: "he/him", headline: "Founder · student fintech for first-gen savers", role: "founder", university: UNCC, major: "Finance & Entrepreneurship", gradYear: 2026, bio: "Running a 40-person pilot of a savings app for first-generation students. Needs technical partners.", skills: [["business-strategy", 3], ["fundraising", 3], ["finance", 2], ["product-management", 2], ["public-speaking", 2]], interests: ["fintech", "startups", "social-impact"], gives: ["Pitch deck feedback", "Customer discovery tips"], ask: "Need a backend engineer and an AI engineer for our pilot.", lookingFor: ["backend-engineer", "ml-engineer"], openTo: ["cofounder", "hackathon-team"], availability: "high" },
  { id: "u_leila", name: "Leila Haddad", pronouns: "she/her", headline: "Nursing student · healthcare UX nerd", role: "student", university: UNCC, major: "Nursing", gradYear: 2027, bio: "Clinical rotations showed her how painful hospital scheduling is. Wants to fix it with technologists.", skills: [["healthcare", 3], ["ux-research", 2], ["operations", 1]], interests: ["healthtech", "social-impact", "ai"], gives: ["How hospitals actually schedule shifts", "Clinical workflow reality checks"], ask: "Looking for builders who want to solve a real healthcare problem.", lookingFor: ["frontend-engineer", "backend-engineer", "designer"], openTo: ["hackathon-team", "project"], availability: "high" },
  { id: "u_chris", name: "Chris Nguyen", pronouns: "he/him", headline: "iOS developer · SwiftUI", role: "student", university: UNCC, major: "Computer Science", gradYear: 2028, bio: "Published a campus shuttle tracker to the App Store with 600 users.", skills: [["ios", 3], ["mobile", 3], ["backend", 1], ["figma", 1]], interests: ["consumer", "mobility", "design"], gives: ["Getting through App Store review"], ask: "Want a team building something people will use on their phones.", lookingFor: ["backend-engineer", "designer"], openTo: ["hackathon-team"], availability: "medium" },
  { id: "u_taylor", name: "Taylor Brooks", pronouns: "she/her", headline: "Growth & community · ran a 2k-member student org", role: "student", university: UNCC, major: "Marketing", gradYear: 2026, bio: "Grew a campus entrepreneurship club from 80 to 2,000 members.", skills: [["marketing", 3], ["community", 3], ["writing", 2], ["sales", 2]], interests: ["startups", "consumer", "entrepreneurship"], gives: ["Launch and growth plans", "Writing your one-line pitch"], ask: "Looking for a technical team that needs a go-to-market person.", lookingFor: ["frontend-engineer", "backend-engineer"], openTo: ["hackathon-team", "cofounder"], availability: "high" },
  { id: "u_diego", name: "Diego Morales", pronouns: "he/him", headline: "Robotics & embedded · Jetson tinkerer", role: "student", university: UNCC, major: "Electrical Engineering", gradYear: 2027, bio: "Builds autonomous rovers. Has run computer-vision models on edge devices.", skills: [["embedded", 3], ["robotics", 3], ["cpp", 2], ["computer-vision", 2], ["cad", 2]], interests: ["hardware", "ai", "mobility"], gives: ["Getting models running on edge hardware"], ask: "Looking for a software teammate for a hardware + AI hack.", lookingFor: ["ml-engineer", "frontend-engineer"], openTo: ["hackathon-team", "project"], availability: "high" },
  { id: "u_aisha", name: "Aisha Bello", pronouns: "she/her", headline: "Data scientist · quant finance", role: "student", university: UNCC, major: "Mathematical Finance", gradYear: 2026, bio: "Backtests trading strategies for fun; interned on a risk analytics team.", skills: [["data-analysis", 3], ["statistics", 3], ["quant", 3], ["python", 2], ["data-viz", 2]], interests: ["quant-finance", "fintech", "data"], gives: ["Statistics sanity checks", "Breaking into quant"], ask: "Want to work on a fintech product with real data.", lookingFor: ["backend-engineer", "frontend-engineer"], openTo: ["hackathon-team", "cofounder"], availability: "medium" },
  { id: "u_ben", name: "Ben Carter", pronouns: "he/him", headline: "Security engineer in training · CTF player", role: "student", university: UNCC, major: "Cybersecurity", gradYear: 2027, bio: "Top-10 finish in a regional CTF. Interested in secure-by-default apps.", skills: [["security", 3], ["cloud", 2], ["backend", 2], ["python", 2]], interests: ["cybersecurity", "crypto", "dev-tools"], gives: ["Threat-modeling your app in 15 minutes"], ask: "Looking for a cybersecurity or blockchain track team.", lookingFor: ["frontend-engineer", "designer"], openTo: ["hackathon-team"], availability: "high" },
  { id: "u_hannah", name: "Hannah Kim", pronouns: "she/her", headline: "Full-stack engineer · React + Node", role: "student", university: UNCC, major: "Computer Science", gradYear: 2026, bio: "Interned on a web platform team; ships fast and writes tests.", skills: [["react", 3], ["node", 3], ["typescript", 3], ["databases", 2], ["backend", 2]], interests: ["dev-tools", "edtech", "ai"], gives: ["Code review", "Setting up a full-stack starter fast"], ask: "Want a team with a clear user and a designer.", lookingFor: ["designer", "product-lead"], openTo: ["hackathon-team", "project"], availability: "medium" },
  { id: "u_noah", name: "Noah Williams", pronouns: "he/him", headline: "First-year CS · first hackathon!", role: "student", university: UNCC, major: "Computer Science", gradYear: 2030, bio: "Learning JavaScript and eager to help however I can.", skills: [["javascript", 1], ["html-css", 1], ["writing", 2]], interests: ["gaming", "ai", "edtech"], gives: ["Note-taking and demo scripts", "Testing your app like a real user"], ask: "First hackathon — looking for a welcoming team.", lookingFor: ["frontend-engineer"], openTo: ["hackathon-team", "mentorship-get"], availability: "high" },
  { id: "u_grace", name: "Grace Liu", pronouns: "she/her", headline: "Bioinformatics · genomics pipelines", role: "student", university: UNCC, major: "Bioinformatics", gradYear: 2027, bio: "Builds genomics pipelines in Python for a campus lab.", skills: [["biotech", 3], ["python", 3], ["data-analysis", 2], ["research-methods", 2]], interests: ["biotech", "research", "healthtech"], gives: ["Explaining genomics data formats"], ask: "Bioinformatics track — need a frontend person for the demo.", lookingFor: ["frontend-engineer", "designer"], openTo: ["hackathon-team", "research"], availability: "medium" },
  { id: "u_omar", name: "Omar Siddiqui", pronouns: "he/him", headline: "Smart contracts & Web3", role: "student", university: UNCC, major: "Computer Engineering", gradYear: 2027, bio: "Wrote and audited Solidity contracts for a student DAO.", skills: [["blockchain", 3], ["typescript", 2], ["security", 2], ["backend", 2]], interests: ["crypto", "fintech", "cybersecurity"], gives: ["Smart contract security basics"], ask: "Blockchain track — looking for a designer and a pitch person.", lookingFor: ["designer", "business-lead"], openTo: ["hackathon-team", "cofounder"], availability: "medium" },
  { id: "u_zoe", name: "Zoe Martin", pronouns: "she/her", headline: "UI & brand designer", role: "student", university: "Queens University of Charlotte", major: "Graphic Design", gradYear: 2026, bio: "Designs brand systems for local startups. Fast in Figma.", skills: [["ui-design", 3], ["branding", 3], ["figma", 3], ["motion-design", 2]], interests: ["design", "consumer", "music-media"], gives: ["Making your demo look polished", "Logo in 20 minutes"], ask: "Want to be the designer on a consumer app team.", lookingFor: ["frontend-engineer", "mobile-engineer"], openTo: ["hackathon-team", "project"], availability: "high" },
  { id: "u_ethan", name: "Ethan Brown", pronouns: "he/him", headline: "Backend & cloud · Go, Postgres, AWS", role: "student", university: UNCC, major: "Computer Science", gradYear: 2026, bio: "Runs the infrastructure for a student-built course planner with 5k users.", skills: [["backend", 3], ["go", 3], ["databases", 3], ["cloud", 3], ["security", 1]], interests: ["dev-tools", "startups", "climate"], gives: ["Deploying your backend in 20 minutes", "Database schema reviews"], ask: "Looking for a product-minded team with real users in mind.", lookingFor: ["frontend-engineer", "product-lead"], openTo: ["hackathon-team", "cofounder", "project"], availability: "medium" },
  { id: "u_fatima", name: "Fatima Zahra", pronouns: "she/her", headline: "Aspiring PM · product strategy", role: "student", university: UNCC, major: "Business Analytics", gradYear: 2027, bio: "PM intern at a regional retailer. Loves user interviews and roadmaps.", skills: [["product-management", 3], ["business-strategy", 2], ["ux-research", 2], ["data-analysis", 1]], interests: ["consumer", "startups", "edtech"], gives: ["Scoping your MVP", "Writing a crisp problem statement"], ask: "Want to own product on an ambitious hackathon team.", lookingFor: ["frontend-engineer", "backend-engineer", "designer"], openTo: ["hackathon-team", "cofounder"], availability: "high" },
  { id: "u_lucas", name: "Lucas Silva", pronouns: "he/him", headline: "Computer vision · PyTorch", role: "student", university: "Davidson College", major: "Computer Science", gradYear: 2026, bio: "Trained a CV model to detect potholes from dashcam footage.", skills: [["computer-vision", 3], ["machine-learning", 3], ["python", 3]], interests: ["ai", "mobility", "climate"], gives: ["Training data strategy for vision models"], ask: "Looking for a team that needs CV.", lookingFor: ["frontend-engineer", "hardware-engineer"], openTo: ["hackathon-team", "research"], availability: "medium" },
  { id: "u_isabella", name: "Isabella Rossi", pronouns: "she/her", headline: "Finance & entrepreneurship · pitch competitions", role: "student", university: UNCC, major: "Finance", gradYear: 2027, bio: "Won a campus pitch competition with a budgeting app concept.", skills: [["finance", 3], ["fundraising", 2], ["public-speaking", 3], ["business-strategy", 2]], interests: ["fintech", "startups", "entrepreneurship", "ai"], gives: ["Practicing your pitch", "Financial model sanity check"], ask: "Need technical teammates for a fintech idea.", lookingFor: ["backend-engineer", "frontend-engineer"], openTo: ["cofounder", "hackathon-team"], availability: "high" },
  { id: "u_kevin", name: "Kevin O'Brien", pronouns: "he/him", headline: "Senior software engineer · hackathon mentor", role: "mentor", bio: "Ten years building web platforms in Charlotte. Mentors at student hackathons.", skills: [["backend", 3], ["cloud", 3], ["react", 2], ["product-management", 2]], interests: ["dev-tools", "startups", "careers"], gives: ["System design advice", "Code review", "Career advice for new grads"], ask: "Here to help teams get unstuck.", lookingFor: [], openTo: ["mentorship-give", "quick-chat"], introsOffered: ["careers", "dev-tools"], availability: "medium" },
  { id: "u_ravi", name: "Ravi Shah", pronouns: "he/him", headline: "Data viz + frontend", role: "student", university: UNCC, major: "Data Science", gradYear: 2027, bio: "Builds dashboards in D3 and React for a sports analytics club.", skills: [["data-viz", 3], ["react", 2], ["data-analysis", 2], ["javascript", 2]], interests: ["sports", "data", "ai"], gives: ["Making charts that judges understand"], ask: "Looking for a data-heavy hackathon idea.", lookingFor: ["backend-engineer", "ml-engineer"], openTo: ["hackathon-team"], availability: "high" },
  { id: "u_mia", name: "Mia Thompson", pronouns: "she/her", headline: "Storyteller · pitch & demo coach", role: "student", university: UNCC, major: "Communication Studies", gradYear: 2026, bio: "Coaches the debate team and helps founders tell their story.", skills: [["public-speaking", 3], ["writing", 3], ["marketing", 2]], interests: ["startups", "social-impact", "music-media"], gives: ["Turning your demo into a story", "Two-minute video scripts"], ask: "Want to join a team as the pitch and story lead.", lookingFor: ["frontend-engineer", "designer"], openTo: ["hackathon-team", "quick-chat"], availability: "medium" },
  { id: "u_daniel", name: "Daniel Lee", pronouns: "he/him", headline: "Climate data · energy modeling", role: "researcher", university: UNCC, major: "Environmental Engineering (PhD)", bio: "Models solar adoption across North Carolina counties.", skills: [["climate", 3], ["data-analysis", 3], ["python", 2], ["research-methods", 3]], interests: ["climate", "research", "data"], gives: ["Finding open climate datasets"], ask: "Looking for builders to make climate data usable.", lookingFor: ["frontend-engineer", "designer"], openTo: ["research", "project", "hackathon-team"], availability: "low" },
  { id: "u_sofia", name: "Sofia Garcia", pronouns: "she/her", headline: "Future teacher · edtech UX", role: "student", university: UNCC, major: "Elementary Education", gradYear: 2027, bio: "Student-teaches 4th grade and prototypes learning games.", skills: [["education", 3], ["ux-research", 2], ["writing", 2]], interests: ["edtech", "social-impact", "gaming"], gives: ["What teachers actually need from edtech"], ask: "Looking for developers to build a classroom tool.", lookingFor: ["frontend-engineer", "designer"], openTo: ["hackathon-team", "project"], availability: "medium" },
  { id: "u_tyler", name: "Tyler Jackson", pronouns: "he/him", headline: "Game dev · Unity", role: "student", university: "Johnson C. Smith University", major: "Computer Science", gradYear: 2027, bio: "Released two small games on itch.io.", skills: [["game-dev", 3], ["cpp", 2], ["motion-design", 1]], interests: ["gaming", "edtech", "music-media"], gives: ["Game feel and juice tips"], ask: "Want to make an educational game this weekend.", lookingFor: ["designer", "education-expert"], openTo: ["hackathon-team"], availability: "high" },
  { id: "u_nina", name: "Nina Petrova", pronouns: "she/her", headline: "NLP grad researcher", role: "researcher", university: UNCC, major: "Computer Science (PhD)", bio: "Works on multilingual language models and evaluation.", skills: [["nlp", 3], ["machine-learning", 3], ["llm-apps", 2], ["research-methods", 3]], interests: ["ai", "research", "social-impact"], gives: ["Evaluating LLM outputs properly"], ask: "Open to advising a team using NLP.", lookingFor: ["frontend-engineer"], openTo: ["research", "mentorship-give", "quick-chat"], availability: "low" },
  { id: "u_james", name: "James Wilson", pronouns: "he/him", headline: "Technical recruiter · Charlotte tech", role: "professional", bio: "Recruits engineers and interns for a Charlotte software company.", skills: [["sales", 2], ["community", 2]], interests: ["careers", "dev-tools"], gives: ["What recruiters look for in a resume", "How to talk about your hackathon project"], ask: "Meeting students who build things.", lookingFor: ["frontend-engineer", "backend-engineer"], openTo: ["hiring", "quick-chat", "mentorship-give"], introsOffered: ["careers"], availability: "medium" },
  { id: "u_ava", name: "Ava Davis", pronouns: "she/her", headline: "Pre-med · health data", role: "student", university: UNCC, major: "Biology (Pre-Med)", gradYear: 2027, bio: "Volunteers in an ER and analyzes wait-time data for a public health class.", skills: [["healthcare", 2], ["data-analysis", 2], ["statistics", 1], ["biotech", 1]], interests: ["healthtech", "biotech", "social-impact"], gives: ["Patient-side perspective on health apps"], ask: "Want to join a healthtech team.", lookingFor: ["backend-engineer", "frontend-engineer"], openTo: ["hackathon-team"], availability: "high" },
  { id: "u_jamal", name: "Jamal Robinson", pronouns: "he/him", headline: "Android dev · fintech curious", role: "student", university: UNCC, major: "Computer Science", gradYear: 2027, bio: "Built an Android expense splitter for his apartment.", skills: [["android", 3], ["mobile", 2], ["java", 2], ["databases", 1]], interests: ["fintech", "consumer"], gives: ["Android dev environment setup"], ask: "Looking for a fintech team that needs mobile.", lookingFor: ["designer", "backend-engineer"], openTo: ["hackathon-team", "project"], availability: "medium" },
  { id: "u_emily", name: "Emily Zhang", pronouns: "she/her", headline: "Event volunteer · loves connecting people", role: "organizer", university: UNCC, major: "Information Systems", gradYear: 2026, bio: "Helps run campus tech events; knows who's building what.", skills: [["community", 3], ["operations", 2], ["product-management", 1]], interests: ["startups", "careers", "social-impact"], gives: ["Finding the right mentor at this event"], ask: "Helping first-timers find teams.", lookingFor: [], openTo: ["quick-chat", "mentorship-give"], introsOffered: ["startups", "careers"], availability: "high" },
  { id: "u_owen", name: "Owen Murphy", pronouns: "he/him", headline: "Java backend + appsec", role: "student", university: UNCC, major: "Computer Science", gradYear: 2026, bio: "Interned on an application security team at a bank.", skills: [["java", 3], ["backend", 2], ["security", 2], ["databases", 2]], interests: ["cybersecurity", "fintech"], gives: ["Secure login flows"], ask: "Cybersecurity track — need a frontend dev.", lookingFor: ["frontend-engineer", "designer"], openTo: ["hackathon-team"], availability: "medium" },
  { id: "u_chloe", name: "Chloe Adams", pronouns: "she/her", headline: "Motion design & video", role: "student", university: UNCC, major: "Film & Media", gradYear: 2027, bio: "Edits launch videos and demo reels.", skills: [["motion-design", 3], ["branding", 2], ["writing", 1]], interests: ["music-media", "design", "startups"], gives: ["Cutting a 2-minute demo video"], ask: "Want to make a team's demo video shine.", lookingFor: ["frontend-engineer"], openTo: ["hackathon-team", "project"], availability: "medium" },
  { id: "u_arjun", name: "Arjun Mehta", pronouns: "he/him", headline: "AI agents builder · 2x hackathon winner", role: "student", university: "NC State", major: "Computer Science", gradYear: 2026, bio: "Builds multi-agent systems; won two regional hackathons.", skills: [["llm-apps", 3], ["python", 3], ["backend", 2], ["react", 2]], interests: ["ai", "startups", "dev-tools"], gives: ["Agent architecture whiteboarding"], ask: "Looking for a cofounder with a domain problem worth automating.", lookingFor: ["business-lead", "health-expert", "finance-expert"], openTo: ["cofounder", "hackathon-team"], availability: "medium" },
  { id: "u_rosa", name: "Rosa Alvarez", pronouns: "she/her", headline: "Private profile example", role: "student", university: UNCC, major: "Computer Science", gradYear: 2027, bio: "This profile is hidden from discovery — it exists to show privacy filters work.", skills: [["react", 3], ["backend", 2]], interests: ["ai"], gives: [], ask: "", lookingFor: [], openTo: ["hackathon-team"], availability: "high", visibility: "hidden" },
];

// Approximate geofence covering UNC Charlotte's main campus (McEniry Hall is inside it).
// Generous radius on purpose: we only need "at the venue", never a precise position.
const CAMPUS_GEO = { lat: 35.3071, lng: -80.7338, radiusM: 1100, label: "UNC Charlotte main campus" };
// CrownHacks pin sits exactly on McEniry Hall; the check-in geofence still covers the whole campus.
const MCENIRY_GEO = { lat: 35.307103, lng: -80.730068, radiusM: 1300, label: "UNC Charlotte main campus" };

// Zone layout on a 100 x 60 grid. Illustrative — not an official floor plan.
const CROWNHACKS_ZONES = [
  { id: "z_main", name: "Main hacking area", x: 2, y: 2, w: 54, h: 34, kind: "hall" as const },
  { id: "z_mixer", name: "Team-formation mixer", x: 58, y: 2, w: 40, h: 18, kind: "lounge" as const, meetingSpot: true },
  { id: "z_mentor", name: "Mentor corner", x: 58, y: 22, w: 20, h: 14, kind: "booth" as const, meetingSpot: true },
  { id: "z_quiet", name: "Quiet room", x: 80, y: 22, w: 18, h: 14, kind: "table" as const },
  { id: "z_food", name: "Food & coffee", x: 2, y: 38, w: 30, h: 20, kind: "food" as const, meetingSpot: true },
  { id: "z_stage", name: "McEniry 124 (talks)", x: 34, y: 38, w: 30, h: 20, kind: "stage" as const },
  { id: "z_expo", name: "Expo tables", x: 66, y: 38, w: 32, h: 20, kind: "table" as const },
];

function genericZones(prefix: string) {
  return [
    { id: `${prefix}_main`, name: "Main room", x: 2, y: 2, w: 60, h: 36, kind: "hall" as const },
    { id: `${prefix}_lounge`, name: "Networking lounge", x: 64, y: 2, w: 34, h: 36, kind: "lounge" as const, meetingSpot: true },
    { id: `${prefix}_coffee`, name: "Coffee bar", x: 2, y: 40, w: 46, h: 18, kind: "food" as const, meetingSpot: true },
    { id: `${prefix}_stage`, name: "Stage", x: 50, y: 40, w: 48, h: 18, kind: "stage" as const },
  ];
}

function events(now: Date): ConnectedEvent[] {
  const at = (days: number, hour: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hour + 5, 0, 0, 0); // hour in US Eastern (EST = UTC-5)
    return d.toISOString();
  };
  const crownStart = new Date("2026-11-07T16:00:00Z"); // 11:00 AM ET
  const crownEnd = new Date("2026-11-08T18:00:00Z"); // expo ends 1:00 PM ET
  // If the demo runs after the real event, keep it "live" so the demo still works (clearly marked as sample timing).
  const crownLive = now <= crownEnd;
  return [
    {
      id: CROWNHACKS_ID,
      title: "CrownHacks 2026",
      host: "CAIR · UNC Charlotte",
      kind: "hackathon",
      description:
        "UNC Charlotte's 24-hour, free-for-all hackathon. Teams of 2–4 compete across tracks (Cybersecurity/Blockchain, Bioinformatics, Most Technical, Most Creative). Roughly half of attendees are first-timers — and many arrive without a team.",
      start: crownLive ? crownStart.toISOString() : at(-1, 11),
      end: crownLive ? crownEnd.toISOString() : at(1, 13),
      venue: "UNC Charlotte · McEniry Hall",
      area: "UNC Charlotte main campus",
      tags: ["ai", "cybersecurity", "biotech", "startups", "crypto", "research"],
      zones: CROWNHACKS_ZONES,
      geo: MCENIRY_GEO,
      checkInCode: CROWNHACKS_CHECKIN_CODE,
      isSample: !crownLive,
    },
    { id: "ev_pitch", title: "Charlotte Student Pitch Night", host: "Sample event", kind: "pitch", description: "Student founders pitch early ideas to local operators and angels. Great for finding business cofounders and feedback.", start: at(5, 18), end: at(5, 21), venue: "Uptown Charlotte (sample)", area: "Uptown Charlotte", tags: ["startups", "entrepreneurship", "fintech"], zones: genericZones("zp"), geo: venueGeo("packard"), isSample: true },
    { id: "ev_career", title: "Fall Tech & Finance Career Fair", host: "Sample event", kind: "career-fair", description: "Recruiters from tech and finance companies meet students for internships and new-grad roles.", start: at(9, 10), end: at(9, 15), venue: "UNC Charlotte Student Union (sample)", area: "UNC Charlotte main campus", tags: ["careers", "fintech", "dev-tools"], zones: genericZones("zc"), geo: venueGeo("union"), isSample: true },
    { id: "ev_ai", title: "Applied AI Research Seminar", host: "Sample event", kind: "seminar", description: "Grad students present applied ML work; open Q&A and research-collaboration mixer afterwards.", start: at(3, 16), end: at(3, 18), venue: "Woodward Hall (sample)", area: "UNC Charlotte main campus", tags: ["ai", "research", "healthtech"], zones: genericZones("za"), geo: venueGeo("woodward"), isSample: true },
    { id: "ev_design", title: "Design Systems Workshop", host: "Sample event", kind: "workshop", description: "Hands-on Figma workshop on building component libraries — designers and frontend engineers welcome.", start: at(12, 17), end: at(12, 19), venue: "Storrs Hall (sample)", area: "UNC Charlotte main campus", tags: ["design", "consumer"], zones: genericZones("zd"), geo: venueGeo("storrs"), isSample: true },
    { id: "ev_fintech", title: "Fintech Builders Meetup", host: "Sample event", kind: "meetup", description: "Monthly meetup for people building in payments, banking and investing.", start: at(16, 18), end: at(16, 20), venue: "South End (sample)", area: "South End, Charlotte", tags: ["fintech", "quant-finance", "startups", "crypto"], zones: genericZones("zf"), geo: venueGeo("athertonmill"), isSample: true },
    ...EXTRA_EVENTS.map(([id, title, kind, day, hour, hours, venueKey, area, tags, description]) => {
      const [lat, lng, venue] = V[venueKey];
      const start = at(day, hour);
      return {
        id,
        title,
        host: "Sample event",
        kind,
        description,
        start,
        end: new Date(new Date(start).getTime() + hours * 3_600_000).toISOString(),
        venue: `${venue} (sample)`,
        area,
        tags,
        zones: genericZones(`z${id.slice(3, 7)}`),
        geo: { lat, lng, radiusM: 400, label: venue },
        isSample: true,
      } satisfies ConnectedEvent;
    }),
  ];
}

const CROWN_ZONE: Record<string, string> = {
  u_riley: "z_mixer",
  u_alex: "z_mixer", u_maya: "z_mixer", u_jordan: "z_main", u_priya: "z_main", u_marcus: "z_mentor", u_elena: "z_mentor",
  u_sam: "z_mixer", u_leila: "z_mixer", u_chris: "z_main", u_taylor: "z_food", u_diego: "z_main", u_aisha: "z_main",
  u_ben: "z_quiet", u_hannah: "z_main", u_noah: "z_mixer", u_grace: "z_main", u_omar: "z_quiet", u_zoe: "z_food",
  u_ethan: "z_main", u_fatima: "z_mixer", u_lucas: "z_main", u_isabella: "z_food", u_kevin: "z_mentor", u_ravi: "z_main",
  u_mia: "z_food", u_tyler: "z_main", u_nina: "z_mentor", u_james: "z_expo", u_ava: "z_mixer", u_jamal: "z_main",
  u_emily: "z_mixer", u_owen: "z_quiet", u_chloe: "z_food", u_arjun: "z_main", u_rosa: "z_main",
};
const NOT_OPTED_IN = new Set(["u_tyler", "u_owen"]); // attending, but not discoverable — privacy realism
// Demo personas whose phones "confirmed" they're at the venue (only the yes/no result is ever stored).
const CHECKED_IN = new Set(["u_alex", "u_maya", "u_jordan", "u_priya", "u_marcus", "u_kevin", "u_noah", "u_leila", "u_zoe", "u_emily", "u_sam", "u_aisha", "u_hannah", "u_fatima", "u_diego"]);

const LIVE: Record<string, { mode: LiveMode; topics: string[]; hours: number; max: number }> = {
  u_alex: { mode: "team-up", topics: ["Python backends", "AI startup ideas"], hours: 4, max: 5 },
  u_maya: { mode: "team-up", topics: ["UX for health apps", "Portfolio feedback"], hours: 3, max: 4 },
  u_jordan: { mode: "team-up", topics: ["React", "Fintech dashboards"], hours: 5, max: 5 },
  u_marcus: { mode: "mentoring", topics: ["Banking internships", "Resumes"], hours: 2, max: 3 },
  u_kevin: { mode: "mentoring", topics: ["System design", "Getting unstuck"], hours: 3, max: 6 },
  u_noah: { mode: "quick-chat", topics: ["Anything — first hackathon!"], hours: 6, max: 10 },
  u_leila: { mode: "team-up", topics: ["Hospital scheduling problems"], hours: 4, max: 4 },
  u_zoe: { mode: "quick-chat", topics: ["Demo polish", "Logos"], hours: 2, max: 4 },
  u_emily: { mode: "quick-chat", topics: ["Finding a team", "Finding mentors"], hours: 8, max: 12 },
  u_priya: { mode: "heads-down", topics: [], hours: 2, max: 0 },
};

const OTHER_EVENTS: Record<string, string[]> = {
  ev_pitch: ["u_sam", "u_isabella", "u_taylor", "u_alex", "u_arjun", "u_mia", "u_marcus", "u_fatima"],
  ev_career: ["u_james", "u_kevin", "u_marcus", "u_hannah", "u_ethan", "u_aisha", "u_noah", "u_jamal"],
  ev_ai: ["u_elena", "u_priya", "u_nina", "u_lucas", "u_grace", "u_daniel"],
  ev_design: ["u_maya", "u_zoe", "u_jordan", "u_chloe", "u_sofia"],
  ev_fintech: ["u_sam", "u_aisha", "u_jamal", "u_omar", "u_isabella", "u_marcus"],
};

let counter = 0;
const nid = (p: string) => `${p}_${(++counter).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function buildSeed(now = new Date()): Database {
  counter = 0;
  const iso = (offsetMin: number) => new Date(now.getTime() + offsetMin * 60_000).toISOString();
  const profiles: Profile[] = PEOPLE.map((p, idx) => ({
    id: p.id,
    name: p.name,
    pronouns: p.pronouns,
    headline: p.headline,
    role: p.role,
    university: p.university,
    major: p.major,
    gradYear: p.gradYear,
    bio: p.bio,
    skills: p.skills.map(([skill, level]) => ({ skill, level })),
    interests: p.interests,
    gives: p.gives,
    ask: p.ask,
    lookingFor: p.lookingFor,
    openTo: p.openTo,
    introsOffered: p.introsOffered ?? [],
    availability: p.availability ?? "medium",
    area: p.university ? `${p.university} area` : "Charlotte, NC",
    visibility: p.visibility ?? "everyone",
    allowRequests: true,
    isDemo: true,
    avatarHue: (idx * 47) % 360,
    createdAt: iso(-60 * 24 * (10 + idx)),
  }));

  const memberships: Membership[] = [];
  for (const p of PEOPLE) {
    const zone = CROWN_ZONE[p.id];
    if (!zone) continue;
    const live = LIVE[p.id];
    memberships.push({
      eventId: CROWNHACKS_ID,
      userId: p.id,
      optIn: !NOT_OPTED_IN.has(p.id),
      zone,
      status: live ? { mode: live.mode, topics: live.topics, until: iso(live.hours * 60), maxRequests: live.max } : undefined,
      checkedInAt: CHECKED_IN.has(p.id) ? iso(-60) : undefined,
      joinedAt: iso(-90),
    });
  }
  for (const [eventId, ids] of Object.entries(OTHER_EVENTS)) {
    for (const userId of ids) memberships.push({ eventId, userId, optIn: true, joinedAt: iso(-60 * 24) });
  }
  // Deterministic attendees for the extra sample events: people whose interests overlap the event's tags.
  const ids = PEOPLE.filter((p) => p.visibility !== "hidden" && p.id !== DEMO_USER_ID);
  EXTRA_EVENTS.forEach(([eventId, , , , , , , , tags], k) => {
    const fans = ids.filter((p) => p.interests.some((i) => tags.includes(i)));
    const extra = ids.filter((_, j) => (j * 7 + k * 3) % 11 === 0);
    const chosen = [...new Set([...fans.slice(k % 3, (k % 3) + 7), ...extra])].slice(0, 10);
    for (const p of chosen) memberships.push({ eventId, userId: p.id, optIn: true, joinedAt: iso(-60 * 12) });
  });

  // A forming team with an open role — powers Opportunity Radar ("a founder needs your skills").
  const teams: Team[] = [
    {
      id: "t_savings",
      ownerId: "u_sam",
      title: "Nest — savings coach for first-gen students",
      pitch: "An AI savings coach that nudges first-generation students toward an emergency fund.",
      eventId: CROWNHACKS_ID,
      roles: [
        { roleId: "business-lead", label: "Business & pitch lead", why: "Pilot, pitch and partnerships.", weight: 0.8, assignedUserId: "u_sam", coverage: 0.97 },
        { roleId: "data-scientist", label: "Data scientist", why: "Spending pattern analysis.", weight: 0.6, assignedUserId: "u_aisha", coverage: 0.98 },
        { roleId: "backend-engineer", label: "Backend engineer", why: "APIs and secure data.", weight: 1 },
        { roleId: "ml-engineer", label: "AI / ML engineer", why: "The coaching model.", weight: 1 },
      ],
      members: [
        { userId: "u_sam", roleId: "business-lead", status: "owner", invitedAt: iso(-200) },
        { userId: "u_aisha", roleId: "data-scientist", status: "accepted", invitedAt: iso(-190), respondedAt: iso(-180) },
      ],
      openRoles: ["backend-engineer", "ml-engineer"],
      coverage: 0.55,
      status: "forming",
      nextSteps: [
        { id: "s1", text: "Agree on the one-sentence problem", done: true },
        { id: "s2", text: "Pick a meeting spot", done: true },
        { id: "s3", text: "Fill backend + AI roles", done: false },
      ],
      createdAt: iso(-200),
    },
    {
      id: "t_genome",
      ownerId: "u_grace",
      title: "VariantLens — explain genetic variants in plain English",
      pitch: "Bioinformatics track: turn a VCF file into a readable report.",
      eventId: CROWNHACKS_ID,
      roles: [
        { roleId: "researcher", label: "Researcher", why: "Bio pipeline.", weight: 1, assignedUserId: "u_grace", coverage: 0.9 },
        { roleId: "frontend-engineer", label: "Frontend engineer", why: "The report UI.", weight: 1, assignedUserId: "u_ravi", coverage: 0.85 },
        { roleId: "ml-engineer", label: "AI / ML engineer", why: "Plain-English summaries.", weight: 0.8, assignedUserId: "u_nina", coverage: 0.95 },
      ],
      members: [
        { userId: "u_grace", roleId: "researcher", status: "owner", invitedAt: iso(-240) },
        { userId: "u_ravi", roleId: "frontend-engineer", status: "accepted", invitedAt: iso(-230), respondedAt: iso(-220) },
        { userId: "u_nina", roleId: "ml-engineer", status: "accepted", invitedAt: iso(-230), respondedAt: iso(-210) },
      ],
      openRoles: [],
      coverage: 0.9,
      status: "formed",
      nextSteps: [{ id: "s1", text: "Kickoff at the mixer", done: true }],
      createdAt: iso(-240),
    },
  ];

  const requests: ConnectionRequest[] = [
    mkReq("u_noah", "u_kevin", "How do I split work on a team when I only know a little JavaScript?", "accepted", iso(-150), "useful", "useful"),
    mkReq("u_ava", "u_leila", "Want to compare notes on ER and hospital scheduling pain points?", "accepted", iso(-140), "useful", "useful"),
    mkReq("u_isabella", "u_marcus", "Could you look at how I describe my finance internship on my resume?", "accepted", iso(-130), "useful", "okay"),
    mkReq("u_ravi", "u_grace", "Need a frontend person for your bioinformatics demo?", "accepted", iso(-230), "useful", "useful"),
    mkReq("u_chris", "u_zoe", "Could you help me make my app icon not look like 2012?", "accepted", iso(-100), "okay", "useful"),
    mkReq("u_omar", "u_ben", "Want to team up for the cybersecurity/blockchain track?", "pending", iso(-40)),
    mkReq("u_tyler", "u_sofia", "Want to build an educational game for 4th graders?", "declined", iso(-120)),
  ].map((r) => ({ ...r, eventId: CROWNHACKS_ID }));

  const messages: Message[] = [
    { id: nid("m"), threadId: "t_savings", fromId: "system", body: "Team created by Sam. Connected suggested this team for 55% role coverage — backend and AI roles are open.", createdAt: iso(-200) },
    { id: nid("m"), threadId: "t_savings", fromId: "u_aisha", body: "In! I can pull the spending dataset tonight.", createdAt: iso(-178) },
    { id: nid("m"), threadId: "t_genome", fromId: "system", body: "Team formed: all 3 roles covered.", createdAt: iso(-210) },
  ];

  const missions: Mission[] = [];
  const notifications: Notification[] = [];

  const salt = "connected-demo-salt";
  const accounts: Account[] = [
    { userId: DEMO_USER_ID, email: DEMO_EMAIL, salt, hash: crypto.scryptSync(DEMO_PASSWORD, salt, 64).toString("hex"), createdAt: iso(-60 * 24) },
  ];

  const post = (authorId: string, kind: Post["kind"], body: string, minsAgo: number, likers: string[] = []): Post => {
    const t = tagText(body);
    return { id: nid("p"), authorId, kind, body, tags: [...t.skills, ...t.interests].slice(0, 6), eventId: CROWNHACKS_ID, likes: likers, createdAt: iso(-minsAgo) };
  };
  const posts: Post[] = [
    post("u_sam", "looking", "Our savings coach for first-gen students has 40 pilot users. Need a backend engineer + an AI/ML engineer this weekend. DM me 👋", 25, ["u_aisha", "u_taylor", "u_isabella"]),
    post("u_maya", "offering", "Doing 10-minute UX reviews of your prototype at the team-formation mixer until 4. Bring a Figma link.", 40, ["u_jordan", "u_leila", "u_noah", "u_zoe"]),
    post("u_leila", "looking", "Nursing student here — hospital shift scheduling is broken. Looking for builders who want a real healthcare problem.", 55, ["u_ava", "u_maya"]),
    post("u_kevin", "offering", "Mentor corner all afternoon. System design, debugging, or just getting unstuck — come say hi.", 70, ["u_noah", "u_hannah", "u_ethan", "u_emily", "u_alex"]),
    post("u_grace", "update", "VariantLens team formed in 20 minutes thanks to the mixer 🧬 Grace + Ravi + Nina. Bioinformatics track, here we come.", 90, ["u_ravi", "u_nina", "u_elena"]),
    post("u_noah", "looking", "First hackathon! I know a little JavaScript and I'm good at writing demo scripts. Any team need an extra pair of hands?", 110, ["u_kevin", "u_emily"]),
    post("u_diego", "looking", "Have a Jetson and a rover. Need someone who does computer vision or React for a Most Technical attempt.", 130, ["u_lucas"]),
    post("u_marcus", "offering", "Banking internship questions? I'm at the mentor corner until 3 — resumes, superdays, anything.", 150, ["u_isabella", "u_aisha"]),
  ];

  return {
    version: DB_VERSION,
    seededAt: now.toISOString(),
    profiles,
    events: events(now),
    memberships,
    requests,
    interests: [],
    teams,
    messages,
    missions,
    notifications,
    blocks: [],
    accounts,
    posts,
    views: [
      { viewerId: "u_alex", targetId: DEMO_USER_ID, at: iso(-35) },
      { viewerId: "u_maya", targetId: DEMO_USER_ID, at: iso(-80) },
      { viewerId: "u_sam", targetId: DEMO_USER_ID, at: iso(-150) },
    ],
    lounge: [
      ["u_emily", "Welcome to CrownHacks! 👋 Team-formation mixer is by the big windows. Come say hi if you don't have a team yet.", 180],
      ["u_noah", "First hackathon here — anyone need a frontend newbie who learns fast?", 150],
      ["u_kevin", "Mentors are at the corner table until 6. Bring your bugs.", 120],
      ["u_maya", "Doing quick UX reviews at the mixer for the next hour ✏️", 75],
      ["u_sam", "Still looking for a backend + AI person for a fintech savings app. Pilot users ready!", 50],
      ["u_zoe", "Pizza just arrived at Food & coffee 🍕", 22],
      ["u_alex", "Anyone else doing the Most Technical track? Would love to compare notes on LLM latency.", 9],
    ].map(([userId, body, mins], i) => ({ id: `lg_${i}`, eventId: CROWNHACKS_ID, userId: userId as string, body: body as string, createdAt: iso(-(mins as number)), reports: [] })),
    photos: [],
  };

  function mkReq(
    fromId: string,
    toId: string,
    ask: string,
    status: ConnectionRequest["status"],
    createdAt: string,
    fromRating?: "useful" | "okay",
    toRating?: "useful" | "okay",
  ): ConnectionRequest {
    return {
      id: nid("r"),
      fromId,
      toId,
      kind: "chat",
      ask,
      message: ask,
      status,
      createdAt,
      respondedAt: status === "pending" ? undefined : createdAt,
      meetingSpot: status === "accepted" ? "Team-formation mixer" : undefined,
      outcomes: fromRating ? { [fromId]: fromRating, [toId]: toRating ?? fromRating } : undefined,
    };
  }
}

/** A ready-made profile for judges who want to try the app in 10 seconds (fully editable). */
export const SAMPLE_JUDGE_PROFILE = {
  name: "",
  headline: "Finance student exploring AI startups",
  role: "student" as PersonRole,
  university: UNCC,
  major: "Finance",
  bio: "Interested in where AI and finance meet. Has a startup idea and wants to find people to build it with.",
  skills: [
    { skill: "finance", level: 3 as Level },
    { skill: "business-strategy", level: 2 as Level },
    { skill: "public-speaking", level: 2 as Level },
  ],
  interests: ["ai", "fintech", "startups"],
  gives: ["Financial modeling basics", "Practicing your pitch"],
  ask: "I want to build an AI startup but need a developer and a designer.",
  lookingFor: ["backend-engineer", "designer", "ml-engineer"],
  openTo: ["cofounder", "hackathon-team"] as CollabType[],
};
