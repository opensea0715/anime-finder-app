
import { ANILIST_API_URL, ITEMS_PER_PAGE, CACHE_KEY_PREFIX } from '../constants';
import { 
  AniListResponse, MediaSeason, MediaSort, FilterOptions, ScoreRangeOption, 
  MediaStatus, AniListMedia, FetchAnimeParams, MediaFormat,
  AiringScheduleResponse, FetchAiringScheduleParams, AiringSort // Added AiringSort
} from '../types';

const ANIME_QUERY = `
query (
  $page: Int, 
  $perPage: Int, 
  $season: MediaSeason, 
  $seasonYear: Int, 
  $search: String, 
  $sort: [MediaSort],
  $ids: [Int],
  $genre_in: [String],
  $format_in: [MediaFormat], 
  $averageScore_greater: Int,
  $averageScore_lesser: Int,
  $status_in: [MediaStatus]
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(
      season: $season, 
      seasonYear: $seasonYear, 
      search: $search, 
      type: ANIME, 
      sort: $sort, 
      isAdult: false,
      id_in: $ids,
      genre_in: $genre_in,
      format_in: $format_in, 
      averageScore_greater: $averageScore_greater,
      averageScore_lesser: $averageScore_lesser,
      status_in: $status_in
    ) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        medium
        color
      }
      description(asHtml: false)
      genres
      averageScore
      status
      episodes
      format 
      startDate {
        year
        month
        day
      }
      season
      seasonYear
      studios {
        edges {
          isMain
          node {
            id
            name
          }
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
        airingAt
      }
    }
  }
}
`;

const AIRING_SCHEDULE_QUERY = `
query (
  $page: Int,
  $perPage: Int,
  $airingAt_greater: Int,
  $airingAt_lesser: Int,
  $sort: [AiringSort] 
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    airingSchedules(
      airingAt_greater: $airingAt_greater,
      airingAt_lesser: $airingAt_lesser,
      sort: $sort,
      notYetAired: true # Fetch only upcoming or currently airing
    ) {
      id
      airingAt
      episode
      mediaId
      media {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
          color
        }
        description(asHtml: false)
        genres
        averageScore
        status
        episodes
        format
        startDate {
          year
          month
          day
        }
        season
        seasonYear
        studios {
          edges {
            isMain
            node {
              id
              name
            }
          }
        }
        # nextAiringEpisode is not typically needed here as AiringSchedule provides airingAt
      }
    }
  }
}
`;


const generateCacheKey = (queryType: string, variables: any): string => {
  const sortedVariables = Object.keys(variables)
    .sort()
    .reduce((obj, key) => {
      obj[key] = variables[key];
      return obj;
    }, {} as any);
  return `${CACHE_KEY_PREFIX}${queryType}_${JSON.stringify(sortedVariables)}`;
};

const fetchGraphQL = async <T>(query: string, variables: any, cacheKey: string): Promise<T> => {
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData) as T;
    }
  } catch (e) {
    console.warn('Failed to read or parse cache:', e);
  }

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', 
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `HTTPエラー ${response.status}: `;
      try {
        const parsedError = JSON.parse(errorBody);
        if (parsedError && parsedError.errors && parsedError.errors.length > 0) {
          errorMessage += parsedError.errors.map((e: any) => e.message).join(', ');
        } else {
          errorMessage += response.statusText;
        }
      } catch (e) {
        errorMessage += response.statusText;
      }
      console.error('GraphQL Error Response Body:', errorBody);
      throw new Error(errorMessage);
    }
    
    const result = await response.json() as T & { errors?: any[] }; // Add errors property for checking
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      const errorMessage = result.errors.map(e => e.message).join(', ');
      if (errorMessage.includes("Too Many Requests")) {
        throw new Error("リクエストが多すぎます。しばらくしてから再度お試しください。");
      }
      throw new Error(`GraphQLエラー: ${errorMessage}`);
    }

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      console.warn('Failed to write to cache:', e);
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        let oldestKey: string | null = null;
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                oldestKey = key; 
                break; 
            }
        }
        if (oldestKey) {
            sessionStorage.removeItem(oldestKey);
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify(result));
            } catch (e2) {
                console.warn('Failed to write to cache even after cleanup:', e2);
            }
        }
      }
    }
    return result;

  } catch (error: any) {
    console.error('Error fetching GraphQL data:', error);
    let detailedMessage = 'GraphQLデータの取得中に不明なエラーが発生しました。';

    if (error instanceof Error) {
      console.error(`Error details: name=${error.name}, message=${error.message}, type=${error.constructor.name}`);
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        detailedMessage = 'ネットワーク接続に問題があるか、ブラウザのセキュリティポリシー (CORS等) によりリクエストがブロックされた可能性があります。お使いのネットワーク環境を確認し、ブラウザの開発者コンソールで詳細なエラーを確認してください。ローカルファイル (file://) からアクセスしている場合、Webサーバー経由でのアクセスをお試しください。';
      } else {
        detailedMessage = error.message;
      }
    }
    return { errors: [{ message: detailedMessage }] } as unknown as T;
  }
};


export const fetchAnime = async (params: FetchAnimeParams): Promise<AniListResponse> => {
  const { 
    page = 1, 
    perPage = ITEMS_PER_PAGE, 
    season, 
    seasonYear, 
    search, 
    sort = [MediaSort.POPULARITY_DESC],
    ids,
    genre_in,
    format_in,
    status_in,
    averageScore_greater,
    averageScore_lesser,
    filtersForNoneScore, 
  } = params;

  const variables: any = { page, perPage, sort };

  if (search) variables.search = search;
  if (ids && ids.length > 0) variables.id_in = ids;
  
  if (season) variables.season = season;
  if (seasonYear) variables.seasonYear = seasonYear;
  
  if (genre_in && genre_in.length > 0) variables.genre_in = genre_in;
  if (format_in && format_in.length > 0) variables.format_in = format_in;
  if (status_in && status_in.length > 0) variables.status_in = status_in;
  
  if (averageScore_greater !== undefined) variables.averageScore_greater = averageScore_greater;
  if (averageScore_lesser !== undefined) variables.averageScore_lesser = averageScore_lesser;
  
  const cacheKey = generateCacheKey('anime', variables);
  const result = await fetchGraphQL<AniListResponse>(ANIME_QUERY, variables, cacheKey);
  
  if (filtersForNoneScore?.scoreRange === 'none' && result.data?.Page?.media) {
     result.data.Page.media = result.data.Page.media.filter(anime => !anime.averageScore || anime.averageScore === 0);
  }
  return result;
};

export const fetchAiringSchedule = async (params: FetchAiringScheduleParams): Promise<AiringScheduleResponse> => {
  const {
    page = 1,
    perPage = 50, 
    airingAt_greater,
    airingAt_lesser,
    sort = [AiringSort.TIME], 
  } = params;

  const variables: any = { page, perPage, sort };
  if (airingAt_greater !== undefined) variables.airingAt_greater = airingAt_greater;
  if (airingAt_lesser !== undefined) variables.airingAt_lesser = airingAt_lesser;
  
  if (variables.airingAt_greater === undefined || variables.airingAt_lesser === undefined) {
    console.warn("fetchAiringSchedule called without airingAt_greater or airingAt_lesser. This might return unexpected results.");
  }

  const cacheKey = generateCacheKey('airingSchedule', variables);
  return fetchGraphQL<AiringScheduleResponse>(AIRING_SCHEDULE_QUERY, variables, cacheKey);
};
