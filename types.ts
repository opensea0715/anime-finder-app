
export enum MediaSeason {
  WINTER = 'WINTER',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  FALL = 'FALL',
}

export enum MediaSort {
  POPULARITY_DESC = 'POPULARITY_DESC',
  SCORE_DESC = 'SCORE_DESC',
  TRENDING_DESC = 'TRENDING_DESC',
  START_DATE_DESC = 'START_DATE_DESC',
  TITLE_ROMAJI = 'TITLE_ROMAJI',
  FAVOURITES_DESC = 'FAVOURITES_DESC', // Added
  // Note: TIME and TIME_DESC were previously here, but they are specific to AiringSort
  // Add other sort options as needed
}

export enum AiringSort {
  ID = 'ID',
  ID_DESC = 'ID_DESC',
  MEDIA_ID = 'MEDIA_ID',
  MEDIA_ID_DESC = 'MEDIA_ID_DESC',
  TIME = 'TIME',
  TIME_DESC = 'TIME_DESC',
  EPISODE = 'EPISODE',
  EPISODE_DESC = 'EPISODE_DESC',
}

export enum MediaStatus {
  FINISHED = 'FINISHED',
  RELEASING = 'RELEASING',
  NOT_YET_RELEASED = 'NOT_YET_RELEASED',
  CANCELLED = 'CANCELLED',
  HIATUS = 'HIATUS',
}

export enum MediaFormat {
  TV = 'TV',
  TV_SHORT = 'TV_SHORT',
  MOVIE = 'MOVIE',
  SPECIAL = 'SPECIAL',
  OVA = 'OVA',
  ONA = 'ONA',
  MUSIC = 'MUSIC',
}

export type ScoreRangeValue = 'any' | '9+' | '8-8.9' | '7-7.9' | '6-6.9' | 'none';

export interface FilterOptions {
  genres: string[];
  scoreRange: ScoreRangeValue;
  status: MediaStatus | 'any';
  sort: MediaSort;
}

export interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface AniListCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface AniListStartDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AniListStudioNode {
  id: number;
  name:string;
}

export interface AniListStudioEdge {
  isMain: boolean;
  node: AniListStudioNode;
}

export interface AniListStudios {
  edges: AniListStudioEdge[];
}

export interface NextAiringEpisode {
  episode: number;
  timeUntilAiring: number;
  airingAt: number;
}

export interface AniListMedia {
  id: number;
  title: AniListTitle;
  coverImage: AniListCoverImage;
  description?: string;
  genres: string[];
  averageScore?: number;
  status?: MediaStatus;
  episodes?: number;
  startDate?: AniListStartDate;
  season?: MediaSeason;
  seasonYear?: number;
  studios: AniListStudios;
  nextAiringEpisode?: NextAiringEpisode;
  format?: MediaFormat; 
}

export interface AniListPageInfo {
  total?: number;
  currentPage?: number;
  lastPage?: number;
  hasNextPage?: boolean;
  perPage?: number;
}

export interface AniListPage {
  pageInfo: AniListPageInfo;
  media: AniListMedia[];
}

export interface AniListResponse {
  data?: {
    Page: AniListPage;
  };
  errors?: Array<{ message: string; [key: string]: any }>;
}

export interface SeasonOption {
  value: MediaSeason;
  label: string;
}

export type ActiveView = 'home' | 'myList' | 'calendar'; // Added 'calendar'

export interface ScoreRangeOption {
  value: ScoreRangeValue;
  label: string;
  minScore?: number; // 0-100 scale
  maxScore?: number; // 0-100 scale
}

export interface StatusOption {
  value: MediaStatus | 'any';
  label: string;
}

export interface SortOption {
  value: MediaSort;
  label: string;
}

export interface AnimeDetailModalProps {
  anime: AniListMedia | null;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  initialFocusRef?: HTMLElement | null;
}

export interface AnimeSectionData {
  id: string; 
  title: string;
  items: AniListMedia[];
  isLoading: boolean;
  error: string | null;
  pageInfo?: AniListPageInfo | null; 
  fetchParams: FetchAnimeSectionParams; 
}

export interface FetchAnimeSectionParams {
  id: string; 
  page?: number;
  perPage?: number;
  season?: MediaSeason;
  seasonYear?: number;
  search?: string; 
  sort?: MediaSort[];
  ids?: number[]; 
  genre_in?: string[]; 
  format_in?: MediaFormat[];
  status_in?: MediaStatus[]; // Added status_in
}

export interface FetchAnimeParams {
  page?: number;
  perPage?: number;
  season?: MediaSeason;
  seasonYear?: number;
  search?: string;
  sort?: MediaSort[];
  ids?: number[]; 
  genre_in?: string[];
  format_in?: MediaFormat[];
  status_in?: MediaStatus[]; 
  averageScore_greater?: number;
  averageScore_lesser?: number;
  filtersForNoneScore?: Partial<Pick<FilterOptions, 'scoreRange'>>; 
  scoreRanges?: ScoreRangeOption[]; 
}

// Types for Airing Schedule
export type AiringScheduleMedia = AniListMedia; // Can be same as AniListMedia for now

export interface AiringScheduleEntry {
  id: number; // ID of the airing schedule entry itself
  airingAt: number; // Unix timestamp
  episode: number;
  mediaId: number; // Redundant if media object is present, but AniList includes it
  media: AiringScheduleMedia; // The anime data
}

export interface AiringSchedulePage {
  pageInfo: AniListPageInfo;
  airingSchedules: AiringScheduleEntry[];
}

export interface AiringScheduleResponse {
  data?: {
    Page: AiringSchedulePage;
  };
  errors?: Array<{ message: string; [key: string]: any }>;
}

export interface FetchAiringScheduleParams {
  page?: number;
  perPage?: number;
  airingAt_greater?: number; // Unix timestamp for start of range
  airingAt_lesser?: number;  // Unix timestamp for end of range
  sort?: AiringSort[]; // e.g., [AiringSort.TIME]
}

// For BroadcastCalendar component
export interface DaySchedule {
  date: Date;
  dayName: string; // e.g., "月曜日"
  formattedDate: string; // e.g., "10/28"
  anime: AiringScheduleEntry[];
}
