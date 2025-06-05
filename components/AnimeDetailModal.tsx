
import React, { useEffect, useCallback, useRef } from 'react';
import { AniListMedia, MediaStatus } from '../types';
import { GENRE_MAP, STATUS_MAP, DEFAULT_PLACEHOLDER_IMAGE, SEASONS } from '../constants';
import XMarkIcon from './icons/XMarkIcon';
import HeartIcon from './icons/HeartIcon'; // HeartIcon is now used

interface AnimeDetailModalProps {
  anime: AniListMedia | null;
  onClose: () => void;
  onToggleFavorite: (anime: AniListMedia) => void; 
  isFavorite: (id: number) => boolean; 
  initialFocusRef?: HTMLElement | null; 
}

const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({ anime, onClose, onToggleFavorite, isFavorite, initialFocusRef }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
    if (event.key === 'Tab' && modalRef.current && anime) {
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null); 

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) { 
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else { 
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    }
  }, [onClose, anime]);

  useEffect(() => {
    if (anime) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      closeButtonRef.current?.focus(); 
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleKeyDown);
      if (!anime) initialFocusRef?.focus(); 
    };
  }, [anime, handleKeyDown, initialFocusRef]);

  if (!anime) return null;

  const title = anime.title.native || anime.title.romaji || anime.title.english || 'タイトル不明';
  const coverImage = anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium || DEFAULT_PLACEHOLDER_IMAGE;
  
  const descriptionHtml = anime.description ? anime.description.replace(/<br\s*\/?>/gi, '\n') : 'あらすじ情報を準備中です。';
  
  const score = anime.averageScore ? `${anime.averageScore} / 100` : '評価なし';
  const statusText = anime.status ? STATUS_MAP[anime.status] || anime.status : 'ステータス不明';
  const mainStudio = anime.studios?.edges?.find(edge => edge.isMain)?.node?.name || 
                     (anime.studios?.edges?.length > 0 ? anime.studios.edges[0].node.name : '不明');

  const airingDate = anime.startDate?.year
    ? `${anime.startDate.year}年${anime.startDate.month ? `${anime.startDate.month}月` : ''}${anime.startDate.day ? `${anime.startDate.day}日` : ''}`
    : '放送日未定';
  
  const seasonLabel = anime.season ? SEASONS.find(s => s.value === anime.season)?.label : '';
  const currentIsFavorite = isFavorite(anime.id); 

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-detail-title"
      aria-describedby="anime-detail-description"
    >
      <div 
        ref={modalRef}
        className="bg-[#141a21] text-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()} 
        tabIndex={-1} 
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 text-gray-400 hover:text-white z-20 bg-[#0f171e] rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f171e] focus-visible:ring-[#00d4ff]"
          aria-label="モーダルを閉じる"
        >
          <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="w-full md:w-1/3 flex-shrink-0 relative bg-[#0f171e] p-3 md:p-4">
          <img 
            src={coverImage} 
            alt={`「${title}」のカバー画像`}
            className="object-contain w-full h-auto max-w-md mx-auto rounded-lg max-h-[60vh]"
            onError={(e) => (e.currentTarget.src = DEFAULT_PLACEHOLDER_IMAGE)}
            loading="lazy"
          />
          
           <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(anime);
              }}
              className="absolute top-2 left-2 p-2 bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-opacity z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus-visible:ring-[#00d4ff]"
              aria-label={currentIsFavorite ? `${title}をお気に入りから削除` : `${title}をお気に入りに追加`}
              aria-pressed={currentIsFavorite}
            >
              <HeartIcon isFilled={currentIsFavorite} className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
        </div>

        <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-[#00d4ff] scrollbar-track-[#1a252f]">
          <h2 id="anime-detail-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-[#00d4ff] mb-2 sm:mb-3">{title}</h2>
          
          {anime.title.romaji && anime.title.romaji !== title && <p className="text-xs sm:text-sm text-gray-400 mb-0.5">ローマ字: {anime.title.romaji}</p>}
          {anime.title.english && anime.title.english !== title && <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">英語: {anime.title.english}</p>}
          
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-1">あらすじ</h3>
            <p id="anime-detail-description" className="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed max-h-32 sm:max-h-40 md:max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#00d4ff] scrollbar-track-[#2a353f]">
              {descriptionHtml}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2 sm:gap-y-3 text-xs sm:text-sm mb-3 sm:mb-4">
            <div><strong className="text-gray-400">評価:</strong> <span className="text-[#00d4ff]">{score}</span></div>
            <div><strong className="text-gray-400">ステータス:</strong> <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
              anime.status === MediaStatus.RELEASING ? 'bg-green-600 text-white' : 
              anime.status === MediaStatus.FINISHED ? 'bg-blue-600 text-white' : 
              anime.status === MediaStatus.NOT_YET_RELEASED ? 'bg-yellow-600 text-black' :
              'bg-gray-600 text-white'
            }`}>{statusText}</span></div>
            <div><strong className="text-gray-400">エピソード数:</strong> {anime.episodes || '未定'}</div>
            <div><strong className="text-gray-400">放送開始日:</strong> {airingDate}</div>
            {anime.season && anime.seasonYear && (
              <div><strong className="text-gray-400">シーズン:</strong> {anime.seasonYear}年 {seasonLabel || anime.season}</div>
            )}
            <div><strong className="text-gray-400">制作会社:</strong> {mainStudio}</div>
          </div>

          {anime.genres && anime.genres.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-1">ジャンル</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {anime.genres.map(genre => (
                  <span key={genre} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#1a252f] text-[10px] sm:text-xs text-[#00d4ff] rounded">
                    {GENRE_MAP[genre] || genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {anime.nextAiringEpisode && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-[#1a252f] rounded">
              <h3 className="text-sm sm:text-md font-semibold text-gray-200">次のエピソード</h3>
              <p className="text-xs sm:text-sm text-gray-300">
                第 {anime.nextAiringEpisode.episode} 話: 
                約 {Math.floor(anime.nextAiringEpisode.timeUntilAiring / 3600)} 時間 
                {Math.floor((anime.nextAiringEpisode.timeUntilAiring % 3600) / 60)} 分 後に放送予定
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">
                (放送日時: {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleString('ja-JP')})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailModal;
