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
