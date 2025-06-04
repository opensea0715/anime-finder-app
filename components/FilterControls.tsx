
import React from 'react';
import { FilterOptions, MediaSort, MediaStatus, ScoreRangeValue } from '../types';
import { AVAILABLE_GENRES, SCORE_RANGES, STATUS_OPTIONS, SORT_OPTIONS } from '../constants';
import GenreChip from './GenreChip';
import CustomDropdown from './CustomDropdown';
// ChevronDownIcon is no longer needed here as the button moved to Header.tsx

interface FilterControlsProps {
  currentFilters: FilterOptions;
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  isFilterPanelOpen: boolean; // Added prop
}

const FilterControls: React.FC<FilterControlsProps> = ({ currentFilters, onFilterChange, isFilterPanelOpen }) => {
  // Removed internal isOpen state, now controlled by isFilterPanelOpen prop

  const handleGenreToggle = (genre: string) => {
    const newGenres = currentFilters.genres.includes(genre)
      ? currentFilters.genres.filter(g => g !== genre)
      : [...currentFilters.genres, genre];
    onFilterChange({ genres: newGenres });
  };

  const handleScoreChange = (value: string | number) => {
    onFilterChange({ scoreRange: value as ScoreRangeValue });
  };

  const handleStatusChange = (value: string | number) => {
    onFilterChange({ status: value as MediaStatus | 'any' });
  };

  const handleSortChange = (value: string | number) => {
    onFilterChange({ sort: value as MediaSort });
  };

  return (
    <div className="px-4 md:px-0"> {/* Removed py-4 */}
      {/* Button moved to Header.tsx */}
      
      <div
        id="filter-panel"
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterPanelOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={{
          maxHeight: isFilterPanelOpen ? '1000px' : '0px', 
        }}
        aria-hidden={!isFilterPanelOpen} // Accessibility: indicate hidden state
      >
        <div className="p-4 md:p-6 bg-[rgba(26,37,47,0.8)] backdrop-blur-lg rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Genre Filter */}
            <div className="md:col-span-2 lg:col-span-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-2" id="genre-filter-label">ジャンル (複数選択可)</h3>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="genre-filter-label">
                {AVAILABLE_GENRES.map(genre => (
                  <GenreChip
                    key={genre}
                    genre={genre}
                    isSelected={currentFilters.genres.includes(genre)}
                    onToggle={handleGenreToggle}
                  />
                ))}
              </div>
            </div>

            {/* Score Filter */}
            <div>
              <CustomDropdown
                label="評価範囲"
                id="score-filter"
                options={SCORE_RANGES.map(sr => ({ value: sr.value, label: sr.label }))}
                selectedValue={currentFilters.scoreRange}
                onChange={handleScoreChange}
              />
            </div>

            {/* Status Filter */}
            <div>
              <CustomDropdown
                label="ステータス"
                id="status-filter"
                options={STATUS_OPTIONS.map(so => ({ value: so.value, label: so.label }))}
                selectedValue={currentFilters.status}
                onChange={handleStatusChange}
              />
            </div>
            
            {/* Sort Filter */}
            <div className="md:col-start-3 lg:col-start-auto"> {/* Minor adjustment for consistent column flow if needed */}
              <CustomDropdown
                label="ソート"
                id="sort-filter"
                options={SORT_OPTIONS.map(so => ({ value: so.value, label: so.label }))}
                selectedValue={currentFilters.sort}
                onChange={handleSortChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
