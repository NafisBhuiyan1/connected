export type LatLng = { latitude: number; longitude: number };

export type FieldId = 'finance' | 'tech' | 'health' | 'energy' | 'design' | 'public' | 'education';
export type GoalId = 'mentorship' | 'advice' | 'peers' | 'collab' | 'recruiting' | 'other';
export type StatusId = 'student' | 'early' | 'experienced' | 'changing' | 'between';
export type AudienceId = 'anyone' | 'students' | 'early' | 'changing' | 'same-field';
export type AvailabilityId = 'today' | 'week' | 'weekends' | 'evenings';
export type Mode = 'seeking' | 'offering' | 'both';
export type ShareMode = 'area' | 'public';
export type MeetMode = 'inperson' | 'video' | 'either';
/** Things a person is stuck on; mentors list the ones they're good at helping with. */
export type ChallengeId = 'start' | 'network' | 'interviews' | 'resume' | 'credentials' | 'switching' | 'hiring' | 'skills' | 'team';
/** Backgrounds and roles people can share or look for. */
export type TraitId = 'firstgen' | 'immigrant' | 'switcher' | 'senior' | 'near' | 'hiring';
/** Food and drink people enjoy when meeting someone. */
export type FoodId = 'coffee' | 'tea' | 'bakery' | 'mediterranean' | 'mexican' | 'indian' | 'japanese' | 'chinese' | 'thai' | 'italian' | 'american' | 'caribbean';
export type DietId = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free' | 'no_alcohol';
export type EventCategory = 'networking' | 'career' | 'hackathon';

export type Area = { id: string; name: string; center: LatLng };
export type Venue = { id: string; name: string; area: string; detail: string; coord: LatLng };

/** An Open Door offer: a short conversation at a public place, in a time window. Times are epoch ms. */
export type OpenDoor = {
  id: string;
  venueId: string;
  start: number;
  end: number;
  lengthMin: number;
  topics: string[];
  audience: AudienceId[];
  endedAt?: number;
};

/** A person who opted in to nearby discovery. `coord` is an approximate area, never a live location. */
export type Person = {
  id: string;
  name: string;
  role: string;
  org: string;
  status: StatusId;
  field: FieldId;
  fieldPhrase: string;
  interests: string[];
  skills: string[];
  helpsWith: string[];
  offers: GoalId[];
  availability: AvailabilityId[];
  areaName: string;
  coord: LatLng;
  meets: 'public' | 'video' | 'both';
  hook: string;
  questions: string[];
  /** First-person intro, written by the person. */
  bio: string;
  traits: TraitId[];
  helpTags: ChallengeId[];
  languages: string[];
  yearsExp: number;
  foods: FoodId[];
  diet: DietId[];
  /** Profile photo URL, when the person uploaded one. Demo profiles have none. */
  photo?: string;
  door?: OpenDoor;
  /** Demo only: how the simulated reply goes. */
  demoResponse?: 'accept' | 'decline';
  /** True for built-in demo profiles; false for real people from the backend. */
  isDemo: boolean;
  /** Real users who share "public places only" have no area; `coord` is then a placeholder. */
  areaHidden?: boolean;
};

export type NearbyPerson = Person & { distanceMi: number };

export type CommunityEvent = {
  id: string;
  title: string;
  category: EventCategory;
  field?: FieldId;
  host: string;
  venue: string;
  areaName: string;
  coord: LatLng;
  start: number;
  end: number;
  cost: string;
  description: string;
  /** False for real events pulled live from Meetup / Devpost. */
  isDemo: boolean;
  /** Photo from the event listing (live events only). */
  image?: string;
  /** Link to the original listing. */
  url?: string;
  /** Where a live event came from, e.g. "Meetup" or "Devpost". */
  source?: string;
  online?: boolean;
};

export type RequestStatus = 'requested' | 'accepted' | 'declined' | 'cancelled';
export type ConnectionRequest = {
  id: string;
  personId: string;
  message: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  respondAt: number;
  /** Stored in the backend (real person) rather than simulated on the phone. */
  remote?: boolean;
  /** For remote requests: the other person sent it to you. */
  incoming?: boolean;
};
export type Message = { id: string; from: 'me' | 'them'; text: string; at: number; demo?: boolean };

export type IncomingRequest = {
  id: string;
  name: string;
  role: string;
  status: StatusId;
  field: FieldId;
  message: string;
  doorId?: string;
  state: 'new' | 'accepted' | 'declined';
};

export type Prefs = {
  /** The field you want to grow in. */
  field: FieldId | null;
  /** For career changers: the field you're coming from. */
  fromField: FieldId | null;
  challenges: ChallengeId[];
  wantTraits: TraitId[];
  languages: string[];
  meetMode: MeetMode;
  foods: FoodId[];
  diet: DietId[];
  interests: string[];
  skills: string[];
  goals: GoalId[];
  goalOther: string;
  travelMi: number;
  mode: Mode;
  shareMode: ShareMode;
  discoverable: boolean;
  availability: AvailabilityId[];
};

export type Profile = {
  /** First name. */
  name: string;
  lastName: string;
  status: StatusId | null;
  org: string;
  intro: string;
  /** What you could help others with (shown when offering help). */
  offer: string;
  /** Local file URI of your profile photo, copied into the app's documents folder. */
  photoUri: string | null;
};
