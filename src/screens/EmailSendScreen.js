  import React, { useState } from 'react';
  import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    ScrollView, 
    TouchableOpacity, 
    Switch,
    ActivityIndicator,
    Alert,
    Platform
  } from 'react-native';
  import { FontAwesome } from '@expo/vector-icons';
  import FamilyEmailSelector from '../components/family/FamilyEmailSelector';
  import EmailService from '../services/EmailService';

  function EmailSendScreen() {
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [includePlanning, setIncludePlanning] = useState(true);
    const [includeStock, setIncludeStock] = useState(true);
    const [includeShoppingList, setIncludeShoppingList] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleSelectionChange = (members) => {
      setSelectedMembers(members);
    };

    const handleSendEmail = async () => {
      if (selectedMembers.length === 0) {
        Alert.alert(
          "Aucun destinataire",
          "Veuillez sélectionner au moins un membre de la famille comme destinataire."
        );
        return;
      }

      if (!includePlanning && !includeStock && !includeShoppingList) {
        Alert.alert(
          "Aucun contenu",
          "Veuillez sélectionner au moins un type de contenu à envoyer."
        );
        return;
      }

      setLoading(true);
      
      try {
        const result = await EmailService.sendEmail(
          selectedMembers,
          includePlanning,
          includeStock,
          includeShoppingList
        );
        
        if (result.success) {
          Alert.alert("Succès", result.message);
        } else {
          Alert.alert("Erreur", result.message);
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi des emails:", error);
        Alert.alert(
          "Erreur",
          "Une erreur s'est produite lors de l'envoi des emails. Veuillez réessayer plus tard."
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <FontAwesome name="envelope" size={32} color={styles.ACCENT_RED} />
            <Text style={styles.title}>Envoi d'Emails</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Destinataires</Text>
            <View style={styles.selectorContainer}>
              <FamilyEmailSelector 
                onSelectionChange={handleSelectionChange}
                selectedEmails={selectedMembers.map(m => m.email)}
              />
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Contenu à envoyer</Text>
            
            <View style={styles.optionContainer}>
              <View style={styles.optionTextContainer}>
                <FontAwesome name="calendar" size={20} color={styles.ACCENT_GREEN} style={styles.optionIcon} />
                <Text style={styles.optionText}>Planning des repas</Text>
              </View>
              <Switch
                value={includePlanning}
                onValueChange={setIncludePlanning}
                trackColor={{ false: '#d1d1d1', true: '#a7e3c5' }}
                thumbColor={includePlanning ? styles.ACCENT_GREEN : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
              />
            </View>

            <View style={styles.optionContainer}>
              <View style={styles.optionTextContainer}>
                <FontAwesome name="cubes" size={20} color={styles.ACCENT_GREEN} style={styles.optionIcon} />
                <Text style={styles.optionText}>État du stock</Text>
              </View>
              <Switch
                value={includeStock}
                onValueChange={setIncludeStock}
                trackColor={{ false: '#d1d1d1', true: '#a7e3c5' }}
                thumbColor={includeStock ? styles.ACCENT_GREEN : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
              />
            </View>

            <View style={styles.optionContainer}>
              <View style={styles.optionTextContainer}>
                <FontAwesome name="shopping-basket" size={20} color={styles.ACCENT_GREEN} style={styles.optionIcon} />
                <Text style={styles.optionText}>Liste de courses</Text>
              </View>
              <Switch
                value={includeShoppingList}
                onValueChange={setIncludeShoppingList}
                trackColor={{ false: '#d1d1d1', true: '#a7e3c5' }}
                thumbColor={includeShoppingList ? styles.ACCENT_GREEN : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (selectedMembers.length === 0 || (!includePlanning && !includeStock && !includeShoppingList) || loading) && 
              styles.sendButtonDisabled
            ]} 
            onPress={handleSendEmail}
            disabled={loading || selectedMembers.length === 0 || (!includePlanning && !includeStock && !includeShoppingList)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="paper-plane" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Envoyer</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
    container: {
      flex: 1,
      backgroundColor: '#EEF7F4',
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
    sectionContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#333333',
    },
    selectorContainer: {
      height: 300,
      marginBottom: 10,
    },
    optionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    optionTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionIcon: {
      marginRight: 10,
    },
    optionText: {
      fontSize: 16,
      color: '#333333',
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#007A5E',
      paddingVertical: 15,
      borderRadius: 8,
      marginTop: 20,
    },
    sendButtonDisabled: {
      backgroundColor: '#a0a0a0',
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
    },
  });

  export default EmailSendScreen;

