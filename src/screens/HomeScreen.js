import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, Button } from 'react-native'; // Import Button
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

function HomeScreen() {
  const navigation = useNavigation(); // Get navigation object

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.mainTitle}>Planif'Tchop</Text>
        <Text style={styles.slogan}>Votre cuisine, à la Camerounaise !</Text>

        <View style={styles.separator} /> {/* Petite ligne décorative */}

        <Text style={styles.description}>
          Organisez facilement vos repas, gérez vos plats, vos ingrédients,
          et planifiez les menus pour toute la famille.
        </Text>

        {/* Ajouter le bouton de navigation vers la liste de courses */}
        <View style={styles.buttonContainer}>
          <Button
            title="🛒 Voir ma Liste de Courses"
            onPress={() => navigation.navigate('Courses')} // Navigate to the 'Courses' tab
            color={styles.CAM_GREEN} // Use a theme color
          />
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerTextPrimary}>Saveurs & Partage</Text>
          <Text style={styles.footerTextSeparator}>•</Text>
          <Text style={styles.footerTextSecondary}>Famille & Tradition</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Couleurs du drapeau Camerounais
  CAM_GREEN: '#007A5E', // Vert foncé
  CAM_RED: '#CE1126',   // Rouge vif
  CAM_YELLOW: '#FCD116', // Jaune vif

  // Couleurs neutres ou d'accent pour la lisibilité
  DARK_GRAY: '#343a40',
  MEDIUM_GRAY: '#6c757d',
  LIGHT_BACKGROUND: '#EEF7F4', // Un vert très clair pour le fond, ou blanc cassé

  safeArea: {
    flex: 1,
    backgroundColor: '#EEF7F4', // Fond principal doux (vert très clair)
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EEF7F4', // Fond du conteneur (vert très clair)
  },
  mainTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#CE1126', // Rouge vif pour le titre principal
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-condensed',
  },
  slogan: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#007A5E', // Vert foncé pour le slogan
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
  },
  separator: {
    width: '60%',
    height: 3,
    backgroundColor: '#FCD116', // Jaune vif pour la ligne décorative
    borderRadius: 5,
    marginBottom: 30,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    color: '#343a40', // Gris foncé pour le texte descriptif
    lineHeight: 26,
    marginBottom: 30, // Réduire un peu l'espace pour le bouton
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Regular' : 'sans-serif-light',
  },
  buttonContainer: {
    width: '80%', // Largeur du bouton
    marginBottom: 40, // Espace avant le footer
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  footerTextPrimary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CE1126', // Rouge vif
    marginHorizontal: 5,
  },
  footerTextSeparator: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FCD116', // Jaune vif pour le séparateur
    marginHorizontal: 5,
  },
  footerTextSecondary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007A5E', // Vert foncé
    marginHorizontal: 5,
  },
});

export default HomeScreen;
