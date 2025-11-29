import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import { FontAwesome } from '@expo/vector-icons';

// Configuration de l'URL du backend
// Utilise une variable d'environnement si disponible, sinon utilise des valeurs par défaut
// Pour Expo: utilisez expo-constants ou une config similaire
// Pour développement local (émulateur Android/iOS): utilisez votre IP locale
// Exemples: 'http://10.26.131.89:3001/chat' ou 'http://172.26.208.1:3001/chat'
// Pour web ou si backend sur même machine: 'http://localhost:3001/chat'
// Pour production (Render): utilise une URL relative si déployé ensemble, sinon URL complète
const getApiUrl = () => {
  // Priorité: variable d'environnement > __DEV__ check > fallback
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (__DEV__) {
    // Développement local - changez cette IP selon votre réseau
    return 'http://10.26.131.89:3001/chat';
  }
  // Production - si déployé sur le même domaine, utilise une URL relative
  // Sinon, utilisez l'URL complète de votre backend Render
  if (typeof window !== 'undefined' && window.location) {
    // Web: utilise une URL relative (même domaine)
    return '/chat';
  }
  // Mobile/autres: utilisez votre URL Render complète
  return 'https://planif-tchop.onrender.com/chat';
};

const API_URL = getApiUrl();
export default function ChatbotScreen({ userDishes = [], userIngredients = [], availableRecipes = [], mealPlans = [], familyMembers = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [visibleSuggestions, setVisibleSuggestions] = useState([]);
  const flatListRef = useRef(null);

  // Ajout : loading si données non prêtes (mais pas si juste vides)
  const isLoadingData =
    !userDishes || !userIngredients || !availableRecipes || !mealPlans || !familyMembers;

  // Message d'alerte si une collection est vide
  const emptyCollections = [];
  if (userDishes && userDishes.length === 0) emptyCollections.push('plats');
  if (userIngredients && userIngredients.length === 0) emptyCollections.push('ingrédients');
  if (availableRecipes && availableRecipes.length === 0) emptyCollections.push('recettes');
  if (mealPlans && mealPlans.length === 0) emptyCollections.push('planning');
  if (familyMembers && familyMembers.length === 0) emptyCollections.push('famille');

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages([...messages, { from: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    // Log des tailles de données envoyées
    console.log('Données envoyées:', {
      userDishes: userDishes.length,
      userIngredients: userIngredients.length,
      availableRecipes: availableRecipes.length,
      mealPlans: mealPlans.length,
      familyMembers: familyMembers.length
    });

    try {
      console.log('Tentative de connexion à:', API_URL);
      const res = await axios.post(API_URL, {
        userDishes,
        userIngredients,
        availableRecipes,
        mealPlans,
        familyMembers,
        userMessage,
      }, {
        timeout: 30000, // 30 secondes de timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Réponse reçue du serveur');
      const serverResponse = res.data?.response;
      let botText = '';

      if (typeof serverResponse === 'string') {
        botText = serverResponse;
      } else if (serverResponse !== undefined && serverResponse !== null) {
        // Convert non-string responses (objects, arrays, etc.) to a readable string
        botText = JSON.stringify(serverResponse, null, 2);
      } else {
        botText = "Je n'ai pas reçu de réponse compréhensible du serveur.";
      }

      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: botText },
      ]);
      setSuggestions(Array.isArray(res.data?.suggestions) ? res.data.suggestions : []);
    } catch (e) {
      console.error('Erreur chatbot:', e);
      let errorMessage = "Désolé, je rencontre un problème technique.";
      
      if (e.code === 'ECONNREFUSED' || e.message?.includes('Network Error')) {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez que le backend est démarré et accessible à l'adresse : " + API_URL;
      } else if (e.code === 'ETIMEDOUT' || e.message?.includes('timeout')) {
        errorMessage = "La requête a pris trop de temps. Le serveur ne répond pas.";
      } else if (e.response) {
        // Le serveur a répondu avec un code d'erreur
        errorMessage = `Erreur serveur (${e.response.status}): ${e.response.data?.message || 'Erreur inconnue'}`;
      } else if (e.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMessage = "Aucune réponse du serveur. Vérifiez votre connexion réseau.";
      }
      
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: errorMessage },
      ]);
    }
    setLoading(false);
  };

  // Scroll auto vers le bas à chaque nouveau message
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Met à jour les suggestions visibles à chaque nouvelle suggestion IA
  useEffect(() => {
    setVisibleSuggestions(suggestions);
  }, [suggestions]);

  if (isLoadingData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fa' }}>
        <ActivityIndicator size="large" color="#007A5E" />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#007A5E' }}>Chargement des données de l'application...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.header}>Assistant Planif-Tchop</Text>
      
      {emptyCollections.length > 0 && (
        <View style={{ backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginBottom: 8 }}>
          <Text style={{ color: '#856404', fontSize: 16 }}>
            Attention : Les collections suivantes sont vides : {emptyCollections.join(', ')}
          </Text>
        </View>
      )}
     
    
     
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={item.from === 'user' ? styles.userBubble : styles.botBubble}>
            {item.from === 'bot'
              ? <Markdown style={markdownStyles}>{item.text}</Markdown>
              : <Text style={styles.messageText}>{item.text}</Text>
            }
          </View>
        )}
        style={styles.chat}
        contentContainerStyle={{ paddingBottom: 80 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {loading && <ActivityIndicator size="large" color="#007A5E" style={{ marginVertical: 8 }} />}
      <View style={styles.suggestions}>
        {visibleSuggestions.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
            <TouchableOpacity onPress={() => setInput(s)} style={styles.suggestionBtn}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setVisibleSuggestions(prev => prev.filter((_, idx) => idx !== i))}
              style={styles.closeSuggestionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.closeIconBg}>
                <FontAwesome name="times" size={16} color="#CE1126" />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pose ta question ou demande une recette..."
          placeholderTextColor="#888"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={loading}>
          <Text style={styles.sendText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fa', padding: 10 },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007A5E',
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 1,
  },
  chat: { flex: 1, paddingBottom: 10 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007A5E',
    borderRadius: 18,
    margin: 6,
    padding: 14,
    maxWidth: '80%',
    shadowColor: '#007A5E',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    margin: 6,
    padding: 14,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  messageText: { color: '#fff', fontSize: 18 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    fontSize: 17,
    backgroundColor: 'transparent',
    color: '#222',
    padding: 10,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#007A5E',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  suggestionBtn: {
    backgroundColor: '#e6f9f0',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 4,
    borderWidth: 1,
    borderColor: '#b2e5d6',
  },
  suggestionText: { color: '#007A5E', fontSize: 15 },
  closeSuggestionBtn: {
    marginLeft: 2,
    padding: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconBg: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
});

const markdownStyles = {
  body: { color: '#222', fontSize: 18 },
  heading1: { color: '#007A5E', fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
  heading2: { color: '#007A5E', fontSize: 21, fontWeight: 'bold', marginVertical: 6 },
  heading3: { color: '#007A5E', fontSize: 19, fontWeight: 'bold', marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  strong: { fontWeight: 'bold', color: '#007A5E' },
  em: { fontStyle: 'italic' },
  code_inline: { backgroundColor: '#f4f4f4', borderRadius: 4, padding: 2, fontFamily: 'monospace' },
}; 