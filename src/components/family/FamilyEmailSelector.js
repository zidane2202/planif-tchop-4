import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

function FamilyEmailSelector({ onSelectionChange, selectedEmails = [] }) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(selectedEmails);

  useEffect(() => {
    const familyCollectionRef = collection(db, 'familyMembers');
    const q = query(familyCollectionRef, where('email', '!=', ''));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(member => member.email && member.email.trim() !== '');
      
      setFamilyMembers(membersData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Erreur lors de la récupération des membres:", err);
      setError("Impossible de charger les membres avec email.");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const toggleSelection = (email) => {
    let newSelected;
    if (selected.includes(email)) {
      newSelected = selected.filter(e => e !== email);
    } else {
      newSelected = [...selected, email];
    }
    setSelected(newSelected);
    const selectedMembers = familyMembers.filter(member => newSelected.includes(member.email));
    onSelectionChange(selectedMembers);
  };

  const selectAll = () => {
    const allEmails = familyMembers.map(member => member.email);
    setSelected(allEmails);
    onSelectionChange(familyMembers);
  };

  const deselectAll = () => {
    setSelected([]);
    onSelectionChange([]);
  };

  const renderMemberItem = ({ item }) => {
    const isSelected = selected.includes(item.email);
    
    return (
      <TouchableOpacity 
        style={[styles.memberItem, isSelected && styles.selectedItem]} 
        onPress={() => toggleSelection(item.email)}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <FontAwesome name="check-square-o" size={24} color="#007A5E" />
          ) : (
            <FontAwesome name="square-o" size={24} color="#666" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007A5E" />
        <Text style={styles.loadingText}>Chargement des membres...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="info-circle" size={40} color="#666" />
        <Text style={styles.emptyText}>Aucun membre avec email n'a été trouvé.</Text>
        <Text style={styles.emptySubText}>Ajoutez des emails aux membres de la famille pour pouvoir les sélectionner.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sélectionner les destinataires</Text>
      
      <View style={styles.selectionControls}>
        <TouchableOpacity style={styles.controlButton} onPress={selectAll}>
          <Text style={styles.controlButtonText}>Tout sélectionner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={deselectAll}>
          <Text style={styles.controlButtonText}>Tout désélectionner</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={familyMembers}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      
      <View style={styles.selectionSummary}>
        <Text style={styles.summaryText}>
          {selected.length} membre{selected.length !== 1 ? 's' : ''} sélectionné{selected.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  controlButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  controlButtonText: {
    color: '#007A5E',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 10,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#e8f5e9',
    borderColor: '#007A5E',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  checkboxContainer: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  selectionSummary: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default FamilyEmailSelector;

