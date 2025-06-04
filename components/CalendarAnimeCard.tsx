import React from 'react';
import { AniListMedia } from '../types';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../constants';

interface CalendarAnimeCardProps {
  anime: AniListMedia;
  onCardClick: (anime: AniListMedia) => void;
  airingTime: string;
  isLastItem?: boolean; // Added to control border styling for the last item
}

const CalendarAnimeCard: React.FC<CalendarAnimeCardProps> = ({ anime, onCardClick, airingTime, isLastItem }) => {
  const title = anime.title.native || anime.title.romaji || anime.title.english || 'タイトル不明';
  const coverImage = anime.coverImage.medium || anime.coverImage.large || DEFAULT_PLACEHOLDER_IMAGE; // Use medium or large for small display

  const cardLabel = `${title}. 放送時間: ${airingTime}. 詳細を見る`;

  return (
    <article // Using article for better semantics as a self-contained piece of content
      className={`flex items-center space-x-2 sm:space-x-3 p-2 group hover:bg-[#2a353f] transition-colors duration-150 cursor-pointer focus-within:ring-1 focus-within:ring-[#00d4ff] focus-within:ring-offset-1 focus-within:ring-offset-[#0f171e] rounded-sm ${!isLastItem ? 'border-b border-gray-700' : ''}`}
      onClick={() => onCardClick(anime)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(anime); }}}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
    >
      <img
        src={coverImage}
        alt="" // Decorative, as the title provides context
        className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0" // Reduced image size
        onError={(e) => (e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE)}
        loading="lazy"
        aria-hidden="true"
      />
      <div className="flex-grow min-w-0"> {/* min-w-0 allows truncation to work properly in flex children */}
        <h4
          className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-[#00d4ff]"
          title={title}
        >
          {title}
        </h4>
      </div>
      <div className="flex-shrink-0 ml-auto pl-2"> {/* ml-auto pushes time to the right, pl-2 for spacing */}
        <p className="text-sm sm:text-base font-semibold text-[#00d4ff] whitespace-nowrap">{airingTime}</p> {/* Emphasized airing time */}
      </div>
    </article>
  );
};

export default CalendarAnimeCard;