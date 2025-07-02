import React from 'react';
import { View, Button, Alert, Linking } from 'react-native';

const ShareScreen = ({ message }) => {
  const handleShareWhatsApp = async () => {
    try {
      // Message à partager (adapte selon ton besoin)
      const text = message || "Voici mon planning de repas !";
      // Encodage de l'URL
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erreur", "WhatsApp n'est pas installé sur cet appareil.");
      }
    } catch (error) {
      Alert.alert('Erreur', `Une erreur est survenue: ${error.message}`);
    }
  };

  return (
    <View>
      <Button title="Partager via WhatsApp" onPress={handleShareWhatsApp} />
    </View>
  );
};

export default ShareScreen;
