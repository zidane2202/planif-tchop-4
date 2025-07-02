import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome } from '@expo/vector-icons'; // Utilisation des icônes Expo
import { db } from '../config/firebaseConfig';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import ChatbotBubble from '../components/ChatbotBubble';

// Importer les écrans
import HomeScreen from '../screens/HomeScreen';
import DishesScreen from '../screens/DishesScreen';
import FamilyScreen from '../screens/FamilyScreen';
import MealPlannerScreen from '../screens/MealPlannerScreen';
import InventoryScreen from '../screens/InventoryScreen';
import EmailSendScreen from '../screens/EmailSendScreen'; // Nouvel écran pour l'envoi d'emails
import ChatbotScreen from '../screens/ChatbotScreen';

// --- Définition des couleurs camerounaises pour la navigation ---
const ACCENT_GREEN = '#007A5E';       // Vert foncé, vif (pour l'icône active)
const TEXT_SECONDARY = '#666666';      // Gris moyen (pour l'icône inactive)

const Tab = createBottomTabNavigator();

function AppNavigator() {
  // --- Ajout : State global pour stock et plats ---
  const [ingredients, setIngredients] = useState([]); // inventaire
  const [dishes, setDishes] = useState([]); // plats
  const [mealPlans, setMealPlans] = useState([]); // planning des repas
  const [familyMembers, setFamilyMembers] = useState([]); // membres de la famille

  // Charger l'inventaire (userStock)
  useEffect(() => {
    const stockCollectionRef = query(collection(db, 'userStock'), limit(20));
    const unsubscribe = onSnapshot(stockCollectionRef, (snapshot) => {
      const stockData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIngredients(stockData);
    });
    return () => unsubscribe();
  }, []);

  // Charger les plats (dishes)
  useEffect(() => {
    const dishesCollectionRef = query(collection(db, 'dishes'), limit(20));
    const unsubscribe = onSnapshot(dishesCollectionRef, (snapshot) => {
      const dishesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDishes(dishesData);
    });
    return () => unsubscribe();
  }, []);

  // Charger le planning des repas (mealPlans)
  useEffect(() => {
    const mealPlansRef = query(collection(db, 'mealPlans'), limit(20));
    const unsubscribe = onSnapshot(mealPlansRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMealPlans(data);
    });
    return () => unsubscribe();
  }, []);

  // Charger la famille (familyMembers)
  useEffect(() => {
    const familyRef = query(collection(db, 'familyMembers'), limit(20));
    const unsubscribe = onSnapshot(familyRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFamilyMembers(data);
    });
    return () => unsubscribe();
  }, []);

  console.log("familyMembers transmis au chatbot :", familyMembers);

  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Accueil') {
                iconName = 'home';
              } else if (route.name === 'Plats') {
                iconName = 'cutlery';
              } else if (route.name === 'Famille') {
                iconName = 'users';
              } else if (route.name === 'Planning') {
                iconName = 'calendar';
              } else if (route.name === 'Courses') {
                iconName = 'shopping-cart';
              } else if (route.name === 'Emails') {
                iconName = 'envelope';
              }
              const iconSize = focused ? size + 2 : size;
              return <FontAwesome name={iconName} size={iconSize} color={color} />;
            },
            tabBarActiveTintColor: ACCENT_GREEN,
            tabBarInactiveTintColor: TEXT_SECONDARY,
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E0E0E0',
              height: 75,
              paddingBottom: 5,
              paddingTop: 5,
            },
            tabBarLabelStyle: {
              fontSize: 11,
            },
            headerShown: false
          })}
        >
          <Tab.Screen name="Accueil" component={HomeScreen} />
          <Tab.Screen name="Plats" component={DishesScreen} />
          <Tab.Screen name="Planning" component={MealPlannerScreen} />
          <Tab.Screen name="Courses" component={InventoryScreen} /> 
          <Tab.Screen name="Famille" component={FamilyScreen} />
          <Tab.Screen name="Emails" component={EmailSendScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <ChatbotBubble
        userDishes={dishes}
        userIngredients={ingredients}
        availableRecipes={dishes}
        mealPlans={mealPlans}
        familyMembers={familyMembers}
      />
    </>
  );
}

export default AppNavigator;

