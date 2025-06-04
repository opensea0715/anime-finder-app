import React, { useState, useEffect } from 'react';
import { ActiveView, MediaSeason } from '../types';
import { SEASONS, YEARS, SEARCH_DEBOUNCE_DELAY } from '../constants';
import SearchIcon from './icons/SearchIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CustomDropdown from './CustomDropdown';

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
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);

  useEffect(() => {
     onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm); 
  };

  const navButtonClass = (view: ActiveView) => 
    `px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141f2a] focus-visible:ring-[#00d4ff] whitespace-nowrap ${
      activeView === view 
        ? 'bg-[#00d4ff] text-[#0f171e]' 
        : 'text-gray-300 hover:bg-[#1a252f] hover:text-white'
    }`;
  
  const yearOptions = YEARS.map(y => ({ value: y, label: `${y}年` }));
  const seasonOptions = SEASONS.map(s => ({ value: s.value, label: s.label }));
  
  const showSelectorsAndFilters = activeView !== 'calendar';

  return (
    <header className="bg-[#141f2a] shadow-md sticky top-0 z-50 py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
          <div className="brand-header">
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0"
              role="img"
              aria-label="サイトロゴ、虫眼鏡アイコン"
            >
              <span className="text-white text-xl select-none">🗓️</span> {/* Updated Icon */}
            </div>
            <h1 className="brand-name text-2xl md:text-3xl font-bold font-mplus text-white">
              <span className="text-[#00d4ff]">覇権</span>アニメさがせるくん
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center" aria-label="メインナビゲーション">
            <button onClick={() => onViewChange('home')} className={navButtonClass('home')} aria-current={activeView === 'home' ? 'page' : undefined}>
              ホーム
            </button>
            <button onClick={() => onViewChange('myList')} className={navButtonClass('myList')} aria-current={activeView === 'myList' ? 'page' : undefined}>
              マイリスト
            </button>
            <button onClick={() => onViewChange('calendar')} className={navButtonClass('calendar')} aria-current={activeView === 'calendar' ? 'page' : undefined}>
              放送カレンダー
            </button>
            {showSelectorsAndFilters && (
              <>
                <div className="w-28 sm:w-32">
                  <CustomDropdown
                    id="header-year-select"
                    options={yearOptions}
                    selectedValue={selectedYear}
                    onChange={(value) => onYearChange(value as number)}
                    aria-label="放送年を選択"
                  />
                </div>
                <div className="w-24 sm:w-28">
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
                  className="filter-toggle-btn flex-shrink-0"
                  aria-expanded={isFilterPanelOpen}
                  aria-controls="filter-panel"
                >
                  絞り込み
                  <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isFilterPanelOpen ? 'transform rotate-180' : ''}`} />
                </button>
              </>
            )}
          </nav>
        </div>

        {showSelectorsAndFilters && ( // Also hide search bar if calendar view is active? User might want to search and then go to calendar. Let's keep it for now.
             <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
              <form onSubmit={handleSearchSubmit} className="w-full md:flex-grow relative" role="search">
                <label htmlFor="anime-search-input" className="sr-only">アニメを検索</label>
                <input
                  id="anime-search-input"
                  type="search"
                  placeholder="アニメを検索..."
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  className="w-full bg-[#1a252f] text-white border border-gray-600 rounded-md py-2.5 px-4 pl-10 focus:outline-none focus:border-[#00d4ff] placeholder-gray-400"
                />
                <button 
                  type="submit" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#00d4ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff] focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a252f] rounded"
                  aria-label="検索実行"
                >
                  <SearchIcon className="w-5 h-5"/>
                </button>
              </form>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;