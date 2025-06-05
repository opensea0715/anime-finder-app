
import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'favoriteAnimeIds'; // Updated key name as per user request

export const useFavorites = (): [string[], (id: number) => void, (id: number) => boolean] => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        // Ensure all items are strings for consistency, handling potential legacy numeric data
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      }
      return [];
    } catch (error) {
      console.error("Error reading or parsing favorites from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to localStorage", error);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: number) => { // Accepts number from components
    const stringId = String(id); // Convert to string for internal storage and comparison
    setFavorites(prevFavorites =>
      prevFavorites.includes(stringId)
        ? prevFavorites.filter(favId => favId !== stringId)
        : [...prevFavorites, stringId]
    );
  }, []);

  const isFavorite = useCallback((id: number): boolean => { // Accepts number from components
    return favorites.includes(String(id)); // Convert to string for comparison
  }, [favorites]);

  return [favorites, toggleFavorite, isFavorite];
};