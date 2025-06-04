
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import FilterControls from './components/FilterControls';
import AnimeDetailModal from './components/AnimeDetailModal';
import AnimeSection from './components/AnimeSection'; 
import AiringNowList from './components/AiringNowList'; // New component for airing now list
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
  
  const [favorites, toggleFavorite, isFavorite] = useFavorites();
  const [selectedAnimeForModal, setSelectedAnimeForModal] = useState<AniListMedia | null>(null);
  const [modalTriggerRef, setModalTriggerRef] = useState<HTMLElement | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  const { season: initialSeason, year: initialYear } = getCurrentSeasonAndYear();
  const [selectedGlobalYear, setSelectedGlobalYear] = useState<number>(initialYear);
  const [selectedGlobalSeason, setSelectedGlobalSeason] = useState<MediaSeason>(initialSeason);

  const [calendarSchedule, setCalendarSchedule] = useState<AiringScheduleEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);


  const loadSectionData = useCallback(async (
    sectionDefinition: FetchAnimeSectionParams,
    globalFilters: FilterOptions,
    globalSearchTerm: string,
    currentGlobalYear: number, 
    currentGlobalSeason: MediaSeason, 
    isMyListSection: boolean = false,
    favoriteIdsForMyList: number[] = [],
    pageForPagination: number = 1 
  ): Promise<Partial<AnimeSectionData>> => {
    
    const effectivePerPage = (sectionDefinition.id === 'myList' || sectionDefinition.id === 'searchResults') 
      ? ITEMS_PER_PAGE 
      : sectionDefinition.perPage || ITEMS_PER_SECTION;
    const effectiveSort = sectionDefinition.sort?.[0] || globalFilters.sort;

    let serviceParams: FetchAnimeParams = {
      page: pageForPagination,
      perPage: effectivePerPage,
      sort: [effectiveSort], // Sorting is applied to MyList as well
      scoreRanges: SCORE_RANGES, // Informational for fetchAnime, not a direct filter here
    };

    if (isMyListSection) {
      if (favoriteIdsForMyList.length === 0) {
        return { items: [], isLoading: false, error: null, pageInfo: { total: 0, currentPage: 1, hasNextPage: false, perPage: effectivePerPage } };
      }
      serviceParams.ids = favoriteIdsForMyList;
      // For MyList, other global filters (genre, status, score) are NOT applied.
      // Only sort and explicit IDs.
    } else if (globalSearchTerm) { 
      serviceParams.search = globalSearchTerm;
      if (globalFilters.genres.length > 0) {
        serviceParams.genre_in = globalFilters.genres;
      }
      // If a section (like "selectedPeriod") is searchable AND has specific time params, they should be used.
      // Otherwise, search is global across time unless specific year/season is part of the search query itself (which AniList might support).
      // For now, specific year/season for sectionDefinition is only applied if it's not a global search, or if section implies it.
      if (sectionDefinition.season && sectionDefinition.seasonYear && sectionDefinition.id === 'selectedPeriod') { 
        serviceParams.season = sectionDefinition.season;
        serviceParams.seasonYear = sectionDefinition.seasonYear;
      }
      // Status and Score filters will be applied below for search as well
    } else { // Regular home sections (not MyList, not search)
      serviceParams.season = sectionDefinition.season || currentGlobalSeason;
      serviceParams.seasonYear = sectionDefinition.seasonYear || currentGlobalYear;
      
      if (sectionDefinition.genre_in && sectionDefinition.genre_in.length > 0) {
        serviceParams.genre_in = sectionDefinition.genre_in; // Section-specific genres
      }
      if (sectionDefinition.format_in && sectionDefinition.format_in.length > 0) {
        serviceParams.format_in = sectionDefinition.format_in;
      }
      if (sectionDefinition.status_in && sectionDefinition.status_in.length > 0) {
        serviceParams.status_in = sectionDefinition.status_in; // Section-specific status
      }
      // Status and Score filters from globalFilters will be applied below if not already set by sectionDefinition
    }

    // Apply global filters like status and score range, *unless* it's MyList.
    // For search results, these global filters should also apply.
    if (!isMyListSection) {
        // Apply global status filter if not already set by section definition (for home sections) or search
        if (globalFilters.status !== 'any' && !serviceParams.status_in) {
          serviceParams.status_in = [globalFilters.status];
        }

        // Apply global score range filter
        if (globalFilters.scoreRange === 'none') {
          serviceParams.filtersForNoneScore = { scoreRange: 'none' };
        } else if (globalFilters.scoreRange !== 'any') {
          const selectedRange = SCORE_RANGES.find(r => r.value === globalFilters.scoreRange);
          if (selectedRange) {
            if (selectedRange.minScore !== undefined) serviceParams.averageScore_greater = selectedRange.minScore - 1; // AniList score_greater is exclusive
            if (selectedRange.maxScore !== undefined) serviceParams.averageScore_lesser = selectedRange.maxScore + 1; // AniList score_lesser is exclusive
          }
        }
        // Global genre filters are applied to search explicitly. For home sections, section-specific genres are used.
    }
    
    try {
      const response = await fetchAnime(serviceParams);

      if (response.data?.Page) {
        return { items: response.data.Page.media, error: null, pageInfo: response.data.Page.pageInfo };
      } else if (response.errors) {
        const errorMessages = response.errors.map(e => e.message).join(', ');
        return { items: [], error: errorMessages, pageInfo: null };
      }
      return { items: [], error: 'APIからの応答が不正です。', pageInfo: null };
    } catch (err) { // This catch is for unexpected errors during the process, not GraphQL errors from response.
      const errorMessage = err instanceof Error ? err.message : 'データの取得処理中に不明なエラーが発生しました。';
      console.error(`Error in loadSectionData internal try-catch for section ${sectionDefinition.id}:`, err);
      return { items: [], error: errorMessage, pageInfo: null };
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

      while(hasNextPage && currentPage <= 3) { 
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

    const processErrorForDisplay = (error: any, sectionId: string): string => {
      let displayErrorMessage = 'データの読み込み中に予期せぬエラーが発生しました。';
      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          // This is a fallback. The detailed message should come from aniListService.
          displayErrorMessage = 'ネットワーク接続に問題があるか、サーバーに到達できませんでした。接続を確認し、再試行してください。';
          console.warn(`Fallback 'Failed to fetch' handler in App.tsx for section ${sectionId}. This suggests aniListService's detailed message might have been bypassed.`);
        } else {
          displayErrorMessage = error.message || `データの読み込みに失敗しました (${sectionId} - 詳細不明)。`;
        }
      } else if (typeof error === 'string' && error.trim() !== '') {
        displayErrorMessage = error;
      }
      // Log the original error for debugging if it's not the standard string from loadSectionData
      if (!(typeof error === 'string')) {
        console.error(`Fallback error processing in App.tsx for section ${sectionId}:`, error);
      }
      return displayErrorMessage;
    };


    if (searchTerm.trim() !== '') {
      const searchResultsSectionDefinition: FetchAnimeSectionParams = {
        id: 'searchResults',
        sort: [filterOptions.sort], 
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
        false, 
        [],    
        1 
      ).then(data => {
        setSections(prevSections => prevSections.map(s => 
          s.id === 'searchResults' ? { ...s, ...data, isLoading: false, title: sectionTitle, error: data.error ? processErrorForDisplay(data.error, 'searchResults') : null } : s
        ));
      }).catch(rawError => { // Catch for if loadSectionData itself rejects (should be rare)
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
    } else {
      // Home or MyList view
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
        myList: 'マイリスト',
        airingNowList: '今期放送中のアニメ一覧', 
      };
      
      const myListSectionDefinition: FetchAnimeSectionParams = {
        id: 'myList', sort: [filterOptions.sort], perPage: ITEMS_PER_PAGE 
      };

      const activeSectionDefinitions = activeView === 'home' ? homeSectionDefinitions : [myListSectionDefinition];

      setSections(activeSectionDefinitions.map(def => {
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
          pageInfo: null,
        };
      }));

      activeSectionDefinitions.forEach(def => {
        loadSectionData(
          def,
          filterOptions, 
          searchTerm,    
          currentYearToDisplay, 
          currentSeasonToDisplay, 
          def.id === 'myList', 
          def.id === 'myList' ? favorites : [], 
          1 
        ).then(data => {
          setSections(prevSections => prevSections.map(s => s.id === def.id ? { ...s, ...data, isLoading: false, error: data.error ? processErrorForDisplay(data.error, def.id) : null } : s));
        }).catch(rawError => { // Catch for if loadSectionData itself rejects
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
  }, [activeView, searchTerm, filterOptions, favorites, loadSectionData, selectedGlobalYear, selectedGlobalSeason, loadCalendarData]); // Removed initialYear, initialSeason as they don't change

  const handleLoadMore = useCallback(async (sectionId: 'myList' | 'searchResults') => {
    const targetSection = sections.find(s => s.id === sectionId);
    if (!targetSection || !targetSection.pageInfo?.hasNextPage || targetSection.isLoading) {
      return;
    }

    const nextPage = (targetSection.pageInfo?.currentPage || 0) + 1;
    setSections(prev => prev.map(s => s.id === sectionId ? {...s, isLoading: true} : s));

    const currentSearchTermForLoad = sectionId === 'searchResults' ? targetSection.fetchParams.search || '' : '';
    
    loadSectionData(
      targetSection.fetchParams, 
      filterOptions,            
      currentSearchTermForLoad, 
      selectedGlobalYear,
      selectedGlobalSeason,
      sectionId === 'myList',   
      sectionId === 'myList' ? favorites : [], 
      nextPage
    ).then(data => {
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            items: [...s.items, ...(data.items || [])],
            pageInfo: data.pageInfo,
            error: data.error, // Assume error from loadSectionData is already processed if needed
            isLoading: false
          };
        }
        return s;
      }));
    }).catch(error => {
      console.error(`Error loading more for ${sectionId}:`, error);
      // Simplified error handling for loadMore, primary error should be on initial load
      setSections(prevSections => prevSections.map(s =>
        s.id === sectionId ? {
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : '続きのデータの読み込みに失敗しました。'
        } : s
      ));
    });
  }, [sections, loadSectionData, filterOptions, selectedGlobalYear, selectedGlobalSeason, favorites]);


  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    setSearchTerm(''); 
    if (view !== 'calendar') {
        setCalendarSchedule([]); 
    }
  };

  const handleSearch = useCallback((newSearch: string) => {
    setSearchTerm(newSearch);
  }, []);

  const handleFilterChange = (newFilterValues: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({ ...prev, ...newFilterValues }));
  };

  const handleToggleFilterPanel = () => {
    if (activeView !== 'calendar') { 
        setIsFilterPanelOpen(prev => !prev);
    }
  };

  const handleCardClick = (anime: AniListMedia) => {
    setModalTriggerRef(document.activeElement as HTMLElement);
    setSelectedAnimeForModal(anime);
  };

  const closeModal = () => {
    setSelectedAnimeForModal(null);
    modalTriggerRef?.focus();
  };

  const handleYearChange = (year: number) => {
    setSelectedGlobalYear(year);
    if (activeView !== 'home' && searchTerm.trim() === '') setActiveView('home'); 
  };
  const handleSeasonChange = (season: MediaSeason) => {
    setSelectedGlobalSeason(season);
     if (activeView !== 'home' && searchTerm.trim() === '') setActiveView('home'); 
  };
  
  const overallIsLoading = sections.some(s => s.isLoading && s.items.length === 0) && activeView !== 'calendar' && searchTerm.trim() === '';

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
        {activeView !== 'calendar' && searchTerm.trim() === '' && ( 
          <FilterControls
            currentFilters={filterOptions}
            onFilterChange={handleFilterChange}
            isFilterPanelOpen={isFilterPanelOpen}
          />
        )}
        {searchTerm.trim() !== '' && ( // Show filters also on search results page
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

            {!overallIsLoading && searchTerm.trim() === '' && activeView === 'myList' && favorites.length === 0 && sections.find(s => s.id === 'myList' && !s.isLoading && !s.error) && (
              <p className="text-center text-gray-400 py-10">マイリストにはまだ何も登録されていません。</p>
            )}

            {!overallIsLoading && 
              sections.every(s => !s.isLoading && s.items.length === 0 && !s.error) && 
              !(activeView === 'myList' && favorites.length === 0 && searchTerm.trim() === '') && (
              <p className="text-center text-gray-400 py-10">該当するアニメが見つかりませんでした。検索条件やフィルターをご確認ください。</p>
            )}
            
            {sections.map(section => {
              // Skip AiringNowList if there's an active search term
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
              
              let itemsToDisplay = section.items;
              
              // If searching, only show the 'searchResults' section
              if (searchTerm.trim() !== '' && section.id !== 'searchResults') {
                return null; 
              }

              return (
                <AnimeSection
                  key={section.id}
                  title={section.title}
                  animeItems={itemsToDisplay}
                  // Show loader for searchResults only if items are empty, for others always if loading
                  isLoading={section.isLoading && (section.id === 'searchResults' ? itemsToDisplay.length === 0 : true)}
                  error={section.error}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite} 
                  onCardClick={handleCardClick}
                />
              );
            })}
            
            {/* Load More for My List */}
            {activeView === 'myList' && searchTerm.trim() === '' &&
            sections.find(s => s.id === 'myList')?.pageInfo?.hasNextPage && 
            !sections.find(s => s.id === 'myList')?.isLoading && (
              <div className="text-center py-8">
                <button
                  onClick={() => handleLoadMore('myList')}
                  className="bg-[#00d4ff] text-[#0f171e] font-semibold px-6 py-3 rounded-md hover:bg-[#00aaff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff]"
                >
                  もっと見る (マイリスト)
                </button>
              </div>
            )}
            {activeView === 'myList' && searchTerm.trim() === '' &&
              sections.find(s => s.id === 'myList')?.isLoading && 
              (sections.find(s => s.id === 'myList')?.items.length ?? 0) > 0 && 
              <LoadingSpinner />}

            {/* Load More for Search Results */}
            {searchTerm.trim() !== '' &&
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
            {searchTerm.trim() !== '' &&
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
