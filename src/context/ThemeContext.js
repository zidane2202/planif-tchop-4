// context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Appearance } from 'react-native'; // Pour détecter le thème du système
import AsyncStorage from '@react-native-async-storage/async-storage'; // Pour sauvegarder le choix de l'utilisateur

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Charger le thème depuis AsyncStorage au démarrage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('userTheme');
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
        } else {
          // Si aucun thème n'est sauvegardé, utiliser le thème du système
          setIsDarkMode(Appearance.getColorScheme() === 'dark');
        }
      } catch (e) {
        console.error("Failed to load theme from storage", e);
        // Fallback au thème du système si échec du stockage
        setIsDarkMode(Appearance.getColorScheme() === 'dark');
      }
    };
    loadTheme();
  }, []);

  // Écouter les changements de thème du système (si l'utilisateur n'a pas choisi de préférence)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const loadStoredTheme = async () => {
        const storedTheme = await AsyncStorage.getItem('userTheme');
        // Seulement changer si l'utilisateur n'a pas défini de préférence explicite
        if (storedTheme === null) {
          setIsDarkMode(colorScheme === 'dark');
        }
      };
      loadStoredTheme();
    });
    return () => subscription.remove();
  }, []);

  // Fonction pour basculer le thème et le sauvegarder
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error("Failed to save theme to storage", e);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 