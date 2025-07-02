import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AddDishForm from '../components/dishes/AddDishForm';
import DishesList from '../components/dishes/DishesList';

function DishesScreen() {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header remains outside scroll/list */}
      <View style={styles.headerContainer}>
        <FontAwesome name="cutlery" size={32} color={styles.ACCENT_RED} />
        <Text style={styles.title}>Gestion des Plats</Text>
      </View>

      {/* Toggle buttons remain outside scroll/list */}
      <View style={styles.buttonGroupContainer}>
        <TouchableOpacity
          style={[styles.button, showAddForm ? styles.activeButton : styles.secondaryButton]}
          onPress={() => setShowAddForm(true)}
        >
          <FontAwesome name="plus" size={16} color={showAddForm ? '#fff' : styles.ACCENT_GREEN} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, showAddForm ? styles.activeButtonText : styles.secondaryButtonText]}>Ajouter un Plat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !showAddForm ? styles.activeButton : styles.secondaryButton]}
          onPress={() => setShowAddForm(false)}
        >
          <FontAwesome name="list-alt" size={16} color={!showAddForm ? '#fff' : styles.ACCENT_GREEN} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, !showAddForm ? styles.activeButtonText : styles.secondaryButtonText]}>Voir les Plats</Text>
        </TouchableOpacity>
      </View>

      {/* Content area - conditionally render ScrollView for form OR the list component */}
      <View style={styles.contentSection}>
        {showAddForm ? (
          // AddDishForm might need its own ScrollView if it's long
          <ScrollView contentContainerStyle={styles.formScrollContainer}>
            <AddDishForm />
          </ScrollView>
        ) : (
          // DishesList contains the FlatList and handles its own scrolling
          <DishesList />
        )}
      </View>
    </SafeAreaView>
  );
}

// Styles need slight adjustments, add formScrollContainer
const styles = StyleSheet.create({
  // --- Palette de Couleurs ---
  ACCENT_GREEN: '#007A5E',
  ACCENT_RED: '#CE1126',
  ACCENT_YELLOW: '#FCD116',
  BACKGROUND_PRIMARY: '#FFFFFF',
  SCREEN_BACKGROUND: '#EEF7F4',
  BORDER_LIGHT: '#E0E0E0',
  BORDER_MEDIUM: '#C0C0C0',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',

  safeArea: {
    flex: 1,
    backgroundColor: '#EEF7F4',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  // container style removed as ScrollView is gone or conditional
  // contentContainer style removed
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20, // Adjusted margin
    paddingVertical: 10,
    paddingHorizontal: 20, // Added horizontal padding
  },
  title: {
    fontSize: 28, // Slightly smaller
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
    marginBottom: 20, // Adjusted margin
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 20, // Added horizontal margin
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
    backgroundColor: '#007A5E',
    borderColor: '#007A5E',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#E0E0E0',
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
    flex: 1, // Make content take remaining space
    // paddingHorizontal: 5, // Padding might be handled by inner components now
  },
  formScrollContainer: { // Style for the ScrollView wrapping the form
      paddingHorizontal: 15, // Add padding if needed for the form
      paddingBottom: 20,
  }
});

export default DishesScreen;
