
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
  const searchIconRef = useRef<HTMLButtonElement>(null); // Added declaration for searchIconRef
  const searchContainerRef = useRef<HTMLDivElement>(null); // Ref for the div wrapping search icon/form
  // const formRef = useRef<HTMLFormElement>(null); // Optional: if form needs direct ref for click outside

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
      // Use searchContainerRef, as the form (even if fixed) is a DOM child of it
      // or the icon is a child. This ensures clicking outside the conceptual "search area" closes it.
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
    // handleCloseSearch(); // Optionally close search on submit, might be better to keep it open
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
              </div>
            )}
            
            {showSelectorsAndFilters && (
              <div ref={searchContainerRef} className="relative flex items-center">
                {isSearchActive ? (
                  <form
                    onSubmit={handleSearchSubmit}
                    // ref={formRef} // Optional: if form needs direct ref for click outside
                    className={`
                      flex items-center transition-all duration-300 ease-in-out
                      fixed inset-x-0 top-0 h-16 bg-[#0f171e] shadow-xl justify-between px-3 z-[60]
                      md:relative md:inset-auto md:top-auto md:h-auto md:bg-[#1a252f] md:border md:border-gray-600 md:rounded-md md:shadow-sm md:p-0 md:w-auto md:min-w-[200px] md:max-w-xs md:z-auto
                    `}
                  >
                    <input
                      ref={searchInputRef}
                      id="anime-search-input-active"
                      type="search"
                      placeholder="アニメを検索..."
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
