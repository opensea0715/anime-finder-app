
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveView, MediaSeason } from '../types';
import { SEASONS, YEARS, SEARCH_DEBOUNCE_DELAY } from '../constants';
import SearchIcon from './icons/SearchIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CustomDropdown from './CustomDropdown';
import XMarkIcon from './icons/XMarkIcon';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onSearch: (term: string) => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  selectedYear: number;
  selectedSeason: MediaSeason;
  onYearChange: (year: number) => void;
  onSeasonChange: (season: MediaSeason) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  onSearch,
  isFilterPanelOpen,
  onToggleFilterPanel,
  selectedYear,
  selectedSeason,
  onYearChange,
  onSeasonChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchIconRef = useRef<HTMLButtonElement>(null); 
  const searchContainerRef = useRef<HTMLDivElement>(null); 

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const SCROLL_THRESHOLD = 5; 

  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
     onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      const currentScrollY = window.scrollY;
      const headerHeight = headerRef.current.offsetHeight;

      if (Math.abs(currentScrollY - lastScrollY.current) < SCROLL_THRESHOLD) {
          return; 
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > headerHeight) {
          setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current || currentScrollY < headerHeight ) {
          setIsHeaderVisible(true);
      }
      lastScrollY.current = Math.max(0, currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); 

  const handleSearchIconClick = () => {
    setIsSearchActive(true);
  };

  const handleCloseSearch = useCallback(() => {
    setIsSearchActive(false);
    searchIconRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSearchActive &&
          searchContainerRef.current && 
          !searchContainerRef.current.contains(event.target as Node)) {
        handleCloseSearch();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchActive, handleCloseSearch]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm); 
  };

  const navButtonClass = (view: ActiveView) => 
    `px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f2a] focus-visible:ring-[#00d4ff] whitespace-nowrap ${
      activeView === view 
        ? 'bg-[#00d4ff] text-[#0f171e]' 
        : 'text-gray-300 hover:bg-[#1a252f] hover:text-white'
    }`;
  
  const yearOptions = YEARS.map(y => ({ value: y, label: `${y}年` }));
  const seasonOptions = SEASONS.map(s => ({ value: s.value, label: s.label }));
  
  const showSelectorsAndFilters = activeView !== 'calendar';
  
  return (
    <header 
      ref={headerRef}
      className={`bg-[#141f2a] shadow-md sticky top-0 z-50 py-2.5 transform transition-transform duration-300 ease-in-out ${!isHeaderVisible ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="container mx-auto px-3 sm:px-4">
        {/* Main flex container: column on mobile, row on desktop */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          
          {/* Left Part: Logo + Site Name */}
          <div className="flex items-center flex-shrink-0 pb-2 md:pb-0"> {/* Added pb-2 md:pb-0 */}
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0"
              role="img"
              aria-label="サイトロゴ、カレンダーアイコン"
            >
              <span className="text-white text-lg sm:text-xl select-none">🗓️</span>
            </div>
            <h1 className="brand-name text-base sm:text-lg md:text-xl lg:text-2xl font-bold font-mplus text-white whitespace-nowrap ml-3">
              <span className="text-[#00d4ff]">覇権</span>アニメさがせるくん
            </h1>
          </div>

          {/* Right Part: Navigation, Selectors, Filters, Search (Scrollable on mobile) */}
          <div className="relative flex items-center w-full md:w-auto md:justify-end"> {/* Scroll wrapper */}
            <div 
              className="flex items-center flex-nowrap overflow-x-auto scrollbar-hide scroll-smooth whitespace-nowrap gap-x-1.5 sm:gap-x-2 py-1 md:py-0 md:overflow-visible"
              // Increased gap slightly for better touch targets on mobile scroll
            >
              <nav className="flex items-center gap-x-1 sm:gap-x-1.5" aria-label="メインナビゲーション">
                <button onClick={() => onViewChange('home')} className={navButtonClass('home')} aria-current={activeView === 'home' ? 'page' : undefined}>
                  ホーム
                </button>
                <button onClick={() => onViewChange('myList')} className={navButtonClass('myList')} aria-current={activeView === 'myList' ? 'page' : undefined}>
                  マイリスト
                </button>
                <button onClick={() => onViewChange('calendar')} className={navButtonClass('calendar')} aria-current={activeView === 'calendar' ? 'page' : undefined}>
                  放送カレンダー
                </button>
              </nav>

              {showSelectorsAndFilters && (
                <div className="flex items-center gap-x-1 sm:gap-x-1.5"> {/* This div is a direct child of scrollable area */}
                  <div className="w-[5.5rem] sm:w-24 md:w-28 flex-shrink-0">
                    <CustomDropdown
                      id="header-year-select"
                      options={yearOptions}
                      selectedValue={selectedYear}
                      onChange={(value) => onYearChange(value as number)}
                      aria-label="放送年を選択"
                    />
                  </div>
                  <div className="w-[4.5rem] sm:w-20 md:w-24 flex-shrink-0">
                    <CustomDropdown
                      id="header-season-select"
                      options={seasonOptions}
                      selectedValue={selectedSeason}
                      onChange={(value) => onSeasonChange(value as MediaSeason)}
                      aria-label="放送季節を選択"
                    />
                  </div>
                  <button
                    onClick={onToggleFilterPanel}
                    className="text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-gray-900 px-2 sm:px-2.5 py-1.5 rounded-full flex items-center gap-0.5 sm:gap-1 transition-all duration-200 ease-in-out shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#141f2a] focus-visible:ring-orange-500 flex-shrink-0 whitespace-nowrap"
                    aria-expanded={isFilterPanelOpen}
                    aria-controls="filter-panel"
                  >
                    絞込
                    <ChevronDownIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  </button>
                  
                  <div ref={searchContainerRef} className="relative flex items-center flex-shrink-0">
                    {isSearchActive ? (
                      <form
                        onSubmit={handleSearchSubmit}
                        className={`
                          flex items-center transition-all duration-300 ease-in-out
                          fixed inset-x-0 top-0 h-16 bg-[#0f171e] shadow-xl justify-between px-3 z-[60]
                          md:relative md:inset-auto md:top-auto md:h-auto md:bg-[#1a252f] md:border md:border-gray-600 md:rounded-md md:shadow-sm md:p-0 md:w-auto md:min-w-[120px] md:max-w-[180px] md:z-auto
                        `}
                      >
                        <input
                          ref={searchInputRef}
                          id="anime-search-input-active"
                          type="search"
                          placeholder="検索..."
                          value={searchTerm}
                          onChange={handleSearchInputChange}
                          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleCloseSearch(); }}}
                          className="bg-transparent text-white flex-grow min-w-0 placeholder-gray-400 text-sm focus:outline-none py-2 px-2 md:py-1.5 md:px-2.5 md:text-xs"
                        />
                        <button type="submit" className="p-2 text-gray-400 hover:text-[#00d4ff] focus:outline-none md:p-1.5" aria-label="検索実行">
                          <SearchIcon className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseSearch}
                          className="p-2 text-gray-400 hover:text-white focus:outline-none md:p-1.5 md:mr-1"
                          aria-label="検索を閉じる"
                        >
                          <XMarkIcon className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                      </form>
                    ) : (
                      <button
                        ref={searchIconRef}
                        onClick={handleSearchIconClick}
                        className="p-1.5 text-gray-300 hover:text-white rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#141f2a] focus-visible:ring-[#00d4ff]"
                        aria-label="アニメを検索"
                      >
                        <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Mobile scroll hint - gradient overlay */}
            <div className="absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-[#141f2a] via-[#141f2a]/80 to-transparent pointer-events-none md:hidden z-10"></div>
          </div> {/* End of Right Part / Scroll wrapper */}
        </div> {/* End of Main flex container */}
      </div>
    </header>
  );
};

export default Header;
