export interface Sport {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  governingBodyCount: number;
  organizationCount: number;
  teamCount: number;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  onboardedAt?: string | null;
}

export interface SportPayload {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CatalogueStat {
  label: string;
  value: number;
  icon: 'sports' | 'governing-bodies' | 'organisations' | 'participants';
}

export interface GoverningBody {
  id: string;
  name: string;
  country: string | null;
  sportId: string;
  sport?: Pick<Sport, 'id' | 'name' | 'description' | 'iconUrl'>;
  organizationCount: number;
  teamCount: number;
  participantCount: number;
  iconUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  onboardedAt?: string | null;
}

export interface Organisation {
  id: string;
  name: string;
  city: string | null;
  governingBodyId: string;
  governingBody?: Pick<GoverningBody, 'id' | 'name' | 'country' | 'sportId'>;
  teamCount: number;
  participantCount: number;
  squadCount: number;
  staffCount: number;
  iconUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  onboardedAt?: string | null;
}

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  organizationId: string;
  participantCount: number;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamId: string;
  team?: Pick<Team, 'id' | 'name' | 'shortName' | 'organizationId'>;
}

export interface GoverningBodyPayload {
  name: string;
  country?: string;
  sportId: string;
}

export interface OrganisationPayload {
  name: string;
  city?: string;
  governingBodyId: string;
}

export interface ParticipantPayload {
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  position?: string;
  teamId: string;
}

export interface TeamPayload {
  name: string;
  shortName?: string;
  organizationId: string;
}

export interface SquadMember {
  id: string;
  organizationId: string;
  userId: string;
  position: string;
  agreementEnd: string | null;
  displayName: string;
  email: string;
  photoUrl: string | null;
  age: number | null;
}

export interface AthleteProfile {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  age: number | null;
}

export interface StaffMember {
  id: string;
  organizationId: string;
  name: string;
  roleTitle: string;
  category: 'club_president' | 'executive_management' | 'operations_administration';
  nationality: string | null;
  photoUrl: string | null;
}

export interface StaffGroup {
  category: StaffMember['category'];
  members: StaffMember[];
}

export interface StaffResponse {
  data: StaffMember[];
  groups: StaffGroup[];
}

export interface SquadMemberPayload {
  userId: string;
  position: string;
  agreementEnd?: string;
}

export type SquadMemberUpdatePayload = Partial<Pick<SquadMemberPayload, 'position' | 'agreementEnd'>>;

export interface StaffMemberPayload {
  name: string;
  roleTitle: string;
  category: StaffMember['category'];
  nationality?: string;
  photoUrl?: string;
}

export type StaffMemberUpdatePayload = Partial<StaffMemberPayload>;
