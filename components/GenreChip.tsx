
import React from 'react';
import { GENRE_MAP } from '../constants';

interface GenreChipProps {
  genre: string; // English genre name
  isSelected: boolean;
  onToggle: (genre: string) => void;
}

const GenreChip: React.FC<GenreChipProps> = ({ genre, isSelected, onToggle }) => {
  const translatedGenre = GENRE_MAP[genre] || genre;

  return (
    <button
      type="button"
      onClick={() => onToggle(genre)}
      className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ease-in-out border
        ${
          isSelected
            ? 'bg-gradient-to-r from-[#00d4ff] to-[#00aaff] text-[#0f171e] border-transparent shadow-md'
            : 'bg-transparent text-gray-300 border-gray-600 hover:bg-[#00d4ff] hover:text-[#0f171e] hover:border-[#00d4ff]'
        }`}
      aria-pressed={isSelected}
    >
      {translatedGenre}
    </button>
  );
};

export default GenreChip;
