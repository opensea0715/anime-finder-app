import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveView, MediaSeason } from '../types';
import { SEASONS, YEARS, SEARCH_DEBOUNCE_DELAY } from '../constants';
import SearchIcon from './icons/SearchIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CustomDropdown from './CustomDropdown';
import XMarkIcon from './icons/XMarkIcon'; // Import XMarkIcon

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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchIconRef = useRef<HTMLButtonElement>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
     onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleSearchIconClick = () => {
    setIsSearchActive(true);
  };

  const handleCloseSearch = useCallback(() => {
    setIsSearchActive(false);
    // setSearchTerm(''); // Optionally clear search term
    // onSearch('');      // Optionally trigger empty search
  }, [/* setSearchTerm, onSearch */]);

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
    // handleCloseSearch(); // Optionally close search on submit
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
    <header className="bg-[#141f2a] shadow-md sticky top-0 z-50 py-2.5">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-x-2 gap-y-2">
          
          {/* Left Group: Logo & Title */}
          <div className="brand-header flex-shrink-0">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0"
              role="img"
              aria-label="サイトロゴ、カレンダーアイコン"
            >
              <span className="text-white text-lg sm:text-xl select-none">🗓️</span>
            </div>
            <h1 className="brand-name text-lg sm:text-xl md:text-2xl font-bold font-mplus text-white whitespace-nowrap">
              <span className="text-[#00d4ff]">覇権</span>アニメさがせるくん
            </h1>
          </div>

          {/* Right Group: Nav, Controls, Search */}
          {/* This group uses w-full on mobile (flex-wrap) to potentially drop to next line if space is tight, then becomes w-auto */}
          <div className="flex items-center flex-nowrap gap-x-1 sm:gap-x-1.5 w-full sm:w-auto justify-end sm:justify-start order-1 sm:order-none">
            <nav className="flex items-center gap-x-0.5 sm:gap-x-1" aria-label="メインナビゲーション">
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
              <div className="flex items-center flex-nowrap gap-x-1 sm:gap-x-1.5">
                <div className="w-[5.5rem] sm:w-24 md:w-28 flex-shrink-0"> {/* Year: Adjusted width for better fit */}
                  <CustomDropdown
                    id="header-year-select"
                    options={yearOptions}
                    selectedValue={selectedYear}
                    onChange={(value) => onYearChange(value as number)}
                    aria-label="放送年を選択"
                  />
                </div>
                <div className="w-[4.5rem] sm:w-20 md:w-24 flex-shrink-0"> {/* Season: Adjusted width for better fit */}
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
              </div>
            )}
            
            {/* Search Area - only shown if filters are shown (not on calendar) */}
            {showSelectorsAndFilters && (
              <div ref={searchContainerRef} className="relative flex items-center">
                {isSearchActive ? (
                  <form 
                    onSubmit={handleSearchSubmit} 
                    className="flex items-center bg-[#1a252f] border border-gray-600 rounded-md shadow-md sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 md:static md:translate-y-0 md:shadow-none transition-all duration-300 ease-in-out z-20"
                    // On small screens (not sm), it will be in flow. On sm, it becomes absolute. On md, static again.
                    // Let's simplify: absolute on small screens, static on medium+
                    style={isSearchActive && window.innerWidth < 768 ? { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 'calc(100vw - 20px)', maxWidth: '300px',  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'} : {}}
                  >
                    <input
                      ref={searchInputRef}
                      id="anime-search-input-active"
                      type="search"
                      placeholder="アニメを検索..."
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleCloseSearch(); }}}
                      className="bg-transparent text-white py-1.5 px-2.5 flex-grow min-w-0 w-28 xs:w-32 sm:w-32 md:w-36 lg:w-40 focus:outline-none placeholder-gray-400 text-xs" // Adjusted widths
                    />
                    <button type="submit" className="p-1.5 text-gray-400 hover:text-[#00d4ff] focus:outline-none" aria-label="検索実行">
                      <SearchIcon className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCloseSearch}
                      className="p-1.5 text-gray-400 hover:text-white mr-1 focus:outline-none"
                      aria-label="検索を閉じる"
                    >
                      <XMarkIcon className="w-3 h-3" />
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
