import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MealPlanner from '../components/planning/MealPlanner';
import EmailButton from '../components/common/EmailButton';

const PALETTE = {
  ACCENT_GREEN: '#007A5E',
  ACCENT_RED: '#CE1126',
  ACCENT_YELLOW: '#FCD116',
  BACKGROUND_PRIMARY: '#FFFFFF',
  SCREEN_BACKGROUND: '#EEF7F4',
  BORDER_LIGHT: '#E0E0E0',
  BORDER_MEDIUM: '#C0C0C0',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
};

function MealPlannerScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with email button */}
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <FontAwesome name="calendar" size={32} color={PALETTE.ACCENT_RED} />
          <Text style={styles.title}>Planning des Repas</Text>
        </View>
      </View>

      {/* The MealPlanner component takes the full remaining space */}
      <View style={styles.contentSection}>
        
        <MealPlanner />

      </View>
    
    </SafeAreaView>
    
  );
}

// Styles adjusted to include the email button
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF7F4',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333333',
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  contentSection: {
    flex: 1,
  },
  emailButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

export default MealPlannerScreen;

