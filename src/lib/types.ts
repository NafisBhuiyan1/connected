// Core domain model for Connected. Shared by the engine, the API and the UI.

export type Level = 1 | 2 | 3; // 1 = familiar, 2 = proficient, 3 = expert

export interface UserSkill {
  skill: string; // ontology skill id
  level: Level;
}

export type PersonRole =
  | "student"
  | "professional"
  | "founder"
  | "mentor"
  | "researcher"
  | "organizer";

/** What someone is open to. "give" / "get" pairs are complementary. */
export type CollabType =
  | "cofounder"
  | "hackathon-team"
  | "project"
  | "mentorship-get"
  | "mentorship-give"
  | "internship"
  | "hiring"
  | "research"
  | "quick-chat";

export type Availability = "high" | "medium" | "low";
export type Visibility = "everyone" | "events" | "hidden";

export interface Profile {
  id: string;
  name: string;
  pronouns?: string;
  headline: string;
  role: PersonRole;
  university?: string;
  major?: string;
  gradYear?: number;
  bio: string;
  skills: UserSkill[];
  interests: string[]; // ontology interest ids
  /** "What I can help with in 15 minutes" — explicit willingness to help. */
  gives: string[];
  /** Current ask: "What do I need help with right now?" */
  ask: string;
  lookingFor: string[]; // role ids this person wants to meet
  openTo: CollabType[];
  /** Domains (interest ids) where this person will *consider* making an intro. Never implies a guaranteed intro. */
  introsOffered: string[];
  availability: Availability;
  area: string; // general area only — never precise location
  visibility: Visibility;
  allowRequests: boolean;
  links?: { github?: string; linkedin?: string; portfolio?: string; instagram?: string; x?: string };
  isDemo: boolean;
  avatarHue: number;
  createdAt: string;
  prefs?: Partial<Prefs>;
}

/** Discovery, safety and app preferences. Missing fields fall back to DEFAULT_PREFS. */
export interface Prefs {
  /** Ghost mode: instantly disappear from the live map and nearby lists. */
  ghostMode: boolean;
  /** Who may see me on the map: everyone at my events, or only people I'd be a good match for. */
  mapAudience: "event" | "compatible";
  /** Show my approximate zone (otherwise I'm placed loosely around the venue). */
  showZone: boolean;
  /** Only show me people at or above this compatibility on the map. */
  minScore: number;
  /** Only show people who are open to chat / team up right now. */
  openNowOnly: boolean;
  /** Event discovery radius in miles. */
  radiusMiles: number;
  /** UI sound effects. */
  sounds: boolean;
  /** Let people see that I viewed their profile (and see who viewed mine). */
  viewTransparency: boolean;
}

/** Public chat message in an event's lounge (visible to everyone who joined the event). */
export interface LoungeMessage {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  createdAt: string;
  reports: string[]; // user ids; auto-hidden at 3
}

/** Photo shared by an attendee to an event's album. Stored on disk, served via /api/photos/[id]. */
export interface EventPhoto {
  id: string;
  eventId: string;
  userId: string;
  file: string; // filename inside the photos directory
  mime: string;
  caption: string;
  likes: string[];
  reports: string[];
  createdAt: string;
}

export interface ProfileView {
  viewerId: string;
  targetId: string;
  at: string;
}

export interface EventZone {
  id: string;
  name: string;
  // Layout on a 100x60 venue grid (for the zone map)
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "hall" | "table" | "lounge" | "stage" | "food" | "booth";
  meetingSpot?: boolean;
}

export interface ConnectedEvent {
  id: string;
  title: string;
  host: string;
  kind: "hackathon" | "career-fair" | "pitch" | "meetup" | "workshop" | "conference" | "seminar";
  description: string;
  start: string;
  end: string;
  venue: string;
  area: string;
  tags: string[]; // interest ids
  zones: EventZone[];
  /** Venue geofence. Distance checks run on the attendee's device; coordinates are never sent to the server. */
  geo?: { lat: number; lng: number; radiusM: number; label: string };
  /** Fallback check-in code shown on screens at the venue. Server-only — stripped from every API response. */
  checkInCode?: string;
  isSample: boolean;
  /** Imported from a public calendar feed (.ics) rather than seeded. */
  source?: { kind: "ics"; feed: string; uid: string; importedBy: string; importedAt: string; approximate?: boolean };
  /** The organizer's own page for the event. */
  link?: string;
}

export type LiveMode = "quick-chat" | "team-up" | "mentoring" | "heads-down";

/** Temporary, specific, opt-in availability at an event. Expires automatically. */
export interface LiveStatus {
  mode: LiveMode;
  topics: string[];
  until: string; // ISO time
  maxRequests: number;
}

export interface Membership {
  eventId: string;
  userId: string;
  optIn: boolean; // networking discovery opt-in for this event
  zone?: string; // zone id — approximate, user-chosen
  status?: LiveStatus;
  /** Set when the attendee's phone confirmed they're inside the venue geofence (only the result is stored). */
  checkedInAt?: string;
  joinedAt: string;
}

export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type OutcomeRating = "useful" | "okay" | "not-useful" | "didnt-meet";

export interface ConnectionRequest {
  id: string;
  fromId: string;
  toId: string;
  kind: "connect" | "chat" | "mutual";
  ask: string; // required, specific
  message: string;
  eventId?: string;
  missionId?: string;
  score?: number;
  reasons?: string[];
  status: RequestStatus;
  meetingSpot?: string;
  createdAt: string;
  respondedAt?: string;
  outcomes?: Partial<Record<string, OutcomeRating>>; // keyed by userId
}

export interface QuietInterest {
  fromId: string;
  toId: string;
  createdAt: string;
}

export interface TeamRoleSlot {
  roleId: string;
  label: string;
  why: string;
  weight: number;
  assignedUserId?: string;
  coverage?: number;
}

export type TeamMemberStatus = "owner" | "invited" | "accepted" | "declined";

export interface TeamMember {
  userId: string;
  roleId: string;
  status: TeamMemberStatus;
  invitedAt: string;
  respondedAt?: string;
}

export interface Team {
  id: string;
  ownerId: string;
  title: string;
  pitch: string;
  eventId?: string;
  missionId?: string;
  roles: TeamRoleSlot[];
  members: TeamMember[];
  openRoles: string[]; // role ids posted publicly as "open roles"
  coverage: number; // 0..1 at proposal time
  status: "forming" | "formed";
  nextSteps: { id: string; text: string; done: boolean }[];
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string; // team id or request id
  fromId: string | "system";
  body: string;
  createdAt: string;
}

export type MissionKind =
  | "cofounder"
  | "hackathon-team"
  | "mentor"
  | "internship"
  | "meet-professionals"
  | "collaborators"
  | "custom";

export interface MissionTarget {
  roleId: string;
  label: string;
  count: number;
}

export interface Mission {
  id: string;
  userId: string;
  title: string;
  goal: string;
  kind: MissionKind;
  targets: MissionTarget[];
  eventId?: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  kind:
    | "request"
    | "request-accepted"
    | "mutual"
    | "team-invite"
    | "team-update"
    | "radar"
    | "message"
    | "system";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Block {
  userId: string;
  blockedId: string;
  createdAt: string;
}

/** Login credentials, kept apart from profiles so they can never leak through profile APIs. */
export interface Account {
  userId: string;
  email: string; // lowercased
  salt: string;
  hash: string; // scrypt
  createdAt: string;
}

export type PostKind = "update" | "looking" | "offering";

export interface Post {
  id: string;
  authorId: string;
  kind: PostKind;
  body: string;
  tags: string[]; // skill/interest ids extracted from the text
  eventId?: string;
  likes: string[]; // user ids
  createdAt: string;
}

export interface Database {
  version: number;
  seededAt: string;
  profiles: Profile[];
  events: ConnectedEvent[];
  memberships: Membership[];
  requests: ConnectionRequest[];
  interests: QuietInterest[];
  teams: Team[];
  messages: Message[];
  missions: Mission[];
  notifications: Notification[];
  blocks: Block[];
  accounts: Account[];
  posts: Post[];
  views: ProfileView[];
  lounge: LoungeMessage[];
  photos: EventPhoto[];
}

// ---------- Engine I/O ----------

/** A structured interpretation of what the user is trying to do. */
export interface Intent {
  summary: string;
  kind?: CollabType;
  roles: { roleId: string; why: string; weight: number }[];
  skills: string[];
  interests: string[];
  helpTopics: string[]; // what kind of help they want (skill/interest ids)
  isProject: boolean;
  projectTitle?: string;
}

export type ReasonKind = "skills" | "interests" | "goals" | "willing" | "event" | "availability" | "mutual" | "intro";

export interface Reason {
  kind: ReasonKind;
  text: string;
  points: number; // contribution to the 0-100 score
}

export interface ScoreBreakdown {
  skills: number;
  interests: number;
  goals: number;
  willing: number;
  event: number;
  availability: number;
  mutual: number;
}

export interface MatchResult {
  profile: PublicProfile;
  score: number; // 0-100 algorithmic compatibility estimate
  forward: number; // 0..1 how well they fit you
  backward: number; // 0..1 how well you fit them (reciprocity)
  breakdown: ScoreBreakdown; // points per factor
  reasons: Reason[];
  bestRole?: { roleId: string; coverage: number };
  liveNow?: { eventId: string; zone?: string; mode: LiveMode; until: string };
  /** Checked in at the venue (location-verified on their device) for the event in focus. */
  hereNow?: boolean;
  nextStep: string;
}

/** Profile as other users are allowed to see it. */
export type PublicProfile = Omit<Profile, "visibility" | "allowRequests" | "createdAt"> & {
  canRequest: boolean;
};

export interface TeamSlotResult {
  roleId: string;
  label: string;
  why: string;
  weight: number;
  coverage: number; // 0..1 best coverage on team
  coveredBy?: string; // user id (may be owner)
  alternatives: { userId: string; coverage: number }[];
  gap: boolean;
}

export interface TeamResult {
  members: { userId: string; roleId: string; coverage: number; reasons: string[] }[];
  slots: TeamSlotResult[];
  coverage: number; // 0..1 weighted role coverage including owner
  cohesion: number; // 0..1
  objective: number;
  method: "exact" | "greedy+local-search";
  combinationsEvaluated: number;
  poolSize: number;
  ms: number;
  summary: string;
  missing: { roleId: string; label: string; suggestion: string }[];
}
