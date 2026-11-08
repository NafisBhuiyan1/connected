import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { Area, AudienceId, AvailabilityId, ChallengeId, DietId, EventCategory, FieldId, FoodId, GoalId, MeetMode, StatusId, TraitId, Venue } from './types';

type Icon = ComponentProps<typeof Ionicons>['name'];

export const CHARLOTTE_CENTER = { latitude: 35.2271, longitude: -80.8431 };

export const FIELDS: { id: FieldId; label: string; icon: Icon }[] = [
  { id: 'finance', label: 'Finance & banking', icon: 'trending-up-outline' },
  { id: 'tech', label: 'Technology', icon: 'code-slash-outline' },
  { id: 'health', label: 'Healthcare', icon: 'medkit-outline' },
  { id: 'energy', label: 'Energy & engineering', icon: 'flash-outline' },
  { id: 'design', label: 'Design & marketing', icon: 'color-palette-outline' },
  { id: 'public', label: 'Public service & nonprofits', icon: 'people-outline' },
  { id: 'education', label: 'Education', icon: 'school-outline' },
];

export const INTERESTS = [
  'Fintech', 'Data & analytics', 'AI', 'Cybersecurity', 'Product', 'UX research', 'Startups', 'Sustainability',
  'Public health', 'Community work', 'Sales', 'Investing', 'Teaching', 'Writing', 'Hackathons', 'Open source',
];

export const SKILLS = [
  'Excel', 'SQL', 'Python', 'JavaScript', 'Figma', 'Project management', 'Public speaking', 'Customer service',
  'Spanish', 'Research', 'Writing', 'Financial modeling', 'Clinical care', 'CAD', 'Marketing', 'Teaching',
];

export const GOALS: { id: GoalId; label: string; hint: string; verb: string; icon: Icon }[] = [
  { id: 'mentorship', label: 'Mentorship', hint: 'Someone further along to learn from', verb: 'looking for a mentor', icon: 'compass-outline' },
  { id: 'advice', label: 'Career advice', hint: 'A quick, honest take on your next step', verb: 'looking for career advice', icon: 'chatbubble-ellipses-outline' },
  { id: 'peers', label: 'Peers', hint: 'People at your stage to swap notes with', verb: 'hoping to meet peers', icon: 'people-circle-outline' },
  { id: 'collab', label: 'Collaborators', hint: 'Build a project or join a team', verb: 'looking for collaborators', icon: 'construct-outline' },
  { id: 'recruiting', label: 'Recruiting insights', hint: 'How hiring actually works here', verb: 'trying to understand how hiring works', icon: 'briefcase-outline' },
  { id: 'other', label: 'Something else', hint: 'Tell us in a few words', verb: 'hoping to connect', icon: 'ellipsis-horizontal-circle-outline' },
];

export const STATUSES: { id: StatusId; label: string; hint: string; icon: Icon }[] = [
  { id: 'student', label: 'Student', hint: 'In school, college or a bootcamp', icon: 'school-outline' },
  { id: 'early', label: 'Early in my career', hint: 'Roughly my first five years of work', icon: 'leaf-outline' },
  { id: 'experienced', label: 'Experienced', hint: 'Several years in, happy to give back', icon: 'ribbon-outline' },
  { id: 'changing', label: 'Changing careers', hint: 'Moving from one field into another', icon: 'swap-horizontal-outline' },
  { id: 'between', label: 'Between jobs', hint: 'Looking for my next role', icon: 'search-outline' },
];

export const CHALLENGES: { id: ChallengeId; label: string; icon: Icon; theyHelp: string }[] = [
  { id: 'start', label: 'Not sure where to start', icon: 'map-outline', theyHelp: 'figuring out where to start' },
  { id: 'network', label: 'I don\u2019t know anyone in the field', icon: 'person-add-outline', theyHelp: 'meeting people in the field' },
  { id: 'interviews', label: 'Getting through interviews', icon: 'mic-outline', theyHelp: 'interview prep' },
  { id: 'resume', label: 'My resume isn\u2019t landing', icon: 'document-text-outline', theyHelp: 'resumes that get noticed' },
  { id: 'credentials', label: 'Credentials or licenses from abroad', icon: 'globe-outline', theyHelp: 'credentials from abroad' },
  { id: 'switching', label: 'Explaining a career switch', icon: 'swap-horizontal-outline', theyHelp: 'telling a career-change story' },
  { id: 'hiring', label: 'Understanding how hiring works here', icon: 'briefcase-outline', theyHelp: 'how hiring works here' },
  { id: 'skills', label: 'Knowing which skills to learn next', icon: 'bulb-outline', theyHelp: 'what to learn next' },
  { id: 'team', label: 'Finding people to build with', icon: 'construct-outline', theyHelp: 'finding a team' },
];

export const TRAITS: { id: TraitId; label: string; hint: string; icon: Icon; common: string }[] = [
  { id: 'firstgen', label: 'First-generation professionals', hint: 'Figured it out without a roadmap', icon: 'flag-outline', common: 'Both first-gen' },
  { id: 'immigrant', label: 'People who moved here from abroad', hint: 'Rebuilt a career in a new country', icon: 'airplane-outline', common: 'Both moved here from abroad' },
  { id: 'switcher', label: 'People who changed careers', hint: 'Made the jump you\u2019re making', icon: 'swap-horizontal-outline', common: 'Changed careers too' },
  { id: 'senior', label: 'Senior people in my field', hint: 'Years of experience and a wide view', icon: 'ribbon-outline', common: 'Years in the field' },
  { id: 'near', label: 'Someone a few years ahead', hint: 'Close enough to remember what it was like', icon: 'footsteps-outline', common: 'A few years ahead' },
  { id: 'hiring', label: 'Recruiters & hiring managers', hint: 'The people who decide who gets hired', icon: 'briefcase-outline', common: 'Involved in hiring' },
];

export const LANGUAGES = ['English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'French', 'Vietnamese', 'Portuguese', 'Korean', 'Polish', 'Russian', 'Yoruba', 'Tagalog'];

export const MEET_MODES: { id: MeetMode; label: string; icon: Icon }[] = [
  { id: 'inperson', label: 'In person', icon: 'cafe-outline' },
  { id: 'video', label: 'Video call', icon: 'videocam-outline' },
  { id: 'either', label: 'Either works', icon: 'swap-vertical-outline' },
];

export const AUDIENCES: { id: AudienceId; label: string }[] = [
  { id: 'anyone', label: 'Anyone on Connected' },
  { id: 'students', label: 'Students' },
  { id: 'early', label: 'Early career' },
  { id: 'changing', label: 'Career changers' },
  { id: 'same-field', label: 'People in my field' },
];

export const AVAILABILITY: { id: AvailabilityId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
];

export const TRAVEL_MI = [1, 3, 5, 10, 25];

export const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'networking', label: 'Networking' },
  { id: 'career', label: 'Career' },
  { id: 'hackathon', label: 'Hackathons' },
];

export const AREAS: Area[] = [
  { id: 'uptown', name: 'Uptown', center: { latitude: 35.2271, longitude: -80.8431 } },
  { id: 'southend', name: 'South End', center: { latitude: 35.212, longitude: -80.859 } },
  { id: 'noda', name: 'NoDa', center: { latitude: 35.2465, longitude: -80.804 } },
  { id: 'plazamidwood', name: 'Plaza Midwood', center: { latitude: 35.223, longitude: -80.803 } },
  { id: 'dilworth', name: 'Dilworth', center: { latitude: 35.205, longitude: -80.848 } },
  { id: 'university', name: 'University City', center: { latitude: 35.307, longitude: -80.733 } },
  { id: 'southpark', name: 'SouthPark', center: { latitude: 35.153, longitude: -80.827 } },
  { id: 'ballantyne', name: 'Ballantyne', center: { latitude: 35.053, longitude: -80.849 } },
];

/** Public, staffed places suitable for a first conversation. */
export const VENUES: Venue[] = [
  { id: 'main-library', name: 'Main Library', area: 'Uptown', detail: 'Ground-floor seating near the entrance', coord: { latitude: 35.2273, longitude: -80.8395 } },
  { id: 'railtrail-cafe', name: 'Rail Trail café patio', area: 'South End', detail: 'Public patio by the light-rail stop', coord: { latitude: 35.2125, longitude: -80.8575 } },
  { id: 'noda-coffee', name: 'Coffee shop on N. Davidson St', area: 'NoDa', detail: 'Front tables, open seating', coord: { latitude: 35.2468, longitude: -80.8035 } },
  { id: 'campus-library', name: 'University campus library', area: 'University City', detail: 'Public first floor', coord: { latitude: 35.3058, longitude: -80.7322 } },
  { id: 'food-hall', name: 'Camp North End food hall', area: 'Camp North End', detail: 'Shared tables by the main doors', coord: { latitude: 35.2445, longitude: -80.8352 } },
  { id: 'southpark-library', name: 'SouthPark regional library', area: 'SouthPark', detail: 'Lobby study tables', coord: { latitude: 35.152, longitude: -80.829 } },
];

export const fieldLabel = (id: FieldId | null | undefined) => FIELDS.find((f) => f.id === id)?.label ?? 'Not set';
export const goalLabel = (id: GoalId) => GOALS.find((g) => g.id === id)?.label ?? id;
export const statusLabel = (id: StatusId | null | undefined) => STATUSES.find((s) => s.id === id)?.label ?? 'Not set';
export const audienceLabel = (id: AudienceId) => AUDIENCES.find((a) => a.id === id)?.label ?? id;
export const availabilityLabel = (id: AvailabilityId) => AVAILABILITY.find((a) => a.id === id)?.label ?? id;
export const venueById = (id: string) => VENUES.find((v) => v.id === id) ?? VENUES[0];

export const challengeLabel = (id: ChallengeId) => CHALLENGES.find((c) => c.id === id)?.label ?? id;
export const traitLabel = (id: TraitId) => TRAITS.find((t) => t.id === id)?.label ?? id;

/** Food and drink choices. `q` is the OpenStreetMap search word; `cuisines` are OSM cuisine tags that count as a match. */
export const FOODS: { id: FoodId; label: string; icon: Icon; q: string; cuisines: string[]; shops?: string[] }[] = [
  { id: 'coffee', label: 'Coffee', icon: 'cafe-outline', q: 'cafe', cuisines: ['coffee_shop', 'coffee'] },
  { id: 'tea', label: 'Tea & boba', icon: 'leaf-outline', q: 'bubble tea', cuisines: ['bubble_tea', 'tea'] },
  { id: 'bakery', label: 'Bakery & brunch', icon: 'restaurant-outline', q: 'bakery', cuisines: ['breakfast', 'brunch', 'bakery', 'crepe', 'donut'], shops: ['bakery', 'pastry'] },
  { id: 'mediterranean', label: 'Mediterranean', icon: 'sunny-outline', q: 'mediterranean', cuisines: ['mediterranean', 'greek', 'lebanese', 'turkish', 'middle_eastern', 'falafel', 'kebab'] },
  { id: 'mexican', label: 'Mexican & Latin', icon: 'flame-outline', q: 'mexican', cuisines: ['mexican', 'latin_american', 'tex-mex', 'tacos', 'salvadoran', 'colombian', 'peruvian'] },
  { id: 'indian', label: 'Indian', icon: 'bonfire-outline', q: 'indian', cuisines: ['indian', 'pakistani', 'nepalese', 'bangladeshi'] },
  { id: 'japanese', label: 'Japanese', icon: 'fish-outline', q: 'sushi', cuisines: ['japanese', 'sushi', 'ramen'] },
  { id: 'chinese', label: 'Chinese', icon: 'restaurant-outline', q: 'chinese', cuisines: ['chinese', 'dim_sum', 'szechuan', 'cantonese'] },
  { id: 'thai', label: 'Thai & Vietnamese', icon: 'nutrition-outline', q: 'thai', cuisines: ['thai', 'vietnamese', 'pho'] },
  { id: 'italian', label: 'Italian & pizza', icon: 'pizza-outline', q: 'italian', cuisines: ['italian', 'pizza'] },
  { id: 'american', label: 'Burgers & BBQ', icon: 'fast-food-outline', q: 'barbecue', cuisines: ['american', 'burger', 'bbq', 'barbecue', 'southern', 'chicken', 'sandwich'] },
  { id: 'caribbean', label: 'Caribbean & African', icon: 'earth-outline', q: 'caribbean', cuisines: ['caribbean', 'jamaican', 'african', 'ethiopian', 'nigerian', 'west_african'] },
];

export const DIETS: { id: DietId; label: string; osm?: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', osm: 'diet:vegetarian' },
  { id: 'vegan', label: 'Vegan', osm: 'diet:vegan' },
  { id: 'halal', label: 'Halal', osm: 'diet:halal' },
  { id: 'kosher', label: 'Kosher', osm: 'diet:kosher' },
  { id: 'gluten_free', label: 'Gluten-free', osm: 'diet:gluten_free' },
  { id: 'no_alcohol', label: 'Alcohol-free spots' },
];

export const foodLabel = (id: FoodId) => FOODS.find((f) => f.id === id)?.label ?? id;
export const dietLabel = (id: DietId) => DIETS.find((d) => d.id === id)?.label ?? id;
