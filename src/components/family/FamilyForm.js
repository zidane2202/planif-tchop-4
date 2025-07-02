import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { db } from '../../config/firebaseConfig'; // Adapter le chemin
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

function FamilyForm() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Le nom du membre ne peut pas être vide.");
      setLoading(false);
      return;
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }

    try {
      const newFamilyMember = {
        name: name.trim(),
        role: role.trim(),
        age: age ? parseInt(age) : null,
        email: email.trim(),
        preferences: preferences.trim(),
        notes: notes.trim(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'familyMembers'), newFamilyMember);
      console.log("Membre de la famille ajouté avec l'ID:", docRef.id);

      // Réinitialiser le formulaire
      setName('');
      setRole('');
      setAge('');
      setEmail('');
      setPreferences('');
      setNotes('');
      Alert.alert("Succès", "Membre de la famille ajouté avec succès !");

    } catch (err) {
      console.error("Erreur lors de l'ajout du membre:", err);
      setError("Erreur lors de l'ajout: " + err.message);
      Alert.alert("Erreur", "Impossible d'ajouter le membre: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.formTitle}><FontAwesome name="user-plus" size={20} /> Ajouter un membre</Text>

      {error && (
        <Text style={styles.errorMessage}>{error}</Text>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nom:</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Maman, Papa, Léo..."
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Rôle (facultatif):</Text>
        <TextInput
          style={styles.input}
          value={role}
          onChangeText={setRole}
          placeholder="Ex: Parent, Enfant, Ado..."
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Âge (facultatif):</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="Ex: 35"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}><FontAwesome name="envelope" size={14} /> Email (facultatif):</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Ex: nom@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}><FontAwesome name="cutlery" size={14} /> Préférences Alimentaires (facultatif):</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={preferences}
          onChangeText={setPreferences}
          placeholder="Ex: Végétarien, sans gluten, allergie..."
          multiline
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes (facultatif):</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Autres détails..."
          multiline
        />
      </View>

      <TouchableOpacity onPress={handleSubmit} disabled={loading} style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
        <FontAwesome name="save" size={18} color="#fff" />
        <Text style={styles.submitButtonText}>{loading ? ' Ajout en cours...' : ' Ajouter le membre'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#343a40',
  },
  errorMessage: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#495057',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top', // Pour Android
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745', // Vert pour la famille
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default FamilyForm;

