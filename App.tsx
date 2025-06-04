
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
  AiringScheduleEntry, AiringSort, MediaStatus // Added MediaStatus here
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
    
    const effectivePerPage = isMyListSection ? ITEMS_PER_PAGE : sectionDefinition.perPage || ITEMS_PER_SECTION;
    const effectiveSort = sectionDefinition.sort?.[0] || globalFilters.sort;

    let serviceParams: FetchAnimeParams = {
      page: pageForPagination,
      perPage: effectivePerPage,
      sort: [effectiveSort],
      scoreRanges: SCORE_RANGES,
    };

    if (isMyListSection) {
      if (favoriteIdsForMyList.length === 0) {
        return { items: [], isLoading: false, error: null, pageInfo: { total: 0, currentPage: 1, hasNextPage: false, perPage: effectivePerPage } };
      }
      serviceParams.ids = favoriteIdsForMyList;
    } else if (globalSearchTerm) {
      serviceParams.search = globalSearchTerm;
      // When searching, broaden the scope beyond just the selected season/year for better results,
      // unless specific year/season filters are also applied (which they are, via globalFilters).
      serviceParams.season = currentGlobalSeason;
      serviceParams.seasonYear = currentGlobalYear;
      
      if (globalFilters.genres.length > 0) {
        serviceParams.genre_in = globalFilters.genres;
      }
    } else {
      // For non-search, non-myList sections (like trending, selectedPeriod, airingNowList)
      serviceParams.season = sectionDefinition.season || currentGlobalSeason; // Use section specific or global
      serviceParams.seasonYear = sectionDefinition.seasonYear || currentGlobalYear;
      
      if (sectionDefinition.genre_in && sectionDefinition.genre_in.length > 0) {
        serviceParams.genre_in = sectionDefinition.genre_in;
      } else if (globalFilters.genres.length > 0 && sectionDefinition.id !== 'airingNowList' && sectionDefinition.id !== 'selectedPeriod') {
        // Apply global genre filters only if not a specific season/year or airingNowList section
        // And also not for other curated sections like 'trending', 'topRated' etc.
        // This logic might need refinement based on desired behavior for global genre filters on specific sections
      }
      
      if (sectionDefinition.format_in && sectionDefinition.format_in.length > 0) {
        serviceParams.format_in = sectionDefinition.format_in;
      }
       // Add status_in from section definition (for airingNowList)
      if (sectionDefinition.status_in && sectionDefinition.status_in.length > 0) {
        serviceParams.status_in = sectionDefinition.status_in;
      }
    }

    // Apply global status filter, but not if sectionDefinition already has one (e.g. airingNowList)
    // Also, do not apply global status filter if it's a search or My List
    if (globalFilters.status !== 'any' && !serviceParams.status_in && !isMyListSection && !globalSearchTerm) {
      serviceParams.status_in = [globalFilters.status];
    }


    if (globalFilters.scoreRange === 'none') {
      serviceParams.filtersForNoneScore = { scoreRange: 'none' };
    } else if (globalFilters.scoreRange !== 'any') {
      const selectedRange = SCORE_RANGES.find(r => r.value === globalFilters.scoreRange);
      if (selectedRange) {
        if (selectedRange.minScore !== undefined) serviceParams.averageScore_greater = selectedRange.minScore - 1; // API is score_greater (exclusive)
        if (selectedRange.maxScore !== undefined) serviceParams.averageScore_lesser = selectedRange.maxScore + 1; // API is score_lesser (exclusive)
      }
    }
    
    try {
      const response = await fetchAnime(serviceParams);

      if (response.data?.Page) {
        return { items: response.data.Page.media, error: null, pageInfo: response.data.Page.pageInfo };
      } else if (response.errors) {
        const errorMessages = response.errors.map(e => e.message).join(', ');
        return { items: [], error: errorMessages, pageInfo: null };
      }
      return { items: [], error: 'Unknown response structure', pageInfo: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
      console.error(`Error in loadSectionData for section ${sectionDefinition.id}:`, err);
      return { items: [], error: errorMessage, pageInfo: null };
    }
  }, []);

  const loadCalendarData = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError(null);

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    
    // Set to Monday of the current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1)); 
    monday.setHours(0, 0, 0, 0);

    // Set to Sunday of the current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const airingAt_greater = Math.floor(monday.getTime() / 1000);
    const airingAt_lesser = Math.floor(sunday.getTime() / 1000);

    try {
      let allSchedules: AiringScheduleEntry[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      const perPage = 50; // Max per page by AniList for airing schedules

      while(hasNextPage && currentPage <= 3) { // Limit to 3 pages (150 entries) to avoid too many requests
        const response = await fetchAiringSchedule({ 
          airingAt_greater, 
          airingAt_lesser, 
          sort: [AiringSort.TIME], // Sort by airing time
          page: currentPage,
          perPage: perPage,
        });

        if (response.data?.Page?.airingSchedules) {
          allSchedules = allSchedules.concat(response.data.Page.airingSchedules);
          hasNextPage = response.data.Page.pageInfo?.hasNextPage || false;
          currentPage++;
        } else {
          hasNextPage = false; // Stop if no data or error
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
      setCalendarSchedule([]); // Clear schedule on error
    } finally {
      setCalendarLoading(false);
    }
  }, []);


  useEffect(() => {
    if (activeView === 'calendar') {
      setSections([]); // Clear home/myList sections
      setIsFilterPanelOpen(false); // Close filter panel if open
      loadCalendarData();
    } else {
      const currentYearToDisplay = selectedGlobalYear || initialYear;
      const currentSeasonToDisplay = selectedGlobalSeason || initialSeason;
      
      const homeSectionDefinitions: FetchAnimeSectionParams[] = [
        { 
          id: 'selectedPeriod', 
          season: currentSeasonToDisplay, 
          seasonYear: currentYearToDisplay, 
          sort: [MediaSort.POPULARITY_DESC], 
          perPage: ITEMS_PER_SECTION 
        },
        { // This section definition is for the AiringNowList component
          id: 'airingNowList',
          season: currentSeasonToDisplay,
          seasonYear: currentYearToDisplay,
          status_in: [MediaStatus.RELEASING], // Specifically fetch RELEASING anime
          sort: [MediaSort.POPULARITY_DESC], // Or another relevant sort like START_DATE_DESC
          perPage: 50, // Fetch up to 50 items for the list view
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
        airingNowList: '今期放送中のアニメ一覧', // Title for the new list section
      };
      
      const myListSectionDefinition: FetchAnimeSectionParams = {
        id: 'myList', sort: [filterOptions.sort], perPage: ITEMS_PER_PAGE // Use global sort for My List
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
          favorites, // Pass current favorites list for MyList fetching
          1 // Initial page for all sections
        ).then(data => {
          setSections(prevSections => prevSections.map(s => s.id === def.id ? { ...s, ...data, isLoading: false } : s));
        }).catch(error => {
          console.error(`Error loading section ${def.id}:`, error);
          setSections(prevSections => prevSections.map(s => 
              s.id === def.id ? { 
                  ...s, 
                  isLoading: false, 
                  error: error instanceof Error ? error.message : String(error) 
              } : s
          ));
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, searchTerm, filterOptions, favorites, loadSectionData, selectedGlobalYear, selectedGlobalSeason, loadCalendarData]);

  const handleLoadMoreMyList = () => {
    const myListSec = sections.find(s => s.id === 'myList');
    if (myListSec && myListSec.pageInfo?.hasNextPage && !myListSec.isLoading) {
      const nextPage = (myListSec.pageInfo?.currentPage || 0) + 1;
      setSections(prev => prev.map(s => s.id === 'myList' ? {...s, isLoading: true} : s)); 

      loadSectionData( 
        myListSec.fetchParams, filterOptions, searchTerm, 
        selectedGlobalYear, selectedGlobalSeason, 
        true, favorites, nextPage // Pass current favorites for pagination
      ).then(data => {
         setSections(prevSections => prevSections.map(s => 
            s.id === 'myList' ? { 
                ...s, 
                items: [...s.items, ...(data.items || [])], 
                pageInfo: data.pageInfo,
                error: data.error,
                isLoading: false 
            } : s));
      }).catch(error => {
        console.error(`Error loading more for MyList:`, error);
        setSections(prevSections => prevSections.map(s => 
            s.id === 'myList' ? { 
                ...s, 
                isLoading: false, 
                error: error instanceof Error ? error.message : String(error) 
            } : s
        ));
      });
    }
  };

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
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
    if (activeView !== 'home') setActiveView('home'); 
  };
  const handleSeasonChange = (season: MediaSeason) => {
    setSelectedGlobalSeason(season);
     if (activeView !== 'home') setActiveView('home'); 
  };
  
  const overallIsLoading = sections.some(s => s.isLoading && s.items.length === 0) && activeView !== 'calendar';

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
        {activeView !== 'calendar' && (
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
            {overallIsLoading && sections.length > 0 && <LoadingSpinner />}

            {!overallIsLoading && sections.length === 0 && activeView === 'myList' && favorites.length === 0 && (
              <p className="text-center text-gray-400 py-10">マイリストにはまだ何も登録されていません。</p>
            )}

            {!overallIsLoading && 
              sections.every(s => !s.isLoading && s.items.length === 0 && !s.error) && 
              !(activeView === 'myList' && favorites.length === 0) && (
              <p className="text-center text-gray-400 py-10">該当するアニメが見つかりませんでした。検索条件やフィルターをご確認ください。</p>
            )}
            
            {sections.map(section => {
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
              // CRITICAL: For "My List", ensure items are filtered by the current favorite status at render time.
              // This makes the list reactive to favorite toggles.
              if (section.id === 'myList') {
                itemsToDisplay = section.items.filter(anime => isFavorite(anime.id));
              }

              return (
                <AnimeSection
                  key={section.id}
                  title={section.title}
                  animeItems={itemsToDisplay}
                  isLoading={section.isLoading && itemsToDisplay.length === 0} 
                  error={section.error}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite} // Pass the isFavorite function
                  onCardClick={handleCardClick}
                />
              );
            })}

            {activeView === 'myList' && 
            sections.find(s => s.id === 'myList')?.pageInfo?.hasNextPage && 
            !sections.find(s => s.id === 'myList')?.isLoading && (
              <div className="text-center py-8">
                <button
                  onClick={handleLoadMoreMyList}
                  className="bg-[#00d4ff] text-[#0f171e] font-semibold px-6 py-3 rounded-md hover:bg-[#00aaff] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff]"
                >
                  もっと見る (マイリスト)
                </button>
              </div>
            )}
            {activeView === 'myList' && 
              sections.find(s => s.id === 'myList')?.isLoading && 
              (sections.find(s => s.id === 'myList')?.items.filter(anime => isFavorite(anime.id)).length ?? 0) > 0 && 
              <LoadingSpinner />}
          </>
        )}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-700 mt-auto">
        データ提供: <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">AniList</a>. 
        Favicon by <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">Icons8</a>.
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
