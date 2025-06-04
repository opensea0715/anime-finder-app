
import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'animekun_favorites';

export const useFavorites = (): [number[], (id: number) => void, (id: number) => boolean] => {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
      console.error("Error reading favorites from localStorage", error);
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

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prevFavorites =>
      prevFavorites.includes(id)
        ? prevFavorites.filter(favId => favId !== id)
        : [...prevFavorites, id]
    );
  }, []);

  const isFavorite = useCallback((id: number): boolean => {
    return favorites.includes(id);
  }, [favorites]);

  return [favorites, toggleFavorite, isFavorite];
};
    