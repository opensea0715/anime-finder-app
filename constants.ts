
import { MediaSeason, MediaStatus, MediaSort, SeasonOption, ScoreRangeOption, StatusOption, SortOption } from './types';

export const ANILIST_API_URL = 'https://graphql.anilist.co';
export const ITEMS_PER_PAGE = 20; // Used for paginated views like potentially My List if very long
export const ITEMS_PER_SECTION = 15; // Number of items to fetch for horizontal carousels

export const SEASONS: SeasonOption[] = [
  { value: MediaSeason.WINTER, label: '冬' },
  { value: MediaSeason.SPRING, label: '春' },
  { value: MediaSeason.SUMMER, label: '夏' },
  { value: MediaSeason.FALL, label: '秋' },
];

export const YEARS: number[] = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 2 - i); // Current year +2 to -12

export const GENRE_MAP: { [key: string]: string } = {
  Action: 'アクション',
  Adventure: '冒険',
  Comedy: 'コメディ',
  Drama: 'ドラマ',
  Ecchi: 'エッチ',
  Fantasy: 'ファンタジー',
  Horror: 'ホラー',
  MahouShoujo: '魔法少女',
  Mecha: 'メカ',
  Music: '音楽',
  Mystery: 'ミステリー',
  Psychological: '心理', // Changed from サイコホラー for consistency with prompt
  Romance: 'ロマンス',
  SciFi: 'SF',
  SliceOfLife: '日常', // Changed from 日常系 for consistency
  Sports: 'スポーツ',
  Supernatural: '超自然', // Changed from 超常現象
  Thriller: 'スリラー',
  Hentai: 'ヘンタイ',
  BoysLove: 'ボーイズラブ',
  GirlsLove: 'ガールズラブ',
  AwardWinning: '受賞作',
  Gourmet: 'グルメ',
  Suspense: 'サスペンス',
  // Aliases or common variations AniList might use
  "Sci-Fi": 'SF',
  "Slice of Life": '日常',
};

export const AVAILABLE_GENRES: string[] = [
  'Action', 'Fantasy', 'Romance', 'Comedy', 'Drama', 'SciFi', 
  'SliceOfLife', 'Sports', 'Music', 'Psychological', 'Supernatural', 'Thriller',
  'Adventure', 'Mystery', 'Horror', 'MahouShoujo', 'Mecha' // Added more common genres
];


export const STATUS_MAP: { [key: string]: string } = {
  [MediaStatus.RELEASING]: '放送中',
  [MediaStatus.FINISHED]: '放送終了',
  [MediaStatus.NOT_YET_RELEASED]: '放送予定', // Changed from 放送前
  [MediaStatus.CANCELLED]: 'キャンセル',
  [MediaStatus.HIATUS]: '休止中',
};

export const DEFAULT_PLACEHOLDER_IMAGE = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/default.jpg'; // Official AniList default

export const SCORE_RANGES: ScoreRangeOption[] = [
  { value: 'any', label: 'すべて' },
  { value: '9+', label: '9.0以上 (神作品)', minScore: 90 },
  { value: '8-8.9', label: '8.0-8.9 (名作)', minScore: 80, maxScore: 89 },
  { value: '7-7.9', label: '7.0-7.9 (良作)', minScore: 70, maxScore: 79 },
  { value: '6-6.9', label: '6.0-6.9 (普通)', minScore: 60, maxScore: 69 },
  { value: 'none', label: '評価なし' }, // This will be handled by checking if averageScore is null/0
];

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'any', label: 'すべて' },
  { value: MediaStatus.RELEASING, label: STATUS_MAP[MediaStatus.RELEASING] },
  { value: MediaStatus.FINISHED, label: STATUS_MAP[MediaStatus.FINISHED] },
  { value: MediaStatus.NOT_YET_RELEASED, label: STATUS_MAP[MediaStatus.NOT_YET_RELEASED] },
  { value: MediaStatus.CANCELLED, label: STATUS_MAP[MediaStatus.CANCELLED] },
  { value: MediaStatus.HIATUS, label: STATUS_MAP[MediaStatus.HIATUS] },
];

export const SORT_OPTIONS: SortOption[] = [
  { value: MediaSort.POPULARITY_DESC, label: '人気順' },
  { value: MediaSort.SCORE_DESC, label: '評価順' },
  { value: MediaSort.TRENDING_DESC, label: 'トレンド順' },
  { value: MediaSort.START_DATE_DESC, label: '放送日順' },
  { value: MediaSort.FAVOURITES_DESC, label: 'お気に入り数順' },
  { value: MediaSort.TITLE_ROMAJI, label: 'タイトル順' },
];

export const CACHE_KEY_PREFIX = 'animekun_cache_';
export const API_DEBOUNCE_DELAY = 500; // ms for debouncing API calls
export const SEARCH_DEBOUNCE_DELAY = 300; // ms for debouncing search input
