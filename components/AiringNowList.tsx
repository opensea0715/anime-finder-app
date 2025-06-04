import React, { useState } from 'react';
import { AniListMedia, MediaFormat, MediaStatus } from '../types';
import { GENRE_MAP, DEFAULT_PLACEHOLDER_IMAGE, STATUS_MAP } from '../constants'; // Added STATUS_MAP
import LoadingSpinner from './LoadingSpinner';
import ChevronDownIcon from './icons/ChevronDownIcon'; // Import ChevronDownIcon

interface AiringNowListProps {
  title: string;
  animeItems: AniListMedia[];
  isLoading: boolean;
  error: string | null;
  onAnimeClick: (anime: AniListMedia) => void;
}

const getDayOfWeekText = (anime: AniListMedia): string => {
  const { year, month, day } = anime.startDate || {};
  if (year && month && day) {
    const date = new Date(year, month - 1, day); // Month is 0-indexed
    if (!isNaN(date.getTime())) {
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return `${days[date.getDay()]}曜`;
    }
  }
  return "未定";
};

const getEpisodeProgressText = (anime: AniListMedia): string => {
  if (anime.format === MediaFormat.MOVIE) return "劇場版";
  if (anime.format === MediaFormat.SPECIAL) return "スペシャル";
  if (anime.format === MediaFormat.MUSIC) return "ミュージックビデオ";
   if (anime.format === MediaFormat.OVA || anime.format === MediaFormat.ONA) {
    if(anime.episodes === 1) return "単発作品";
    let statusText = anime.status === MediaStatus.RELEASING ? "配信中" : "";
    if(anime.episodes) statusText += ` / 全${anime.episodes}話`;
    return statusText || "配信作品";
  }

  let progressText = "";
  if (anime.status === MediaStatus.RELEASING) {
    if (anime.nextAiringEpisode) {
      // If nextAiringEpisode.episode is 1, it means the first episode is about to air.
      // If it's 2, it means episode 1 has aired and episode 2 is next.
      if (anime.nextAiringEpisode.episode > 1) {
        progressText = `第${anime.nextAiringEpisode.episode - 1}話放送`;
      } else {
        // This implies it's the very first episode or data is slightly ahead.
        // It could also mean it's between episode 0 (not yet aired) and episode 1.
        // For simplicity, if episode is 1, we'll assume it's just started.
        progressText = `放送開始`;
      }
    } else {
      progressText = "放送中"; // Fallback if nextAiringEpisode is not available but status is RELEASING
    }
  } else {
    progressText = anime.status ? STATUS_MAP[anime.status] || anime.status.toString() : "ステータス不明";
  }

  if (anime.episodes) {
    progressText += ` / 全${anime.episodes}話`;
  } else if (anime.format === MediaFormat.TV_SHORT) {
     progressText += " (ショート)"
  }
  return progressText;
};

const getGenreListText = (anime: AniListMedia): string => {
  if (!anime.genres || anime.genres.length === 0) return "ジャンルなし";
  return anime.genres.slice(0, 3).map(g => GENRE_MAP[g] || g).join(', ') + (anime.genres.length > 3 ? '...' : '');
};


const AiringNowList: React.FC<AiringNowListProps> = ({
  title,
  animeItems,
  isLoading,
  error,
  onAnimeClick,
}) => {
  const [isOpen, setIsOpen] = useState(true); // Section is open by default

  if (isLoading && animeItems.length === 0) { // Show loader only if no items are present yet
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
  
  // Do not render the section if it's not loading, no error, but no items.
  // This prevents showing an empty "Airing Now" list if API returns nothing for the current season.
  if (!isLoading && !error && (!animeItems || animeItems.length === 0)) {
    return null;
  }


  const sectionId = `section-airing-now-list`;
  const labelledBy = `section-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <section className="py-4 md:py-6" aria-labelledby={labelledBy}>
      <button
        id={labelledBy}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 px-1 py-2 rounded-md hover:bg-[#1a252f] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff] transition-colors"
        aria-expanded={isOpen}
        aria-controls={sectionId}
      >
        <span>{title}</span>
        <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      <div
        id={sectionId}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'}`} // Increased max-h for many items
        aria-hidden={!isOpen}
      >
        {isLoading && animeItems.length > 0 && <LoadingSpinner />} 
        {/* Desktop Table View */}
        <div className="hidden md:block bg-[#141a21] rounded-lg shadow-lg overflow-hidden">
          <table className="w-full min-w-full divide-y divide-gray-700">
            <thead className="bg-[#1a252f]">
              <tr>
                <th scope="col" className="pl-3 pr-1 py-3 text-left text-xs font-medium text-[#00d4ff] uppercase tracking-wider w-16">画像</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#00d4ff] uppercase tracking-wider">タイトル</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#00d4ff] uppercase tracking-wider whitespace-nowrap">放送曜日</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#00d4ff] uppercase tracking-wider">話数</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#00d4ff] uppercase tracking-wider">ジャンル</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {animeItems.map(anime => (
                <tr 
                  key={anime.id} 
                  onClick={() => onAnimeClick(anime)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnimeClick(anime); }}}
                  className="hover:bg-[#1a252f] transition-colors duration-150 cursor-pointer group focus-within:bg-[#2a353f] focus-within:outline-none focus-within:ring-1 focus-within:ring-[#00d4ff] focus-within:ring-inset"
                  tabIndex={0}
                  aria-label={`${anime.title.native || anime.title.romaji}, 詳細を見る`}
                >
                  <td className="pl-3 pr-1 py-2 whitespace-nowrap">
                    <img 
                      src={anime.coverImage?.medium || anime.coverImage?.large || DEFAULT_PLACEHOLDER_IMAGE} 
                      alt="" // Decorative as title is adjacent
                      aria-hidden="true"
                      className="w-12 h-[72px] object-cover rounded"
                      onError={(e) => (e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE)}
                      loading="lazy"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm font-semibold text-white group-hover:text-[#00d4ff] truncate max-w-xs" title={anime.title.native || anime.title.romaji || anime.title.english}>
                      {anime.title.native || anime.title.romaji || anime.title.english || 'タイトル不明'}
                    </p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 align-top">{getDayOfWeekText(anime)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300 align-top">{getEpisodeProgressText(anime)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-xs align-top" title={anime.genres.map(g => GENRE_MAP[g] || g).join(', ')}>
                    {getGenreListText(anime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-3">
          {animeItems.map(anime => (
            <div
              key={`mobile-${anime.id}`}
              onClick={() => onAnimeClick(anime)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnimeClick(anime); }}}
              className="bg-[#141a21] p-3 rounded-lg shadow-md hover:bg-[#1a252f] transition-colors duration-150 cursor-pointer group focus-within:ring-2 focus-within:ring-[#00d4ff] focus-within:ring-offset-2 focus-within:ring-offset-[#0f171e] flex items-start space-x-3"
              tabIndex={0}
              role="button"
              aria-label={`${anime.title.native || anime.title.romaji}, 詳細を見る`}
            >
              <img
                src={anime.coverImage?.medium || anime.coverImage?.large || DEFAULT_PLACEHOLDER_IMAGE}
                alt="" // Decorative
                aria-hidden="true"
                className="w-12 h-[72px] object-cover rounded flex-shrink-0" // Slightly taller for mobile
                onError={(e) => (e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE)}
                loading="lazy"
              />
              <div className="flex-grow min-w-0"> {/* min-w-0 for proper truncation */}
                <h3 className="text-base font-semibold text-white group-hover:text-[#00d4ff] mb-1 truncate" title={anime.title.native || anime.title.romaji || anime.title.english}>
                  {anime.title.native || anime.title.romaji || anime.title.english || 'タイトル不明'}
                </h3>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p><span className="font-medium text-gray-300">放送曜日:</span> {getDayOfWeekText(anime)}</p>
                  <p><span className="font-medium text-gray-300">進捗:</span> {getEpisodeProgressText(anime)}</p>
                  <p className="truncate" title={anime.genres.map(g => GENRE_MAP[g] || g).join(', ')}>
                    <span className="font-medium text-gray-300">ジャンル:</span> {getGenreListText(anime)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AiringNowList;
