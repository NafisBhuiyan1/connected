/**
 * DEMO DATA. Every person and event here is fictional. Coordinates are approximate neighborhood
 * points (rounded), never anyone's live location. Replace via src/data/source.ts with a real backend.
 */
import type { AudienceId, ChallengeId, CommunityEvent, DietId, FoodId, IncomingRequest, Person, TraitId } from './types';

const MIN = 60_000;
const quarter = () => Math.round(Date.now() / (15 * MIN)) * 15 * MIN;

type DoorSeed = { venueId: string; from: number; to: number; lengthMin: number; topics: string[]; audience: AudienceId[] };
type Extra = Pick<Person, 'bio' | 'traits' | 'helpTags' | 'languages' | 'yearsExp'>;
type Seed = Omit<Person, 'door' | 'isDemo' | keyof Extra | 'photo' | 'foods' | 'diet'> & { doorSeed?: DoorSeed };

/** What each demo person enjoys when meeting someone, and any dietary needs. */
const FOOD: Record<string, { foods: FoodId[]; diet: DietId[] }> = {
  maya: { foods: ['coffee', 'mediterranean', 'indian'], diet: [] },
  daniel: { foods: ['mexican', 'coffee', 'american'], diet: [] },
  noor: { foods: ['mediterranean', 'coffee', 'tea'], diet: ['halal'] },
  priya: { foods: ['indian', 'coffee', 'tea'], diet: ['vegetarian'] },
  marcus: { foods: ['american', 'coffee', 'italian'], diet: [] },
  grace: { foods: ['chinese', 'tea', 'bakery'], diet: [] },
  jordan: { foods: ['japanese', 'coffee', 'american'], diet: [] },
  sofia: { foods: ['mexican', 'coffee', 'bakery'], diet: [] },
  tomasz: { foods: ['american', 'coffee', 'italian'], diet: [] },
  ade: { foods: ['caribbean', 'coffee', 'mediterranean'], diet: ['no_alcohol'] },
  elena: { foods: ['coffee', 'bakery', 'mediterranean'], diet: [] },
  hannah: { foods: ['coffee', 'american', 'mexican'], diet: [] },
  aisha: { foods: ['mediterranean', 'tea', 'thai'], diet: ['halal'] },
  kevin: { foods: ['japanese', 'thai', 'tea'], diet: [] },
  rosa: { foods: ['mexican', 'coffee', 'bakery'], diet: [] },
  samuel: { foods: ['coffee', 'caribbean', 'italian'], diet: [] },
};

const x = (bio: string, traits: TraitId[], helpTags: ChallengeId[], languages: string[], yearsExp: number): Extra => ({ bio, traits, helpTags, languages, yearsExp });

/** The human side of each demo profile, written in their own voice. */
const EXTRA: Record<string, Extra> = {
  maya: x('I grew up in Gastonia and was the first in my family to finish college. I got into banking through an operations job nobody wanted, and I like helping people find side doors like that.', ['firstgen', 'senior'], ['network', 'interviews', 'hiring', 'start'], ['English'], 14),
  daniel: x('I cooked for nine years before a bootcamp got me into software. Happy to look at your projects or run a mock interview over coffee.', ['switcher', 'senior'], ['interviews', 'skills', 'switching'], ['English', 'Spanish'], 7),
  noor: x('I started on a help desk after moving from Jordan. Security felt out of reach until someone walked me through the certifications, so I try to pay that forward.', ['immigrant', 'near'], ['skills', 'credentials', 'start'], ['English', 'Arabic'], 4),
  priya: x('Trained in Kerala, re-licensed in North Carolina. The paperwork nearly broke me, so ask me anything about it.', ['immigrant', 'senior'], ['credentials', 'start', 'hiring'], ['English', 'Hindi'], 15),
  marcus: x('I read about 200 resumes a week for hospital roles. I\u2019ll tell you honestly what makes me stop scrolling.', ['hiring', 'senior'], ['resume', 'interviews', 'hiring'], ['English'], 11),
  grace: x('Came for grad school and stayed. I run a small CPA practice and remember how confusing licensing was with a degree from overseas.', ['immigrant', 'senior'], ['credentials', 'hiring'], ['English', 'Mandarin'], 16),
  jordan: x('Two years into a bank analyst program. I applied with no contacts and a state-school degree, so I know the cold-application route well.', ['near', 'firstgen'], ['interviews', 'network', 'resume'], ['English', 'Korean'], 2),
  sofia: x('Bootcamp grad, now testing healthcare software. Still close enough to the job hunt to remember every rejection email.', ['near', 'switcher'], ['start', 'skills', 'team'], ['English', 'Spanish'], 1),
  tomasz: x('Ten years turning wrenches, now running grid projects. If you work with your hands and want an office role, I\u2019ve been exactly there.', ['switcher', 'senior'], ['switching', 'resume', 'hiring'], ['English', 'Polish'], 18),
  ade: x('I practiced medicine in Lagos, then moved into clinical research here while sorting out credentials. It\u2019s a long road, but there are shortcuts.', ['immigrant', 'switcher'], ['credentials', 'switching', 'start'], ['English', 'Yoruba'], 9),
  elena: x('Eight years teaching math, now doing data for the transit agency. Teachers have more transferable skills than they think.', ['switcher', 'near'], ['switching', 'skills', 'resume'], ['English', 'Russian'], 3),
  hannah: x('I run the county\u2019s job training programs. Most people have no idea how much free training exists, and I love showing them.', ['hiring', 'senior'], ['hiring', 'start', 'skills'], ['English'], 12),
  aisha: x('Graphic designer turned product designer. I\u2019ll review your portfolio and be kind about it, mostly.', ['firstgen', 'senior'], ['resume', 'switching', 'interviews'], ['English', 'Arabic'], 9),
  kevin: x('Senior at UNC Charlotte and I run the startup club. Always looking for people to build weird things with at hackathons.', ['near'], ['team', 'network'], ['English', 'Vietnamese'], 0),
  rosa: x('Started as a bilingual teller at 19. Now I manage the branch and do the hiring. Banking has more doors in than people think.', ['firstgen', 'hiring'], ['hiring', 'interviews', 'start'], ['English', 'Spanish'], 13),
  samuel: x('Six years teaching middle school science before instructional design. Happy to talk about leaving the classroom without the guilt.', ['switcher', 'near'], ['switching', 'resume', 'skills'], ['English'], 2),
};

const SEEDS: Seed[] = [
  {
    id: 'maya', name: 'Maya Okafor', role: 'VP, Commercial Banking', org: 'Large bank, Uptown', status: 'experienced', field: 'finance',
    fieldPhrase: 'banking', interests: ['Fintech', 'Investing', 'Community work'], skills: ['Financial modeling', 'Excel', 'Public speaking'],
    helpsWith: ['Breaking into banking without connections', 'Analyst program interviews', 'What first-year analysts actually do'],
    offers: ['mentorship', 'advice', 'recruiting'], availability: ['today', 'week'], areaName: 'Uptown',
    coord: { latitude: 35.2262, longitude: -80.8442 }, meets: 'public',
    hook: 'work in commercial banking and started out as a first-generation college student',
    questions: ['What did your first year in banking look like?', 'How do analyst programs find people without banking contacts?', 'What should I learn before applying?'],
    demoResponse: 'accept',
    doorSeed: { venueId: 'main-library', from: -45, to: 120, lengthMin: 15, topics: ['Getting a first job in finance', 'Interview prep'], audience: ['students', 'early'] },
  },
  {
    id: 'daniel', name: 'Daniel Reyes', role: 'Senior Software Engineer', org: 'Logistics software company', status: 'experienced', field: 'tech',
    fieldPhrase: 'software engineering', interests: ['Open source', 'Hackathons', 'AI'], skills: ['JavaScript', 'Python', 'SQL'],
    helpsWith: ['Getting a first engineering job after a bootcamp', 'Practicing technical interviews', 'Reading job posts realistically'],
    offers: ['mentorship', 'advice', 'collab'], availability: ['week', 'evenings'], areaName: 'South End',
    coord: { latitude: 35.2108, longitude: -80.8601 }, meets: 'both',
    hook: 'moved into engineering through a bootcamp after years working in restaurant kitchens',
    questions: ['What made the difference in landing your first engineering role?', 'How do you prep for a technical interview without a CS degree?', 'Which job requirements can I ignore?'],
    demoResponse: 'accept',
    doorSeed: { venueId: 'railtrail-cafe', from: 60, to: 210, lengthMin: 15, topics: ['Bootcamp to first job', 'Technical interviews'], audience: ['anyone'] },
  },
  {
    id: 'priya', name: 'Priya Nair', role: 'Nurse Practitioner', org: 'Community health clinic', status: 'experienced', field: 'health',
    fieldPhrase: 'nursing', interests: ['Public health', 'Teaching', 'Community work'], skills: ['Clinical care', 'Research', 'Spanish'],
    helpsWith: ['Transferring a nursing license from abroad', 'Choosing a nursing pathway', 'What clinics look for in new hires'],
    offers: ['mentorship', 'advice'], availability: ['weekends'], areaName: 'Plaza Midwood',
    coord: { latitude: 35.2241, longitude: -80.8047 }, meets: 'public',
    hook: 'trained as a nurse in India and re-licensed here',
    questions: ['What was the hardest part of transferring your license?', 'Which pathway would you pick if you started over?', 'What do clinics look for in new hires?'],
    demoResponse: 'accept',
  },
  {
    id: 'marcus', name: 'Marcus Bell', role: 'Talent Acquisition Lead', org: 'Regional hospital system', status: 'experienced', field: 'health',
    fieldPhrase: 'healthcare', interests: ['Public health', 'Writing'], skills: ['Customer service', 'Public speaking'],
    helpsWith: ['What recruiters notice first on a resume', 'Hospital jobs that don’t need a degree', 'Answering “tell me about yourself”'],
    offers: ['recruiting', 'advice'], availability: ['week', 'evenings'], areaName: 'Dilworth',
    coord: { latitude: 35.2043, longitude: -80.8467 }, meets: 'both',
    hook: 'recruit for entry-level and clinical roles at a hospital system',
    questions: ['What do you look at first on a resume?', 'Which entry-level roles lead somewhere?', 'How should I explain a gap in my work history?'],
    demoResponse: 'accept',
  },
  {
    id: 'grace', name: 'Grace Liu', role: 'CPA, Financial Planner', org: 'Independent practice', status: 'experienced', field: 'finance',
    fieldPhrase: 'accounting', interests: ['Investing', 'Startups'], skills: ['Excel', 'Financial modeling'],
    helpsWith: ['The CPA path if you studied abroad', 'Getting hired at small accounting firms'],
    offers: ['mentorship', 'advice'], availability: ['weekends'], areaName: 'SouthPark',
    coord: { latitude: 35.1542, longitude: -80.8263 }, meets: 'public',
    hook: 'came here as an international student and built an accounting practice',
    questions: ['How did you handle CPA requirements with a degree from abroad?', 'Do small firms hire differently?'],
    demoResponse: 'decline',
  },
  {
    id: 'jordan', name: 'Jordan Kim', role: 'Risk Analyst', org: 'Bank, two years in', status: 'early', field: 'finance',
    fieldPhrase: 'risk and banking', interests: ['Data & analytics', 'Fintech', 'Investing'], skills: ['SQL', 'Excel', 'Python'],
    helpsWith: ['What an analyst program is like from the inside', 'Learning SQL on the job'],
    offers: ['peers', 'advice'], availability: ['evenings', 'week'], areaName: 'South End',
    coord: { latitude: 35.2149, longitude: -80.8552 }, meets: 'both',
    hook: 'joined an analyst program two years ago without any industry contacts',
    questions: ['What surprised you in your first year?', 'How did you prepare for the analyst interviews?'],
    demoResponse: 'accept',
  },
  {
    id: 'noor', name: 'Noor Haddad', role: 'Security Analyst', org: 'City IT department', status: 'early', field: 'tech',
    fieldPhrase: 'cybersecurity', interests: ['Cybersecurity', 'Hackathons', 'Community work'], skills: ['Python', 'Research'],
    helpsWith: ['Moving from IT support into security', 'Which certifications are worth paying for'],
    offers: ['advice', 'peers', 'collab'], availability: ['evenings', 'weekends'], areaName: 'Camp North End',
    coord: { latitude: 35.2431, longitude: -80.8371 }, meets: 'both',
    hook: 'moved from help desk support into security after arriving in Charlotte four years ago',
    questions: ['How did you move from help desk into security?', 'Which certification would you do first?'],
    demoResponse: 'accept',
  },
  {
    id: 'sofia', name: 'Sofia Alvarez', role: 'QA Engineer', org: 'Healthcare software startup', status: 'early', field: 'tech',
    fieldPhrase: 'software testing', interests: ['Startups', 'Product', 'Hackathons'], skills: ['JavaScript', 'Spanish', 'Customer service'],
    helpsWith: ['Getting hired after a bootcamp', 'What QA work is like'],
    offers: ['peers', 'collab', 'advice'], availability: ['week', 'evenings'], areaName: 'NoDa',
    coord: { latitude: 35.2476, longitude: -80.8058 }, meets: 'both',
    hook: 'finished a bootcamp last year and still remembers the job search clearly',
    questions: ['What helped most in your job search?', 'How did you choose QA?'],
    demoResponse: 'accept',
    doorSeed: { venueId: 'noda-coffee', from: 180, to: 300, lengthMin: 20, topics: ['Bootcamp job search', 'Portfolio projects'], audience: ['changing', 'students', 'early'] },
  },
  {
    id: 'tomasz', name: 'Tomasz Kowalski', role: 'Project Manager', org: 'Regional utility', status: 'experienced', field: 'energy',
    fieldPhrase: 'energy project management', interests: ['Sustainability', 'Data & analytics'], skills: ['Project management', 'CAD'],
    helpsWith: ['Turning hands-on trade experience into a resume', 'Whether a PMP is worth it', 'Moving from field work to office roles'],
    offers: ['mentorship', 'advice', 'recruiting'], availability: ['week'], areaName: 'Ballantyne',
    coord: { latitude: 35.0551, longitude: -80.8478 }, meets: 'public',
    hook: 'spent ten years as a mechanic before moving into project management',
    questions: ['How did you describe trade work on your first office resume?', 'Was the PMP worth it for you?'],
    demoResponse: 'accept',
  },
  {
    id: 'ade', name: 'Ade Bello', role: 'Clinical Research Coordinator', org: 'Academic medical center', status: 'changing', field: 'health',
    fieldPhrase: 'clinical research', interests: ['Public health', 'Research', 'Data & analytics'], skills: ['Research', 'Clinical care', 'Writing'],
    helpsWith: ['Clinical research careers', 'Working through credential recognition'],
    offers: ['peers', 'advice'], availability: ['weekends'], areaName: 'University City',
    coord: { latitude: 35.3082, longitude: -80.7356 }, meets: 'both',
    hook: 'trained as a doctor abroad and moved into clinical research here',
    questions: ['How did you find your first research role?', 'What helped with credential recognition?'],
    demoResponse: 'accept',
  },
  {
    id: 'elena', name: 'Elena Petrova', role: 'Data Analyst', org: 'Public transit agency', status: 'changing', field: 'public',
    fieldPhrase: 'data analysis', interests: ['Data & analytics', 'Teaching', 'Community work'], skills: ['SQL', 'Excel', 'Teaching'],
    helpsWith: ['Leaving teaching for analytics', 'Building a first portfolio project'],
    offers: ['mentorship', 'peers', 'advice'], availability: ['today', 'evenings'], areaName: 'Uptown',
    coord: { latitude: 35.2298, longitude: -80.8409 }, meets: 'public',
    hook: 'taught high school math for eight years before becoming a data analyst',
    questions: ['How did you know it was time to leave teaching?', 'Which course actually helped you get hired?'],
    demoResponse: 'accept',
    doorSeed: { venueId: 'main-library', from: -15, to: 90, lengthMin: 15, topics: ['Switching into data', 'SQL basics'], audience: ['changing', 'anyone'] },
  },
  {
    id: 'hannah', name: 'Hannah Brooks', role: 'Workforce Program Manager', org: 'County workforce office', status: 'experienced', field: 'public',
    fieldPhrase: 'workforce development', interests: ['Community work', 'Public health'], skills: ['Project management', 'Public speaking'],
    helpsWith: ['Free job training programs', 'How public-sector applications work', 'Finding paid apprenticeships'],
    offers: ['advice', 'recruiting'], availability: ['week'], areaName: 'West End',
    coord: { latitude: 35.2352, longitude: -80.8588 }, meets: 'both',
    hook: 'run job training programs for the county',
    questions: ['Which free programs fill up fastest?', 'What trips people up on public-sector applications?'],
    demoResponse: 'accept',
  },
  {
    id: 'aisha', name: 'Aisha Rahman', role: 'Senior Product Designer', org: 'Fintech startup', status: 'experienced', field: 'design',
    fieldPhrase: 'product design', interests: ['UX research', 'Product', 'Fintech'], skills: ['Figma', 'Research', 'Writing'],
    helpsWith: ['Reviewing a design portfolio', 'How design interviews work', 'Moving from graphic design into UX'],
    offers: ['mentorship', 'advice', 'collab'], availability: ['evenings'], areaName: 'Plaza Midwood',
    coord: { latitude: 35.2212, longitude: -80.8012 }, meets: 'video',
    hook: 'moved from graphic design into product design',
    questions: ['What makes a case study stand out?', 'What should I learn first coming from graphic design?'],
    demoResponse: 'accept',
  },
  {
    id: 'kevin', name: 'Kevin Tran', role: 'Marketing student', org: 'University, senior year', status: 'student', field: 'design',
    fieldPhrase: 'marketing', interests: ['Startups', 'Writing', 'Hackathons'], skills: ['Marketing', 'Figma', 'Writing'],
    helpsWith: ['Finding hackathon teammates', 'Campus career fairs'],
    offers: ['peers', 'collab'], availability: ['weekends', 'evenings'], areaName: 'University City',
    coord: { latitude: 35.3041, longitude: -80.7298 }, meets: 'both',
    hook: 'organize the campus startup club',
    questions: ['Which hackathons are worth going to?', 'Want to team up for the next one?'],
    demoResponse: 'accept',
  },
  {
    id: 'rosa', name: 'Rosa Martínez', role: 'Branch Manager', org: 'Community credit union', status: 'experienced', field: 'finance',
    fieldPhrase: 'banking', interests: ['Community work', 'Investing'], skills: ['Spanish', 'Customer service', 'Public speaking'],
    helpsWith: ['Starting in banking without a finance degree', 'How bilingual skills help in banking'],
    offers: ['mentorship', 'recruiting', 'advice'], availability: ['week', 'today'], areaName: 'NoDa',
    coord: { latitude: 35.2441, longitude: -80.8103 }, meets: 'public',
    hook: 'started as a bilingual teller and now hire for a branch',
    questions: ['What did your first year as a teller look like?', 'How do you decide who to hire?'],
    demoResponse: 'accept',
  },
  {
    id: 'samuel', name: 'Samuel Osei', role: 'Teacher turned instructional designer', org: 'School district', status: 'changing', field: 'education',
    fieldPhrase: 'instructional design', interests: ['Teaching', 'AI', 'Writing'], skills: ['Teaching', 'Writing', 'Project management'],
    helpsWith: ['Leaving the classroom', 'Instructional design portfolios'],
    offers: ['peers', 'advice'], availability: ['evenings'], areaName: 'Dilworth',
    coord: { latitude: 35.2071, longitude: -80.8512 }, meets: 'both',
    hook: 'taught middle school science for six years before moving into instructional design',
    questions: ['What did your first portfolio include?', 'How did you explain the switch in interviews?'],
    demoResponse: 'accept',
  },
];

/** Builds demo people with Open Door times relative to now, so the demo always has something live. */
export function buildDemoPeople(): Person[] {
  const base = quarter();
  return SEEDS.map(({ doorSeed, ...p }) => ({
    ...p,
    ...EXTRA[p.id],
    ...FOOD[p.id],
    isDemo: true as const,
    door: doorSeed
      ? {
          id: `door-${p.id}`,
          venueId: doorSeed.venueId,
          start: base + doorSeed.from * MIN,
          end: base + doorSeed.to * MIN,
          lengthMin: doorSeed.lengthMin,
          topics: doorSeed.topics,
          audience: doorSeed.audience,
        }
      : undefined,
  }));
}

function day(offsetDays: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function buildDemoEvents(): CommunityEvent[] {
  const e = (x: Omit<CommunityEvent, 'isDemo'>): CommunityEvent => ({ ...x, isDemo: true });
  return [
    e({ id: 'ev1', title: 'Queen City Tech Mixer', category: 'networking', field: 'tech', host: 'Local tech meetup group', venue: 'Brewery taproom, South End', areaName: 'South End', coord: { latitude: 35.2097, longitude: -80.8613 }, start: day(1, 18), end: day(1, 20), cost: 'Free', description: 'Casual mixer for engineers, designers and anyone curious about tech jobs in Charlotte. Name tags by role, no pitches.' }),
    e({ id: 'ev2', title: 'Fintech Careers Night', category: 'career', field: 'finance', host: 'Fintech professional group', venue: 'Coworking space, Uptown', areaName: 'Uptown', coord: { latitude: 35.2287, longitude: -80.8415 }, start: day(3, 17, 30), end: day(3, 19, 30), cost: 'Free', description: 'Short talks from people in banking technology, then small-group Q&A by role: analyst, engineer, product.' }),
    e({ id: 'ev3', title: 'Civic Data Hackathon', category: 'hackathon', field: 'public', host: 'Civic tech volunteers', venue: 'Main Library, Uptown', areaName: 'Uptown', coord: { latitude: 35.2273, longitude: -80.8395 }, start: day(9, 9), end: day(10, 17), cost: 'Free', description: 'Two-day hackathon on open city data: transit, housing and parks. Beginners welcome; teams form on day one.' }),
    e({ id: 'ev4', title: 'Healthcare Careers Open House', category: 'career', field: 'health', host: 'Hospital system recruiting team', venue: 'Community college campus', areaName: 'Central Ave', coord: { latitude: 35.2188, longitude: -80.8172 }, start: day(5, 10), end: day(5, 13), cost: 'Free', description: 'Meet recruiters for entry-level clinical and non-clinical roles. Bring a resume; on-the-spot reviews from 11am.' }),
    e({ id: 'ev5', title: 'Resume Review Drop-in', category: 'career', host: 'Public library career center', venue: 'SouthPark regional library', areaName: 'SouthPark', coord: { latitude: 35.152, longitude: -80.829 }, start: day(2, 14), end: day(2, 16), cost: 'Free', description: 'Volunteer reviewers from local companies. Ten minutes each, first come first served.' }),
    e({ id: 'ev6', title: 'Student Hackathon Weekend', category: 'hackathon', field: 'tech', host: 'University computing club', venue: 'University campus, engineering building', areaName: 'University City', coord: { latitude: 35.3076, longitude: -80.7339 }, start: day(16, 10), end: day(17, 16), cost: 'Free for students', description: '24 hours of building with mentors on call. Open to all majors; no experience needed.' }),
    e({ id: 'ev7', title: 'Design Portfolio Night', category: 'networking', field: 'design', host: 'Local design community', venue: 'Studio space, NoDa', areaName: 'NoDa', coord: { latitude: 35.2459, longitude: -80.8027 }, start: day(6, 18, 30), end: day(6, 20, 30), cost: '$5', description: 'Bring a laptop and one project. Small tables of three with a working designer at each.' }),
    e({ id: 'ev8', title: 'Career Changers Meetup', category: 'networking', host: 'Peer group for career changers', venue: 'Camp North End food hall', areaName: 'Camp North End', coord: { latitude: 35.2445, longitude: -80.8352 }, start: day(4, 18), end: day(4, 19, 30), cost: 'Free', description: 'Monthly meetup for people moving into a new field. Short intros, then open conversation.' }),
    e({ id: 'ev9', title: 'Energy & Engineering Breakfast', category: 'networking', field: 'energy', host: 'Regional engineering society', venue: 'Hotel conference room, Ballantyne', areaName: 'Ballantyne', coord: { latitude: 35.0538, longitude: -80.8452 }, start: day(12, 7, 30), end: day(12, 9), cost: '$15', description: 'Breakfast and a panel on grid modernization careers. Students get in free with ID.' }),
    e({ id: 'ev10', title: 'Women in Finance Coffee', category: 'networking', field: 'finance', host: 'Professional women’s network', venue: 'Coffee shop, Dilworth', areaName: 'Dilworth', coord: { latitude: 35.2061, longitude: -80.8475 }, start: day(8, 8), end: day(8, 9, 30), cost: 'Free', description: 'Small-group coffee for anyone working in or moving into finance.' }),
  ];
}

export const DEMO_INCOMING: IncomingRequest[] = [
  { id: 'in1', name: 'Lena Haddad', role: 'Junior studying economics', status: 'student', field: 'finance', message: 'Hi! I’m a junior studying economics and the first in my family to go to college. Would you have 15 minutes to talk about how you chose your first job? Thanks for offering this.', state: 'new' },
  { id: 'in2', name: 'Omar Siddiqui', role: 'Civil engineer, new to Charlotte', status: 'changing', field: 'energy', message: 'Hello, I worked as a civil engineer for six years before moving here in March. I’m trying to understand how to present that experience to local employers. Could we talk briefly?', state: 'new' },
];
