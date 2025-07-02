import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { db } from '../../config/firebaseConfig'; // Adapter le chemin
import { collection, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

function FamilyList() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editedMemberData, setEditedMemberData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const familyCollectionRef = collection(db, 'familyMembers');
    const unsubscribe = onSnapshot(familyCollectionRef, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFamilyMembers(membersData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Erreur lors de la récupération des membres:", err);
      setError("Impossible de charger les membres.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteMember = (memberId) => {
    Alert.alert(
      "Confirmer la suppression",
      "Êtes-vous sûr de vouloir supprimer ce membre ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'familyMembers', memberId));
              console.log("Membre supprimé avec succès:", memberId);
            } catch (err) {
              console.error("Erreur lors de la suppression:", err);
              setError("Erreur lors de la suppression: " + err.message);
              Alert.alert("Erreur", "Impossible de supprimer le membre.");
            }
          },
        },
      ]
    );
  };

  const handleEditClick = (member) => {
    setEditingMemberId(member.id);
    setEditedMemberData({
      ...member,
      age: member.age === null || member.age === undefined ? '' : String(member.age),
      email: member.email || '',
      preferences: member.preferences || '',
      notes: member.notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditedMemberData({});
    setError(null);
  };

  const handleEditedInputChange = (field, value) => {
    setEditedMemberData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId) return;
    setError(null);
    setUpdateLoading(true);

    if (!editedMemberData.name || !editedMemberData.name.trim()) {
      setError("Le nom du membre ne peut pas être vide.");
      setUpdateLoading(false);
      return;
    }
    if (editedMemberData.email && editedMemberData.email.trim() && !/\S+@\S+\.\S+/.test(editedMemberData.email.trim())) {
      setError("Veuillez entrer une adresse email valide.");
      setUpdateLoading(false);
      return;
    }

    try {
      const memberRef = doc(db, 'familyMembers', editingMemberId);
      const dataToUpdate = {
        name: editedMemberData.name.trim(),
        role: editedMemberData.role ? editedMemberData.role.trim() : '',
        age: editedMemberData.age === '' ? null : parseInt(editedMemberData.age),
        email: editedMemberData.email ? editedMemberData.email.trim() : '',
        preferences: editedMemberData.preferences ? editedMemberData.preferences.trim() : '',
        notes: editedMemberData.notes ? editedMemberData.notes.trim() : '',
        updatedAt: serverTimestamp()
      };

      await updateDoc(memberRef, dataToUpdate);
      console.log("Membre mis à jour avec succès:", editingMemberId);
      handleCancelEdit();
      Alert.alert("Succès", "Membre mis à jour.");
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      setError("Erreur lors de la mise à jour: " + err.message);
      Alert.alert("Erreur", "Impossible de mettre à jour le membre.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const renderEditForm = (member) => (
    <ScrollView style={styles.editFormCard}>
      <Text style={styles.editFormTitle}><FontAwesome name="user-circle" size={18} /> Modifier "{member.name}"</Text>
      {error && <Text style={styles.errorTextItem}>{error}</Text>}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nom:</Text>
        <TextInput
          style={styles.input}
          value={editedMemberData.name || ''}
          onChangeText={(value) => handleEditedInputChange('name', value)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Rôle:</Text>
        <TextInput
          style={styles.input}
          value={editedMemberData.role || ''}
          onChangeText={(value) => handleEditedInputChange('role', value)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Âge:</Text>
        <TextInput
          style={styles.input}
          value={editedMemberData.age || ''}
          onChangeText={(value) => handleEditedInputChange('age', value)}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}><FontAwesome name="envelope" size={14} /> Email:</Text>
        <TextInput
          style={styles.input}
          value={editedMemberData.email || ''}
          onChangeText={(value) => handleEditedInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}><FontAwesome name="cutlery" size={14} /> Préférences Alimentaires:</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={editedMemberData.preferences || ''}
          onChangeText={(value) => handleEditedInputChange('preferences', value)}
          multiline
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes:</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={editedMemberData.notes || ''}
          onChangeText={(value) => handleEditedInputChange('notes', value)}
          multiline
        />
      </View>

      <View style={styles.editButtonGroup}>
        <TouchableOpacity onPress={handleUpdateMember} disabled={updateLoading} style={[styles.actionButton, styles.successButton]}>
          {updateLoading ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome name="save" size={16} color="#fff" />}
          <Text style={styles.actionButtonText}> Enregistrer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancelEdit} style={[styles.actionButton, styles.secondaryButton]}>
          <FontAwesome name="times" size={16} color="#6c757d" />
          <Text style={styles.actionButtonTextSecondary}> Annuler</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderMemberItem = ({ item }) => {
    if (editingMemberId === item.id) {
      return renderEditForm(item);
    }

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}><FontAwesome name="user" size={16} /> {item.name}</Text>
          {item.role && <Text style={styles.memberDetail}>Rôle: {item.role}</Text>}
          {item.age !== null && item.age !== undefined && <Text style={styles.memberDetail}><FontAwesome name="birthday-cake" size={12} /> Âge: {item.age} ans</Text>}
          {item.email && <Text style={styles.memberDetail}><FontAwesome name="envelope" size={12} /> {item.email}</Text>}
          {item.preferences && <Text style={styles.memberDetail}><FontAwesome name="cutlery" size={12} /> Préférences: {item.preferences}</Text>}
          {item.notes && <Text style={styles.memberDetail}><FontAwesome name="sticky-note" size={12} /> Notes: {item.notes}</Text>}

          <View style={styles.buttonGroupItem}>
            <TouchableOpacity onPress={() => handleEditClick(item)} style={[styles.actionButton, styles.primaryButton]}>
              <FontAwesome name="edit" size={16} color="#fff" />
              <Text style={styles.actionButtonText}> Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteMember(item.id)} style={[styles.actionButton, styles.dangerButton]}>
              <FontAwesome name="trash" size={16} color="#fff" />
              <Text style={styles.actionButtonText}> Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#28a745" style={styles.loading} />;
  }

  if (error && !editingMemberId) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.listTitle}><FontAwesome name="list-alt" size={20} /> Liste des membres</Text>
      {familyMembers.length === 0 ? (
        <Text style={styles.noMembersText}>Aucun membre enregistré.</Text>
      ) : (
        <FlatList
          data={familyMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  errorTextItem: {
      color: 'red',
      textAlign: 'center',
      marginBottom: 10,
      fontSize: 14,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#343a40',
  },
  noMembersText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  memberItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  memberInfo: {},
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#343a40',
  },
  memberDetail: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 5,
    lineHeight: 20,
  },
  buttonGroupItem: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  actionButtonTextSecondary: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  successButton: {
      backgroundColor: '#28a745',
  },
  secondaryButton: {
      backgroundColor: '#f8f9fa',
      borderWidth: 1,
      borderColor: '#6c757d',
  },
  // Styles pour le formulaire d'édition
  editFormCard: {
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 15,
  },
  editFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#343a40',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#495057',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
});

export default FamilyList;

