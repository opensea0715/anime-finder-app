
import React from 'react';
import { AniListMedia, MediaStatus } from '../types';
import { GENRE_MAP, STATUS_MAP, DEFAULT_PLACEHOLDER_IMAGE } from '../constants';
import HeartIcon from './icons/HeartIcon'; // HeartIcon is now used

interface AnimeCardProps {
  anime: AniListMedia;
  onToggleFavorite: (anime: AniListMedia) => void; 
  isFavorite: boolean; 
  onCardClick: (anime: AniListMedia) => void;
}

const getJapaneseDescription = (description?: string): string => {
  if (!description) return 'あらすじ情報がありません。';
  
  const cleanText = description.replace(/<[^>]*>/g, ''); // Strip HTML tags
  if (!cleanText.trim()) return 'あらすじ情報がありません。';

  const sampleText = cleanText.substring(0, 50);
  let asciiChars = 0;
  for (let i = 0; i < sampleText.length; i++) {
    const charCode = sampleText.charCodeAt(i);
    if ((charCode >= 65 && charCode <= 90) || 
        (charCode >= 97 && charCode <= 122) || 
        (charCode >= 48 && charCode <= 57)) {  
      asciiChars++;
    }
  }
  
  const isEnglishLikely = sampleText.length > 0 && (asciiChars / sampleText.length > 0.7);
  
  if (isEnglishLikely) {
    const japaneseCharsPattern = /[ぁ-んァ-ン一-龯]/;
    if (!japaneseCharsPattern.test(sampleText)) {
      return 'あらすじ情報を準備中です。詳細は作品詳細をご確認ください。';
    }
  }
  
  return cleanText.length > 60 ? cleanText.substring(0, 60) + '...' : cleanText; // Shortened for carousel
};


const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onToggleFavorite, isFavorite, onCardClick }) => {
  const title = anime.title.native || anime.title.romaji || anime.title.english || 'タイトル不明';
  const coverImage = anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium || DEFAULT_PLACEHOLDER_IMAGE;
  
  const descriptionText = getJapaneseDescription(anime.description);

  const episodeCountText = anime.episodes ? `${anime.episodes}話` : (anime.format === 'MOVIE' ? '劇場版' : '話数未定');
  const statusText = anime.status ? STATUS_MAP[anime.status] || anime.status : 'ステータス不明';
  
  const isNewEpisode = anime.status === MediaStatus.RELEASING || 
                      (anime.nextAiringEpisode && anime.nextAiringEpisode.timeUntilAiring > 0);

  const cardLabel = `${title}. ${statusText}. ${episodeCountText}. ジャンル: ${anime.genres.slice(0, 2).map(g => GENRE_MAP[g] || g).join(', ')}. 詳細を見る`;

  return (
    <div 
      className="bg-[#1a252f] rounded-lg overflow-hidden shadow-lg hover:bg-[#2a353f] transition-all duration-300 ease-in-out flex flex-col cursor-pointer group focus-within:ring-2 focus-within:ring-[#00d4ff] focus-within:ring-offset-2 focus-within:ring-offset-[#0f171e] w-48 sm:w-56 flex-shrink-0 scroll-snap-align-start" // Fixed width and snap align
      onClick={() => onCardClick(anime)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(anime); }}}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
    >
      <div className="relative">
        <img 
          src={coverImage} 
          alt={`「${title}」のカバー画像`}
          className="w-full h-64 sm:h-72 object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out" // Adjusted height
          onError={(e) => (e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE)}
          loading="lazy"
        />
        {isNewEpisode && anime.format !== 'MOVIE' && (
          <span className="absolute top-2 left-2 bg-[#00d4ff] text-[#0f171e] text-xs font-bold px-2 py-1 rounded shadow-md pointer-events-none">
            新着
          </span>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation(); 
            e.preventDefault(); 
            onToggleFavorite(anime);
          }}
          className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-opacity opacity-75 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus-visible:ring-[#00d4ff]"
          aria-label={isFavorite ? `${title}をお気に入りから削除` : `${title}をお気に入りに追加`}
          aria-pressed={isFavorite}
        >
          <HeartIcon isFilled={isFavorite} className="w-5 h-5" />
        </button>
        
      </div>
      <div className="p-3 flex flex-col flex-grow"> {/* Slightly reduced padding */}
        <h3 className="text-md font-semibold text-white mb-1 truncate group-hover:text-[#00d4ff] transition-colors duration-200" title={title}>{title}</h3>
        <p className="text-xs text-gray-400 mb-1 group-hover:text-gray-300 transition-colors duration-200">
          {anime.genres.slice(0, 2).map(g => GENRE_MAP[g] || g).join(' / ')} {/* Show fewer genres */}
          {anime.genres.length > 2 ? '...' : ''}
        </p>
        <p className="text-xs text-gray-300 mb-2 text-ellipsis overflow-hidden h-[3em] leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}> {/* Reduced lines for description */}
          {descriptionText}
        </p>
        <div className="mt-auto pt-1.5 border-t border-gray-700"> {/* Reduced padding top */}
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>{episodeCountText}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ // Smaller status badge
              anime.status === MediaStatus.RELEASING ? 'bg-green-500 text-white' : 
              anime.status === MediaStatus.FINISHED ? 'bg-blue-500 text-white' : 
              anime.status === MediaStatus.NOT_YET_RELEASED ? 'bg-yellow-500 text-black' : 'bg-gray-500 text-white'
            }`}>
              {statusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;
