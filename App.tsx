
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import FilterControls from './components/FilterControls';
import AnimeDetailModal from './components/AnimeDetailModal';
import AnimeSection from './components/AnimeSection';
import AiringNowList from './components/AiringNowList';
import BroadcastCalendar from './components/BroadcastCalendar';
import { fetchAnime, fetchAiringSchedule } from './services/aniListService';
import {
  AniListMedia, MediaSeason, ActiveView, MediaSort, FilterOptions,
  AniListPageInfo, AnimeSectionData, FetchAnimeSectionParams, MediaFormat, FetchAnimeParams,
  AiringScheduleEntry, AiringSort, MediaStatus
} from './types';
import { useFavorites } from './hooks/useFavorites'; 
import { ITEMS_PER_SECTION, ITEMS_PER_PAGE, SCORE_RANGES, SEASONS as APP_SEASONS, STATUS_MAP } from './constants';

const getCurrentSeasonAndYear = (): { season: MediaSeason; year: number } => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let season: MediaSeason;
  if (month <= 2) season = MediaSeason.WINTER;
  else if (month <= 5) season = MediaSeason.SPRING;
  else if (month <= 8) season = MediaSeason.SUMMER;
  else season = MediaSeason.FALL;
  return { season, year };
};

const initialFilterOptions: FilterOptions = {
  genres: [],
  scoreRange: 'any',
  status: 'any',
  sort: MediaSort.POPULARITY_DESC,
};

const App: React.FC = () => {
  const [sections, setSections] = useState<AnimeSectionData[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);

  const [favoriteAnimes, toggleFavorite, isFavorite] = useFavorites(); 
  const [selectedAnimeForModal, setSelectedAnimeForModal] = useState<AniListMedia | null>(null);
  const [modalTriggerRef, setModalTriggerRef] = useState<HTMLElement | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  const { season: initialSeason, year: initialYear } = getCurrentSeasonAndYear();
  const [selectedGlobalYear, setSelectedGlobalYear] = useState<number>(initialYear);
  const [selectedGlobalSeason, setSelectedGlobalSeason] = useState<MediaSeason>(initialSeason);

  const [calendarSchedule, setCalendarSchedule] = useState<AiringScheduleEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const processErrorForDisplay = useCallback((error: any, sectionId: string): string => {
    let displayErrorMessage = 'データの読み込み中に予期せぬエラーが発生しました。';
    if (typeof error === 'string' && error.trim() !== '') {
      displayErrorMessage = error;
    } else if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        displayErrorMessage = 'ネットワーク接続に問題があるか、ブラウザのセキュリティポリシー (CORS等) によりリクエストがブロックされた可能性があります。お使いのネットワーク環境を確認し、ブラウザの開発者コンソールで詳細なエラーを確認してください。ローカルファイル (file://) からアクセスしている場合、Webサーバー経由でのアクセスをお試しください。';
        console.warn(`Detailed 'Failed to fetch' handler in App.tsx's processErrorForDisplay for section ${sectionId}. This implies the error object was caught here directly.`);
      } else {
        displayErrorMessage = error.message || `データの読み込みに失敗しました (${sectionId} - 詳細不明)。`;
      }
    } else {
       console.error(`Fallback error processing in App.tsx for section ${sectionId} (unknown error type):`, error);
    }
    return displayErrorMessage;
  }, []);


  const loadSectionData = useCallback(async (
    sectionDefinition: FetchAnimeSectionParams,
    globalFilters: FilterOptions,
    globalSearchTerm: string,
    currentGlobalYear: number,
    currentGlobalSeason: MediaSeason,
    pageForPagination: number = 1
  ): Promise<Partial<AnimeSectionData>> => {

    const effectivePerPage = (sectionDefinition.id === 'searchResults')
      ? ITEMS_PER_PAGE
      : sectionDefinition.perPage || ITEMS_PER_SECTION;

    const baseSort = sectionDefinition.sort?.[0] || globalFilters.sort;
    const initialSortParam = baseSort ? [baseSort] : undefined;

    let serviceParams: FetchAnimeParams = {
      page: pageForPagination,
      perPage: effectivePerPage,
      sort: initialSortParam,
      scoreRanges: SCORE_RANGES,
    };

    if (globalSearchTerm) {
      serviceParams.search = globalSearchTerm;
      if (globalFilters.genres.length > 0) {
        serviceParams.genre_in = globalFilters.genres;
      }
    } else { 
      serviceParams.season = sectionDefinition.season || currentGlobalSeason;
      serviceParams.seasonYear = sectionDefinition.seasonYear || currentGlobalYear;

      if (sectionDefinition.genre_in && sectionDefinition.genre_in.length > 0) {
        serviceParams.genre_in = sectionDefinition.genre_in;
      }
      if (sectionDefinition.format_in && sectionDefinition.format_in.length > 0) {
        serviceParams.format_in = sectionDefinition.format_in;
      }
      if (sectionDefinition.status_in && sectionDefinition.status_in.length > 0) {
        serviceParams.status_in = sectionDefinition.status_in;
      }
    }

    if (globalFilters.status !== 'any' && !serviceParams.status_in) {
      serviceParams.status_in = [globalFilters.status];
    }
    if (globalFilters.scoreRange === 'none') {
      serviceParams.filtersForNoneScore = { scoreRange: 'none' };
      serviceParams.averageScore_greater = undefined;
      serviceParams.averageScore_lesser = undefined;
    } else if (globalFilters.scoreRange !== 'any') {
      const selectedRange = SCORE_RANGES.find(r => r.value === globalFilters.scoreRange);
      if (selectedRange) {
        serviceParams.averageScore_greater = selectedRange.minScore !== undefined ? selectedRange.minScore -1 : undefined;
        serviceParams.averageScore_lesser = selectedRange.maxScore !== undefined ? selectedRange.maxScore + 1 : undefined;
        serviceParams.filtersForNoneScore = undefined;
      }
    } else {
        serviceParams.averageScore_greater = undefined;
        serviceParams.averageScore_lesser = undefined;
        serviceParams.filtersForNoneScore = undefined;
    }
    if (!globalSearchTerm && globalFilters.genres.length > 0 && !serviceParams.genre_in) {
        serviceParams.genre_in = globalFilters.genres;
    }
    
    try {
      console.log(`[loadSectionData] Fetching section '${sectionDefinition.id}'. API Request Params:`, JSON.parse(JSON.stringify(serviceParams)));
      const response = await fetchAnime(serviceParams);
      console.log(`[loadSectionData] API response for section '${sectionDefinition.id}':`, response.data ? JSON.parse(JSON.stringify(response.data.Page)) : response.errors);

      if (response.data?.Page) {
        let fetchedMedia = response.data.Page.media;
        const fetchedPageInfo = response.data.Page.pageInfo;
        
        return { items: fetchedMedia, error: null, pageInfo: fetchedPageInfo };
      } else if (response.errors) {
        const errorMessages = response.errors.map(e => e.message).join(', ');
        console.error(`[loadSectionData] API error for section '${sectionDefinition.id}':`, errorMessages);
        return { items: [], error: errorMessages, pageInfo: null };
      }
      console.error(`[loadSectionData] Invalid API response for section '${sectionDefinition.id}'.`);
      return { items: [], error: 'APIからの応答が不正です。', pageInfo: null };
    } catch (err) {
      let detailedErrorMessage = 'データの取得処理中に不明なエラーが発生しました。';
      if (err instanceof Error) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          detailedErrorMessage = 'ネットワーク接続に問題があるか、ブラウザのセキュリティポリシー (CORS等) によりリクエストがブロックされた可能性があります。お使いのネットワーク環境を確認し、ブラウザの開発者コンソールで詳細なエラーを確認してください。ローカルファイル (file://) からアクセスしている場合、Webサーバー経由でのアクセスをお試しください。';
        } else {
          detailedErrorMessage = err.message;
        }
      } else if (typeof err === 'string') {
        detailedErrorMessage = err;
      }
      console.error(`[loadSectionData] Catch block error for section '${sectionDefinition.id}':`, err, 'Processed error message:', detailedErrorMessage);
      return { items: [], error: detailedErrorMessage, pageInfo: null };
    }
  }, []);

  const loadCalendarData = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError(null);

    const today = new Date();
    const currentDayOfWeek = today.getDay();

    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const airingAt_greater = Math.floor(monday.getTime() / 1000);
    const airingAt_lesser = Math.floor(sunday.getTime() / 1000);

    try {
      let allSchedules: AiringScheduleEntry[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      const perPage = 50;

      while(hasNextPage && currentPage <= 3) { // Limit to 3 pages to avoid excessive calls
        const response = await fetchAiringSchedule({
          airingAt_greater,
          airingAt_lesser,
          sort: [AiringSort.TIME],
          page: currentPage,
          perPage: perPage,
        });

        if (response.data?.Page?.airingSchedules) {
          allSchedules = allSchedules.concat(response.data.Page.airingSchedules);
          hasNextPage = response.data.Page.pageInfo?.hasNextPage || false;
          currentPage++;
        } else {
          hasNextPage = false;
          if (response.errors) {
            throw new Error(response.errors.map(e => e.message).join(', '));
          }
        }
      }
      setCalendarSchedule(allSchedules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カレンダーデータの取得中にエラーが発生しました。';
      console.error('Error loading calendar data:', err);
      setCalendarError(errorMessage);
      setCalendarSchedule([]);
    } finally {
      setCalendarLoading(false);
    }
  }, []);


  useEffect(() => {
    const currentYearToDisplay = selectedGlobalYear || initialYear;
    const currentSeasonToDisplay = selectedGlobalSeason || initialSeason;

    console.log('[App useEffect] Triggered. ActiveView:', activeView, 'SearchTerm:', searchTerm, 'Filters:', filterOptions, 'Favorites Count:', favoriteAnimes.length);

    if (searchTerm.trim() !== '') {
      const searchResultsSectionDefinition: FetchAnimeSectionParams = {
        id: 'searchResults',
        perPage: ITEMS_PER_PAGE,
        search: searchTerm,
      };

      const areFiltersActive = filterOptions.genres.length > 0 || filterOptions.status !== 'any' || filterOptions.scoreRange !== 'any';
      const sectionTitle = `「${searchTerm}」の検索結果 ${areFiltersActive ? '(絞り込みあり)' : ''}`;

      setSections([{
        id: searchResultsSectionDefinition.id,
        title: sectionTitle,
        fetchParams: searchResultsSectionDefinition,
        items: [],
        isLoading: true,
        error: null,
        pageInfo: { currentPage: 0, hasNextPage: true, perPage: ITEMS_PER_PAGE, total: 0 }
      }]);

      loadSectionData(
        searchResultsSectionDefinition,
        filterOptions,
        searchTerm,
        currentYearToDisplay,
        currentSeasonToDisplay,
        1
      ).then(data => {
        setSections(prevSections => prevSections.map(s =>
          s.id === 'searchResults' ? { ...s, ...data, isLoading: false, title: sectionTitle, error: data.error ? processErrorForDisplay(data.error, 'searchResults') : null } : s
        ));
      }).catch(rawError => {
        const displayError = processErrorForDisplay(rawError, 'searchResults');
        setSections(prevSections => prevSections.map(s =>
            s.id === 'searchResults' ? {
                ...s,
                isLoading: false,
                error: displayError,
                title: sectionTitle
            } : s
        ));
      });

    } else if (activeView === 'calendar') {
      setSections([]);
      setIsFilterPanelOpen(false);
      loadCalendarData();
    } else if (activeView === 'myList') {
      console.log('[App useEffect] Setting up MyList view. Favorites from hook:', JSON.parse(JSON.stringify(favoriteAnimes)));
      setIsFilterPanelOpen(false);
      setSearchTerm(''); 
    
      const myListSectionData: AnimeSectionData = {
        id: 'myList',
        title: 'マイリスト',
        items: favoriteAnimes, 
        isLoading: false, 
        error: null,
        fetchParams: { id: 'myList' }, 
        pageInfo: { 
          currentPage: 1,
          hasNextPage: false,
          lastPage: 1,
          perPage: favoriteAnimes.length,
          total: favoriteAnimes.length,
        },
      };
      setSections([myListSectionData]);
  } else { // Home View 
      const homeSectionDefinitions: FetchAnimeSectionParams[] = [
        {
          id: 'selectedPeriod',
          season: currentSeasonToDisplay,
          seasonYear: currentYearToDisplay,
          sort: [MediaSort.POPULARITY_DESC],
          perPage: ITEMS_PER_SECTION
        },
        {
          id: 'airingNowList',
          season: currentSeasonToDisplay,
          seasonYear: currentYearToDisplay,
          status_in: [MediaStatus.RELEASING],
          sort: [MediaSort.POPULARITY_DESC],
          perPage: 50, 
        },
        { id: 'trending', sort: [MediaSort.TRENDING_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'topRated', sort: [MediaSort.SCORE_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'tearjerkers', genre_in: ['Drama', 'Slice of Life'], sort: [MediaSort.SCORE_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'comedies', genre_in: ['Comedy'], sort: [MediaSort.POPULARITY_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'romance', genre_in: ['Romance'], sort: [MediaSort.POPULARITY_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'action', genre_in: ['Action', 'Adventure'], sort: [MediaSort.POPULARITY_DESC], perPage: ITEMS_PER_SECTION },
        { id: 'moviesSpecials', format_in: [MediaFormat.MOVIE, MediaFormat.SPECIAL], sort: [MediaSort.POPULARITY_DESC], perPage: ITEMS_PER_SECTION },
      ];

      const sectionTitles: Record<string, string> = {
        trending: '人気急上昇中',
        topRated: '高評価アニメ',
        tearjerkers: '感涙まちがいなし',
        comedies: '爆笑コメディ',
        romance: '胸キュン恋愛アニメ',
        action: '熱血バトルアクション',
        moviesSpecials: '劇場版・スペシャル',
        airingNowList: '今期放送中のアニメ一覧',
      };

      console.log(`[App useEffect] Setting initial sections for HOME view. Definitions count: ${homeSectionDefinitions.length}`);
      setSections(homeSectionDefinitions.map(def => {
        let title = sectionTitles[def.id] || 'セクション';
        if (def.id === 'selectedPeriod') {
          const seasonLabel = APP_SEASONS.find(s => s.value === currentSeasonToDisplay)?.label || '';
          title = `${currentYearToDisplay}年 ${seasonLabel} の注目アニメ`;
        }
        return {
          id: def.id,
          title: title,
          fetchParams: def,
          items: [],
          isLoading: true,
          error: null,
          pageInfo: def.id === 'airingNowList'
            ? { currentPage: 0, hasNextPage: true, perPage: def.perPage || ITEMS_PER_PAGE, total: 0 }
            : null,
        };
      }));

      homeSectionDefinitions.forEach(def => {
        console.log(`[App useEffect] Home: Initiating load for section: '${def.id}'.`);
        loadSectionData(
          def,
          filterOptions,
          '', 
          currentYearToDisplay,
          currentSeasonToDisplay,
          1
        ).then(data => {
          setSections(prevSections => prevSections.map(s => s.id === def.id ? { ...s, ...data, isLoading: false, error: data.error ? processErrorForDisplay(data.error, def.id) : null } : s));
        }).catch(rawError => {
          const displayError = processErrorForDisplay(rawError, def.id);
          setSections(prevSections => prevSections.map(s =>
              s.id === def.id ? {
                  ...s,
                  isLoading: false,
                  error: displayError
              } : s
          ));
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, searchTerm, filterOptions, selectedGlobalYear, selectedGlobalSeason, loadCalendarData, loadSectionData, processErrorForDisplay, favoriteAnimes]);

  const handleLoadMore = useCallback(async (sectionId: 'searchResults') => { 
    const targetSection = sections.find(s => s.id === sectionId);
    if (!targetSection || !targetSection.pageInfo?.hasNextPage || targetSection.isLoading) {
      return;
    }

    const nextPage = (targetSection.pageInfo?.currentPage || 0) + 1;
    setSections(prev => prev.map(s => s.id === sectionId ? {...s, isLoading: true} : s));

    const currentSearchTermForLoadMore = sectionId === 'searchResults' ? searchTerm : '';
    
    loadSectionData(
      targetSection.fetchParams,
      filterOptions, 
      currentSearchTermForLoadMore,
      selectedGlobalYear,
      selectedGlobalSeason,
      nextPage
    ).then(data => {
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            items: [...s.items, ...(data.items || [])],
            pageInfo: data.pageInfo,
            error: data.error ? processErrorForDisplay(data.error, sectionId) : null,
            isLoading: false
          };
        }
        return s;
      }));
    }).catch(error => {
      console.error(`Error loading more for ${sectionId}:`, error);
      const displayError = processErrorForDisplay(error, sectionId);
      setSections(prevSections => prevSections.map(s =>
        s.id === sectionId ? {
          ...s,
          isLoading: false,
          error: displayError
        } : s
      ));
    });
  }, [sections, loadSectionData, filterOptions, selectedGlobalYear, selectedGlobalSeason, searchTerm, processErrorForDisplay]); 


  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    setSearchTerm(''); // Clear search term on any view change
    if (view !== 'calendar') {
        setCalendarSchedule([]);
    }
    if (view === 'calendar' || view === 'myList') {
      setIsFilterPanelOpen(false); // Close filter panel for Calendar and My List
    }
  };

  const handleSearch = useCallback((newSearch: string) => {
    setSearchTerm(newSearch);
    if (newSearch.trim() !== '' && activeView === 'myList') {
        setActiveView('home'); // Switch from My List to home if search is initiated
    }
  }, [activeView]);

  const handleFilterChange = (newFilterValues: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...newFilterValues }));
  };

  const handleToggleFilterPanel = () => {
    if (activeView !== 'calendar' && activeView !== 'myList') { // Filter panel not for calendar or My List
        setIsFilterPanelOpen(prev => !prev);
    }
  };

  const handleCardClick = (anime: AniListMedia) => {
    setModalTriggerRef(document.activeElement as HTMLElement);
    setSelectedAnimeForModal(anime);
  };

  const closeModal = () => {
    setSelectedAnimeForModal(null);
  };

  const handleYearChange = (year: number) => {
    setSelectedGlobalYear(year);
    if (activeView !== 'home' && searchTerm.trim() === '') setActiveView('home');
  };
  const handleSeasonChange = (season: MediaSeason) => {
    setSelectedGlobalSeason(season);
     if (activeView !== 'home' && searchTerm.trim() === '') setActiveView('home');
  };

  const overallIsLoading = sections.some(s => s.isLoading && s.items.length === 0) && activeView === 'home' && searchTerm.trim() === '';
  
  return (
    <div className="min-h-screen bg-[#0f171e] text-white flex flex-col">
      <Header
        activeView={activeView}
        onViewChange={handleViewChange}
        onSearch={handleSearch}
        isFilterPanelOpen={isFilterPanelOpen}
        onToggleFilterPanel={handleToggleFilterPanel}
        selectedYear={selectedGlobalYear}
        selectedSeason={selectedGlobalSeason}
        onYearChange={handleYearChange}
        onSeasonChange={handleSeasonChange}
      />
      <main className="flex-grow container mx-auto px-2 sm:px-4 pt-0 pb-4 section-container">
        {(activeView !== 'calendar' && activeView !== 'myList' && (searchTerm.trim() !== '' || isFilterPanelOpen)) && (
            <FilterControls
                currentFilters={filterOptions}
                onFilterChange={handleFilterChange}
                isFilterPanelOpen={isFilterPanelOpen}
            />
        )}
        {(activeView === 'home' && searchTerm.trim() === '' && isFilterPanelOpen) && (
             <FilterControls
                currentFilters={filterOptions}
                onFilterChange={handleFilterChange}
                isFilterPanelOpen={isFilterPanelOpen}
            />
        )}

        {activeView === 'calendar' ? (
          <BroadcastCalendar
            schedule={calendarSchedule}
            isLoading={calendarLoading}
            error={calendarError}
            onCardClick={handleCardClick}
            onToggleFavorite={toggleFavorite} 
            isFavorite={isFavorite} 
          />
        ) : (
          <>
            {overallIsLoading && <LoadingSpinner />}
            
            {activeView === 'myList' && !searchTerm && favoriteAnimes.length === 0 && sections.find(s => s.id === 'myList' && !s.isLoading && !s.error) && (
              <p className="text-center text-gray-400 py-10">マイリストにはまだ何も登録されていません。</p>
            )}
            
            {!overallIsLoading && activeView !== 'myList' &&
              sections.every(s => !s.isLoading && s.items.length === 0 && !s.error) &&
              (
                <p className="text-center text-gray-400 py-10">該当するアニメが見つかりませんでした。検索条件やフィルターをご確認ください。</p>
              )
            }

            {sections.map(section => {
              // Specific rendering for MyList
              if (activeView === 'myList') {
                if (section.id === 'myList') {
                  return (
                    <AnimeSection
                      key={section.id}
                      title={section.title}
                      animeItems={section.items} // These are favoriteAnimes
                      isLoading={section.isLoading}
                      error={section.error}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={isFavorite}
                      onCardClick={handleCardClick}
                    />
                  );
                }
                return null; // Don't render other sections in MyList view
              }

              // Default rendering for other views
              if (section.id === 'airingNowList' && searchTerm.trim() !== '') {
                return null;
              }
              if (section.id === 'airingNowList') {
                return (
                  <AiringNowList
                    key={section.id}
                    title={section.title}
                    animeItems={section.items}
                    isLoading={section.isLoading}
                    error={section.error}
                    onAnimeClick={handleCardClick}
                  />
                );
              }
              
              if (searchTerm.trim() !== '' && section.id !== 'searchResults') {
                return null;
              }
              
              return (
                <AnimeSection
                  key={section.id}
                  title={section.title}
                  animeItems={section.items}
                  isLoading={section.isLoading && (section.id === 'searchResults' ? section.items.length === 0 : true)}
                  error={section.error}
                  onToggleFavorite={toggleFavorite} 
                  isFavorite={isFavorite} 
                  onCardClick={handleCardClick}
                />
              );
            })}

            {searchTerm.trim() !== '' && activeView !== 'myList' &&
            sections.find(s => s.id === 'searchResults')?.pageInfo?.hasNextPage &&
            !sections.find(s => s.id === 'searchResults')?.isLoading && (
              <div className="text-center py-8">
                <button
                  onClick={() => handleLoadMore('searchResults')}
                  className="bg-[#00d4ff] text-[#0f171e] font-semibold px-6 py-3 rounded-md hover:bg-[#00aaff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff]"
                >
                  検索結果をもっと見る
                </button>
              </div>
            )}
            {searchTerm.trim() !== '' && activeView !== 'myList' &&
              sections.find(s => s.id === 'searchResults')?.isLoading &&
              (sections.find(s => s.id === 'searchResults')?.items.length ?? 0) > 0 &&
              <LoadingSpinner />}

          </>
        )}
      </main>
      <footer className="text-sm text-gray-400 text-center mt-10 mb-4">
        <p>&copy; 2025 アニメさがせるくん</p>
        <p>データ提供：<a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#00d4ff]">AniList API</a></p>
        <p>
          <a href="/terms" className="underline hover:text-[#00d4ff]">利用規約</a> / <a href="/privacy" className="underline hover:text-[#00d4ff]">プライバシーポリシー</a>
        </p>
      </footer>
      {selectedAnimeForModal && (
        <AnimeDetailModal
          anime={selectedAnimeForModal}
          onClose={closeModal}
          onToggleFavorite={toggleFavorite} 
          isFavorite={isFavorite} 
          initialFocusRef={modalTriggerRef}
        />
      )}
    </div>
  );
};

export default App;
