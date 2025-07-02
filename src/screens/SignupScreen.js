import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../config/firebaseConfig'; // Import auth and db from config

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to create a family document in Firestore
  const createFamilyForUser = async (userId, userEmail) => {
    try {
      // Add a new document to the 'families' collection
      const familyDocRef = await addDoc(collection(db, 'families'), {
        creatorId: userId,
        creatorEmail: userEmail, // Store email for reference
        name: `Famille de ${userEmail.split('@')[0]}`, // Default family name
        members: [{ userId: userId, role: 'creator', name: 'Moi' }], // Add creator as the first member
        createdAt: serverTimestamp(),
      });
      console.log('Famille créée avec ID:', familyDocRef.id);

      // Optionally, create a user profile document linking to the family
      await setDoc(doc(db, 'users', userId), {
        email: userEmail,
        familyId: familyDocRef.id, // Link user to their family
        createdAt: serverTimestamp(),
      });
      console.log('Profil utilisateur créé/mis à jour pour:', userId);

      return familyDocRef.id;
    } catch (error) {
      console.error("Erreur lors de la création de la famille ou du profil utilisateur:", error);
      // Consider how to handle this error - maybe delete the created user?
      // For now, we just log it and let the user proceed without a family link.
      Alert.alert('Erreur', 'Impossible de créer la structure familiale associée au compte.');
      throw error; // Re-throw error to be caught by the main handler if needed
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Utilisateur inscrit:', user.uid);

      // 2. Create the associated family and user profile in Firestore
      await createFamilyForUser(user.uid, user.email);

      // L'utilisateur est inscrit, connecté, et la famille est créée.
      // La navigation vers HomeScreen se fera via le listener d'état d'authentification global.
      // Alert.alert('Succès', 'Compte créé avec succès !'); // Peut-être redondant

    } catch (error) {
      console.error("Erreur d'inscription globale:", error);
      // Handle Auth errors specifically
      let errorMessage = error.message;
      if (error.code) { // Check if it's a Firebase Auth error code
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Cette adresse email est déjà utilisée.';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'L\'adresse email n\'est pas valide.';
          }
      } else {
          // Handle Firestore or other errors from createFamilyForUser if not already alerted
          // errorMessage is already set from the re-thrown error or use a generic message
          errorMessage = 'Une erreur est survenue lors de la finalisation de l\'inscription.';
      }

      // Avoid double alerting if createFamilyForUser already showed an alert
      if (!errorMessage.includes('Impossible de créer la structure familiale')) {
          Alert.alert('Erreur d\inscription', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inscription</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe (min. 6 caractères)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Button title={loading ? "Inscription en cours..." : "S'inscrire"} onPress={handleSignup} disabled={loading} />
      <Button title="Déjà un compte ? Se connecter" onPress={() => navigation.navigate('Login')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});

export default SignupScreen;
