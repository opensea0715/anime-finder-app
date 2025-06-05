
import { useState, useEffect, useCallback } from 'react';
import { AniListMedia } from '../types';

const LOCAL_STORAGE_KEY = 'favoriteAnimes';

export const useFavorites = (): [
  AniListMedia[],
  (anime: AniListMedia) => void,
  (animeId: number) => boolean
] => {
  const [favoriteAnimes, setFavoriteAnimes] = useState<AniListMedia[]>(() => {
    try {
      const storedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedItems) {
        const parsedItems = JSON.parse(storedItems);
        // Basic validation: check if it's an array
        if (Array.isArray(parsedItems)) {
          // Further validation: check if items have an 'id' (basic check for AniListMedia structure)
          return parsedItems.filter(item => typeof item === 'object' && item !== null && 'id' in item);
        }
      }
      return [];
    } catch (error) {
      console.error('Error reading favorites from localStorage:', error);
      // Attempt to clear corrupted data
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (removeError) {
        console.error('Error removing corrupted favorites from localStorage:', removeError);
      }
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favoriteAnimes));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
      // Potentially handle QuotaExceededError here if necessary
    }
  }, [favoriteAnimes]);

  const toggleFavorite = useCallback((anime: AniListMedia) => {
    if (!anime || typeof anime.id === 'undefined') {
      console.error('toggleFavorite called with invalid anime object:', anime);
      return;
    }
    setFavoriteAnimes(prevFavorites => {
      const isCurrentlyFavorite = prevFavorites.some(favAnime => favAnime.id === anime.id);
      if (isCurrentlyFavorite) {
        return prevFavorites.filter(favAnime => favAnime.id !== anime.id);
      } else {
        // Ensure no duplicates if somehow called multiple times quickly (though `some` check should prevent)
        if (prevFavorites.find(fav => fav.id === anime.id)) return prevFavorites;
        return [...prevFavorites, anime];
      }
    });
  }, []);

  const isFavorite = useCallback((animeId: number): boolean => {
    return favoriteAnimes.some(favAnime => favAnime.id === animeId);
  }, [favoriteAnimes]);

  return [favoriteAnimes, toggleFavorite, isFavorite];
};
