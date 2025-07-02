import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebaseConfig'; // Import db and auth

const FamilyManagementScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(true);

  // Get current user and their family ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch user profile to get familyId
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.familyId) {
            setFamilyId(userData.familyId);
          } else {
            console.warn("Utilisateur connecté mais pas d'ID de famille trouvé dans son profil.");
            // Handle case where user has no familyId (should not happen with current signup logic)
            setLoadingFamily(false);
          }
        } else {
          console.error("Profil utilisateur introuvable pour l'utilisateur connecté.");
          setLoadingFamily(false);
        }
      } else {
        setCurrentUser(null);
        setFamilyId(null);
        setMembers([]);
        setFamilyName('');
        setLoadingFamily(false);
        // Optionally navigate to Login if user logs out while on this screen
        // navigation.navigate('Login');
      }
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // Fetch family details once familyId is known
  const fetchFamilyDetails = useCallback(async () => {
    if (!familyId) return;
    setLoadingFamily(true);
    try {
      const familyDocRef = doc(db, 'families', familyId);
      const familyDocSnap = await getDoc(familyDocRef);
      if (familyDocSnap.exists()) {
        const familyData = familyDocSnap.data();
        setFamilyName(familyData.name || '');
        setMembers(familyData.members || []);
      } else {
        console.error("Document de famille introuvable pour l'ID:", familyId);
        Alert.alert('Erreur', 'Impossible de charger les informations de la famille.');
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la famille:", error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du chargement de la famille.');
    } finally {
      setLoadingFamily(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchFamilyDetails();
  }, [fetchFamilyDetails]); // Depend on the memoized fetch function

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du membre.');
      return;
    }
    if (!familyId) {
        Alert.alert('Erreur', 'ID de famille non trouvé. Impossible d\ajouter un membre.');
        return;
    }

    setLoading(true);
    try {
      const familyDocRef = doc(db, 'families', familyId);
      // Create a new member object - for now, just storing name
      // In a real app, you might want unique IDs for members too
      const newMember = {
        // memberId: generateUniqueId(), // Consider adding unique IDs later
        name: newMemberName.trim(),
        role: 'member' // Default role, could be customizable
      };

      // Update the 'members' array in the family document
      await updateDoc(familyDocRef, {
        members: arrayUnion(newMember)
      });

      // Refresh family details locally
      setMembers(prevMembers => [...prevMembers, newMember]);
      setNewMemberName(''); // Clear input field
      Alert.alert('Succès', `${newMemberName.trim()} a été ajouté à la famille.`);

    } catch (error) {
      console.error("Erreur lors de l'ajout du membre:", error);
      Alert.alert('Erreur', 'Impossible d\ajouter le membre à la famille.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingFamily) {
    return <View style={styles.container}><Text>Chargement de la famille...</Text></View>;
  }

  if (!currentUser) {
      return <View style={styles.container}><Text>Veuillez vous connecter pour gérer votre famille.</Text></View>;
  }

  if (!familyId) {
      return <View style={styles.container}><Text>Aucune famille associée à ce compte.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestion de la Famille</Text>
      <Text style={styles.familyName}>{familyName}</Text>

      <View style={styles.addMemberSection}>
        <TextInput
          style={styles.input}
          placeholder="Nom du nouveau membre"
          value={newMemberName}
          onChangeText={setNewMemberName}
        />
        <Button title={loading ? "Ajout en cours..." : "Ajouter Membre"} onPress={handleAddMember} disabled={loading} />
      </View>

      <Text style={styles.listTitle}>Membres Actuels :</Text>
      <FlatList
        data={members}
        keyExtractor={(item, index) => item.userId || item.name + index} // Use userId if available, otherwise name+index
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Text>{item.name} ({item.role})</Text>
            {/* Add delete button later if needed */}
          </View>
        )}
        ListEmptyComponent={<Text>Aucun membre ajouté pour le moment.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  familyName: {
      fontSize: 18,
      marginBottom: 20,
      textAlign: 'center',
      color: 'grey',
  },
  addMemberSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  memberItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default FamilyManagementScreen;
