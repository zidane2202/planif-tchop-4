// constants/Colors.js

export const lightColors = {
  // Couleurs de la palette Camerounaise (Mode Clair)
  ACCENT_GREEN: '#007A5E',       // Vert foncé, vif
  ACCENT_RED: '#CE1126',         // Rouge vif
  ACCENT_RED_LIGHT: '#F8D7DA',   // Fond très clair pour le bouton supprimer
  ACCENT_RED_DARK: '#721c24',    // Texte/icône pour le bouton supprimer
  ACCENT_YELLOW: '#FCD116',      // Jaune vif

  BACKGROUND_PRIMARY: '#FFFFFF',    // Blanc pur pour les éléments principaux (cartes, champs de texte)
  BACKGROUND_SECONDARY: '#F8F8F8', // Gris très très clair, presque blanc (pour le fond général des écrans)
  BACKGROUND_TERTIARY: '#EFEFEF',   // Gris très clair pour les sections ou cartes secondaires

  BORDER_LIGHT: '#E0E0E0',        // Gris très clair pour les bordures légères
  BORDER_MEDIUM: '#C0C0C0',       // Gris clair pour les bordures moyennes

  TEXT_PRIMARY: '#333333',         // Gris très foncé pour le texte principal
  TEXT_SECONDARY: '#666666',      // Gris moyen pour le texte secondaire (placeholders, descriptions)
  TEXT_LIGHT: '#999999',           // Gris clair pour les textes très secondaires ou désactivés

  BUTTON_PRIMARY_BG: '#007A5E',    // Bouton principal (vert)
  BUTTON_PRIMARY_TEXT: '#FFFFFF',  // Texte bouton principal (blanc)
  BUTTON_SECONDARY_BG: '#FCD116',  // Bouton secondaire (jaune)
  BUTTON_SECONDARY_TEXT: '#333333',// Texte bouton secondaire (noir)
  BUTTON_DANGER_BG: '#CE1126',     // Bouton danger (rouge)
  BUTTON_DANGER_TEXT: '#FFFFFF',   // Texte bouton danger (blanc)

  TAB_ACTIVE_TINT: '#007A5E',      // Couleur icône/texte onglet actif
  TAB_INACTIVE_TINT: '#666666',    // Couleur icône/texte onglet inactif
  TAB_BAR_BACKGROUND: '#FFFFFF',   // Fond de la barre d'onglets
};

export const darkColors = {
  // Couleurs (Mode Sombre) - Inversées ou adaptées pour la lisibilité
  ACCENT_GREEN: '#36AB90',       // Vert légèrement plus clair pour le mode sombre
  ACCENT_RED: '#FF4D6A',         // Rouge légèrement plus clair
  ACCENT_RED_LIGHT: '#4A2A2E',   // Fond très sombre pour le bouton supprimer
  ACCENT_RED_DARK: '#FF94A5',    // Texte pour le bouton supprimer

  BACKGROUND_PRIMARY: '#121212',    // Fond principal très sombre
  BACKGROUND_SECONDARY: '#1E1E1E', // Fond secondaire (cartes, éléments)
  BACKGROUND_TERTIARY: '#2C2C2C',   // Fond tertiaire (sections plus claires dans le sombre)

  BORDER_LIGHT: '#3A3A3A',        // Bordure claire dans le sombre
  BORDER_MEDIUM: '#606060',       // Bordure moyenne dans le sombre

  TEXT_PRIMARY: '#E0E0E0',         // Texte principal clair
  TEXT_SECONDARY: '#B0B0B0',      // Texte secondaire (placeholders, descriptions)
  TEXT_LIGHT: '#707070',           // Texte très secondaire ou désactivé

  BUTTON_PRIMARY_BG: '#36AB90',    // Bouton principal (vert)
  BUTTON_PRIMARY_TEXT: '#121212',  // Texte bouton principal (sombre)
  BUTTON_SECONDARY_BG: '#FFD75E',  // Bouton secondaire (jaune)
  BUTTON_SECONDARY_TEXT: '#121212',// Texte bouton secondaire (sombre)
  BUTTON_DANGER_BG: '#FF4D6A',     // Bouton danger (rouge)
  BUTTON_DANGER_TEXT: '#121212',   // Texte bouton danger (sombre)

  TAB_ACTIVE_TINT: '#36AB90',      // Couleur icône/texte onglet actif
  TAB_INACTIVE_TINT: '#B0B0B0',    // Couleur icône/texte onglet inactif
  TAB_BAR_BACKGROUND: '#1C1C1C',   // Fond de la barre d'onglets sombre
};

// Exportez un objet qui vous permettra d'accéder aux couleurs dynamiquement
export const getColors = (isDarkMode) => (isDarkMode ? darkColors : lightColors);