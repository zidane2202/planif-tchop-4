import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../config/firebaseConfig'; // adapte le chemin si besoin
import { collection, onSnapshot } from 'firebase/firestore';

// Importer les composants
import FamilyForm from '../components/family/FamilyForm';
import FamilyList from '../components/family/FamilyList';

function FamilyScreen() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  useEffect(() => {
    const familyCollectionRef = collection(db, 'familyMembers');
    const unsubscribe = onSnapshot(familyCollectionRef, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFamilyMembers(membersData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <FontAwesome name="users" size={32} color={styles.ACCENT_RED} />
          <Text style={styles.title}>Gestion de la Famille</Text>
        </View>

        <View style={styles.buttonGroupContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              showAddForm ? styles.activeButton : styles.secondaryButton,
            ]}
            onPress={() => setShowAddForm(true)}
          >
            <FontAwesome
              name="plus"
              size={16}
              color={showAddForm ? '#fff' : styles.ACCENT_GREEN}
              style={styles.buttonIcon}
            />
            <Text style={[styles.buttonText, showAddForm ? styles.activeButtonText : styles.secondaryButtonText]}>Ajouter un Membre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              !showAddForm ? styles.activeButton : styles.secondaryButton,
            ]}
            onPress={() => setShowAddForm(false)}
          >
            <FontAwesome
              name="list-alt"
              size={16}
              color={!showAddForm ? '#fff' : styles.ACCENT_GREEN}
              style={styles.buttonIcon}
            />
            <Text style={[styles.buttonText, !showAddForm ? styles.activeButtonText : styles.secondaryButtonText]}>Voir les Membres</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentSection}>
          {showAddForm ? (
            <FamilyForm />
          ) : (
            <FamilyList />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- Palette de Couleurs ---
  ACCENT_GREEN: '#007A5E',       // Vert foncé, vif
  ACCENT_RED: '#CE1126',         // Rouge vif
  ACCENT_YELLOW: '#FCD116',      // Jaune vif

  BACKGROUND_PRIMARY: '#FFFFFF',    // Blanc pur pour les éléments principaux (cartes, etc.)
  // Nouvelle couleur de fond pour les écrans
  SCREEN_BACKGROUND: '#EEF7F4', // Le vert très clair de HomeScreen

  BORDER_LIGHT: '#E0E0E0',        // Gris très clair pour les bordures légères
  BORDER_MEDIUM: '#C0C0C0',       // Gris clair pour les bordures moyennes

  TEXT_PRIMARY: '#333333',         // Gris très foncé pour le texte principal
  TEXT_SECONDARY: '#666666',      // Gris moyen pour le texte secondaire

  // --- Styles spécifiques à l'écran FamilyScreen ---
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF7F4', // Applique le fond vert clair ici
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#EEF7F4', // Applique le fond vert clair ici aussi
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingVertical: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333333',
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonGroupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    backgroundColor: '#FFFFFF', // BACKGROUND_PRIMARY (les boutons restent blancs)
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeButton: {
    backgroundColor: '#007A5E', // ACCENT_GREEN
    borderColor: '#007A5E',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#E0E0E0', // BORDER_LIGHT
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#666666',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 5,
  },
});

export default FamilyScreen;