import React, { useMemo } from 'react';
import { AiringScheduleEntry, DaySchedule, AniListMedia } from '../types';
import LoadingSpinner from './LoadingSpinner';
import CalendarAnimeCard from './CalendarAnimeCard';

interface BroadcastCalendarProps {
  schedule: AiringScheduleEntry[];
  isLoading: boolean;
  error: string | null;
  onCardClick: (anime: AniListMedia) => void;
  // Favorite props are passed down for modal, but not used directly in CalendarAnimeCard
  onToggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

const getWeekDays = (currentDate: Date): DaySchedule[] => {
  const days: DaySchedule[] = [];
  const currentDayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
  
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  const shortDayNames = ["日", "月", "火", "水", "木", "金", "土"];


  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push({
      date: day,
      // Use short names for header, full names for mobile section headers
      dayName: `${shortDayNames[day.getDay()]} (${(day.getMonth() + 1)}/${day.getDate()})`, 
      formattedDate: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      anime: [],
    });
  }
  return days;
};

const BroadcastCalendar: React.FC<BroadcastCalendarProps> = ({
  schedule,
  isLoading,
  error,
  onCardClick,
}) => {
  const today = useMemo(() => new Date(), []); // Memoize to prevent re-calculating 'today' on every render

  const daysWithAnime = useMemo(() => {
    const weekDays = getWeekDays(today);
    
    schedule.forEach(entry => {
      const airingDate = new Date(entry.airingAt * 1000);
      const airingDateString = `${airingDate.getFullYear()}-${String(airingDate.getMonth() + 1).padStart(2, '0')}-${String(airingDate.getDate()).padStart(2, '0')}`;
      
      const targetDay = weekDays.find(d => d.formattedDate === airingDateString);
      if (targetDay) {
        targetDay.anime.push(entry);
      }
    });

    // Sort anime within each day by airing time
    weekDays.forEach(day => {
      day.anime.sort((a, b) => a.airingAt - b.airingAt);
    });

    return weekDays;
  }, [schedule, today]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <p className="text-center text-red-400 py-10">カレンダーデータの読み込みに失敗しました: {error}</p>;
  }

  if (!schedule || schedule.length === 0) {
    return <p className="text-center text-gray-400 py-10">今週放送予定のアニメはありません。</p>;
  }
  
  const getAiringTime = (airingAt: number): string => {
    const date = new Date(airingAt * 1000);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="py-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center">今週の放送カレンダー</h2> {/* Title changed back */}
      
      {/* Desktop: Grid View */}
      <div className="hidden md:grid md:grid-cols-7 gap-1 bg-[#141a21] p-1 rounded-lg">
        {daysWithAnime.map((day) => (
          <div key={day.formattedDate} className="bg-[#0f171e] rounded flex flex-col min-h-[200px]">
            <h3 className="text-sm font-semibold text-[#00d4ff] p-2 border-b border-gray-700 text-center sticky top-0 bg-[#0f171e] z-10">
              {day.dayName}
            </h3>
            <div className="p-1.5 space-y-0 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"> {/* Adjusted padding and space */}
              {day.anime.length > 0 ? (
                day.anime.map((entry, index) => ( // Added index
                  <CalendarAnimeCard
                    key={`${entry.id}-${entry.media.id}`}
                    anime={entry.media}
                    onCardClick={onCardClick}
                    airingTime={getAiringTime(entry.airingAt)}
                    isLastItem={index === day.anime.length - 1} // Pass isLastItem
                  />
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center pt-4">放送なし</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Vertical List View */}
      <div className="md:hidden space-y-4">
        {daysWithAnime.map((day) => (
          <section key={`mobile-${day.formattedDate}`} className="bg-[#141a21] p-3 rounded-lg">
            <h3 className="text-lg font-semibold text-[#00d4ff] mb-3">
              {day.dayName.replace(/\((.*)\)/, (match, p1) => `(${p1})`)}
            </h3>
            {day.anime.length > 0 ? (
              <div className="space-y-0"> {/* Changed from grid to simple div with no y-spacing (handled by card border) */}
                {day.anime.map((entry, index) => ( // Added index
                  <CalendarAnimeCard
                    key={`mobile-${entry.id}-${entry.media.id}`}
                    anime={entry.media}
                    onCardClick={onCardClick}
                    airingTime={getAiringTime(entry.airingAt)}
                    isLastItem={index === day.anime.length - 1} // Pass isLastItem
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">この日の放送予定はありません。</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default BroadcastCalendar;