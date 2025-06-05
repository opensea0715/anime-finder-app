
import React from 'react';
import { AniListMedia } from '../types';
import AnimeCard from './AnimeCard';
import LoadingSpinner from './LoadingSpinner';

interface AnimeSectionProps {
  title: string;
  animeItems: AniListMedia[];
  isLoading: boolean;
  error: string | null;
  onToggleFavorite: (anime: AniListMedia) => void; 
  isFavorite: (id: number) => boolean; 
  onCardClick: (anime: AniListMedia) => void;
}

const AnimeSection: React.FC<AnimeSectionProps> = ({
  title,
  animeItems,
  isLoading,
  error,
  onToggleFavorite, 
  isFavorite, 
  onCardClick,
}) => {
  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 px-1">{title}</h2>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 px-1">{title}</h2>
        <p className="text-red-400 text-center">エラー: {error}</p>
      </div>
    );
  }

  if (!animeItems || animeItems.length === 0) {
    // For "My List", a specific message will be handled in App.tsx if favoriteAnimes is empty.
    // For other sections, this message is appropriate.
    if (title === "マイリスト") { // This check might be redundant if App.tsx handles empty My List.
        return null; // App.tsx will show the "マイリストにはまだ何も登録されていません。" message.
    }
    return (
        <div className="py-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 px-1">{title}</h2>
            <p className="text-gray-400 text-sm ml-1">このセクションには現在表示できるアニメがありません。</p>
        </div>
    );
  }

  return (
    <section className="py-4 md:py-6" aria-labelledby={`section-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h2 id={`section-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 px-1">{title}</h2>
      <div className="flex overflow-x-auto space-x-4 pb-4 scroll-snap-type-x-mandatory scrollbar-hide">
        {animeItems.map(anime => (
          <AnimeCard
            key={`${title}-${anime.id}`} // Ensure unique keys if anime appears in multiple sections
            anime={anime}
            onToggleFavorite={onToggleFavorite} 
            isFavorite={isFavorite(anime.id)} 
            onCardClick={onCardClick}
          />
        ))}
        {/* Add a spacer at the end for better scroll feel if needed */}
        <div className="flex-shrink-0 w-1px"></div>
      </div>
    </section>
  );
};

export default AnimeSection;
