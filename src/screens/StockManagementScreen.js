import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Platform,
    ActivityIndicator,
    Alert,
    Modal,
    Button
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { INGREDIENT_CATEGORIES } from '../../utils/IngredientCategories';

// Helper function to group stock by category
const groupStockByCategory = (stockData) => {
    return stockData.reduce((acc, item) => {
        const category = item.category || 'Autres';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        acc[category].sort((a, b) => a.name.localeCompare(b.name));
        return acc;
    }, {});
};

// Define low stock threshold (can be adjusted)
const LOW_STOCK_THRESHOLD = 1;

function StockManagementScreen() {
    const [stock, setStock] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemUnit, setItemUnit] = useState('');
    const [itemCategory, setItemCategory] = useState(INGREDIENT_CATEGORIES[1]);
    const [modalLoading, setModalLoading] = useState(false);

    const userId = 'user_test_id';

    useEffect(() => {
        setLoading(true);
        const stockCollectionRef = collection(db, 'userStock');
        const q = query(stockCollectionRef, where('userId', '==', userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stockData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const groupedData = groupStockByCategory(stockData);
            const sortedCategories = Object.keys(groupedData).sort();
            const sortedGroupedData = {};
            sortedCategories.forEach(cat => {
                sortedGroupedData[cat] = groupedData[cat];
            });
            setStock(sortedGroupedData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Erreur chargement stock:", err);
            setError("Impossible de charger le stock.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const openModalToAdd = () => {
        setCurrentItem(null);
        setItemName('');
        setItemQuantity('');
        setItemUnit('');
        setItemCategory(INGREDIENT_CATEGORIES[1]);
        setIsModalVisible(true);
    };

    const openModalToEdit = (item) => {
        setCurrentItem(item);
        setItemName(item.name);
        setItemQuantity(String(item.quantity));
        setItemUnit(item.unit);
        setItemCategory(item.category || INGREDIENT_CATEGORIES[1]);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setCurrentItem(null);
    };

    const handleSaveItem = async () => {
        if (!itemName.trim() || !itemQuantity.trim() || !itemUnit.trim() || !itemCategory) {
            Alert.alert("Erreur", "Veuillez remplir tous les champs (Nom, Quantité, Unité, Catégorie).");
            return;
        }
        const quantity = parseFloat(itemQuantity);
        if (isNaN(quantity) || quantity < 0) {
            Alert.alert("Erreur", "La quantité doit être un nombre positif.");
            return;
        }

        setModalLoading(true);
        const itemData = {
            userId: userId,
            name: itemName.trim(),
            quantity: quantity,
            unit: itemUnit.trim(),
            category: itemCategory,
            updatedAt: serverTimestamp()
        };

        try {
            if (currentItem) {
                const itemRef = doc(db, 'userStock', currentItem.id);
                await updateDoc(itemRef, itemData);
                Alert.alert("Succès", "Ingrédient mis à jour.");
            } else {
                await addDoc(collection(db, 'userStock'), {
                    ...itemData,
                    createdAt: serverTimestamp()
                });
                Alert.alert("Succès", "Ingrédient ajouté au stock.");
            }
            closeModal();
        } catch (err) {
            console.error("Erreur sauvegarde ingrédient:", err);
            Alert.alert("Erreur", `Impossible de sauvegarder l'ingrédient: ${err.message}`);
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteItem = (item) => {
        Alert.alert(
            "Confirmer suppression",
            `Supprimer ${item.name} (${item.quantity} ${item.unit}) du stock ?`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'userStock', item.id));
                        } catch (err) {
                            console.error("Erreur suppression ingrédient:", err);
                            Alert.alert("Erreur", `Impossible de supprimer l'ingrédient: ${err.message}`);
                        }
                    }
                }
            ]
        );
    };

    const filteredStock = () => {
        if (!searchQuery) {
            return stock;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = {};
        Object.keys(stock).forEach(category => {
            const items = stock[category].filter(item =>
                item.name.toLowerCase().includes(lowerCaseQuery)
            );
            if (items.length > 0) {
                filtered[category] = items;
            }
        });
        return filtered;
    };

    // --- Render Stock Item with Visual Cues ---
    const renderStockItem = ({ item }) => {
        const quantity = item.quantity || 0;
        const isOutOfStock = quantity <= 0;
        const isLowStock = quantity > 0 && quantity <= (item.lowStockThreshold || LOW_STOCK_THRESHOLD);

        let itemStyle = styles.itemContainer;
        let nameStyle = styles.itemName;
        let quantityStyle = styles.itemQuantity;
        let icon = null;

        if (isOutOfStock) {
            itemStyle = [styles.itemContainer, styles.itemOutOfStock];
            nameStyle = [styles.itemName, styles.itemNameOutOfStock];
            quantityStyle = [styles.itemQuantity, styles.itemQuantityOutOfStock];
            icon = <FontAwesome name="times-circle" size={16} color={styles.ACCENT_RED} style={styles.statusIcon} />;
        } else if (isLowStock) {
            itemStyle = [styles.itemContainer, styles.itemLowStock];
            quantityStyle = [styles.itemQuantity, styles.itemQuantityLowStock];
            icon = <FontAwesome name="exclamation-triangle" size={16} color={styles.ACCENT_YELLOW_DARK} style={styles.statusIcon} />;
        }

        return (
            <View style={itemStyle}>
                {icon} 
                <View style={styles.itemInfo}>
                    <Text style={nameStyle}>{item.name}</Text>
                    <Text style={quantityStyle}>{quantity} {item.unit}</Text>
                </View>
                <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openModalToEdit(item)} style={styles.actionButton}>
                        <FontAwesome name="pencil" size={18} color={styles.ACCENT_GREEN} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.actionButton}>
                        <FontAwesome name="trash" size={18} color={styles.ACCENT_RED} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    // --- End Render Stock Item ---

    const renderCategorySection = ({ item: category }) => (
        <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <FlatList
                data={filteredStock()[category]}
                renderItem={renderStockItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                ListHeaderComponent={
                    <>
                        <View style={styles.headerContainer}>
                            <FontAwesome name="cubes" size={32} color={styles.ACCENT_GREEN} />
                            <Text style={styles.title}>Gestion du Stock</Text>
                        </View>
                        <View style={styles.searchAddContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Rechercher un ingrédient..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <TouchableOpacity onPress={openModalToAdd} style={styles.addButton}>
                                <FontAwesome name="plus" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        {loading && <ActivityIndicator size="large" color={styles.ACCENT_GREEN} style={{ marginVertical: 20 }} />}
                        {error && <Text style={styles.errorText}>{error}</Text>}
                    </>
                }
                data={Object.keys(filteredStock())}
                renderItem={renderCategorySection}
                keyExtractor={(category) => category}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    !loading ? (
                        <Text style={styles.infoText}>Votre stock est vide ou aucun résultat trouvé.</Text>
                    ) : null
                }
            />

            {/* Add/Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{currentItem ? 'Modifier' : 'Ajouter'} un Ingrédient</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Nom de l'ingrédient"
                            value={itemName}
                            onChangeText={setItemName}
                        />
                        <View style={styles.modalRow}>
                            <TextInput
                                style={[styles.modalInput, styles.modalInputHalf]}
                                placeholder="Quantité"
                                value={itemQuantity}
                                onChangeText={setItemQuantity}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={[styles.modalInput, styles.modalInputHalf]}
                                placeholder="Unité (kg, g, L, unité...)"
                                value={itemUnit}
                                onChangeText={setItemUnit}
                            />
                        </View>
                        <View style={styles.pickerContainerModal}>
                            <Picker
                                selectedValue={itemCategory}
                                onValueChange={(itemValue) => setItemCategory(itemValue)}
                                style={styles.pickerStyleModal}
                            >
                                {INGREDIENT_CATEGORIES.map((cat, index) => (
                                    cat !== "Sélectionner une catégorie" && <Picker.Item key={index} label={cat} value={cat} />
                                ))}
                            </Picker>
                        </View>

                        <View style={styles.modalButtonGroup}>
                            <Button title="Annuler" onPress={closeModal} color={styles.TEXT_SECONDARY} />
                            <Button
                                title={modalLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                                onPress={handleSaveItem}
                                disabled={modalLoading}
                                color={styles.ACCENT_GREEN}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- Styles --- (Add styles for stock status)
const styles = StyleSheet.create({
    // --- Palette de Couleurs ---
    ACCENT_GREEN: '#007A5E',
    ACCENT_RED: '#CE1126',
    ACCENT_YELLOW: '#FCD116',
    ACCENT_YELLOW_DARK: '#EAA800', // Darker yellow/orange for low stock warning
    BACKGROUND_PRIMARY: '#FFFFFF',
    SCREEN_BACKGROUND: '#EEF7F4',
    BORDER_LIGHT: '#E0E0E0',
    BORDER_MEDIUM: '#C0C0C0',
    TEXT_PRIMARY: '#333333',
    TEXT_SECONDARY: '#666666',
    OUT_OF_STOCK_BG: '#ffebee', // Light red background for out of stock
    LOW_STOCK_BG: '#fff8e1', // Light yellow background for low stock

    safeArea: {
        flex: 1,
        backgroundColor: '#EEF7F4',
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    listContentContainer: {
        paddingBottom: 30,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#333333',
    },
    searchAddContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#C0C0C0',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginRight: 10,
        backgroundColor: '#fff',
    },
    addButton: {
        backgroundColor: '#007A5E',
        padding: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categorySection: {
        marginTop: 15,
        marginHorizontal: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007A5E',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    itemContainer: {
        flexDirection: 'row',
        // justifyContent: 'space-between', // Adjusted below
        alignItems: 'center',
        paddingVertical: 10, // Reduced padding slightly
        paddingHorizontal: 5, // Added horizontal padding
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemOutOfStock: {
        backgroundColor: '#ffebee', // Light red background
    },
    itemLowStock: {
        backgroundColor: '#fff8e1', // Light yellow background
    },
    statusIcon: {
        marginRight: 8,
    },
    itemInfo: {
        flex: 1,
        marginRight: 10,
    },
    itemName: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
    },
    itemNameOutOfStock: {
        textDecorationLine: 'line-through',
        color: '#a0a0a0', // Greyed out
    },
    itemQuantity: {
        fontSize: 14,
        color: '#666666',
    },
    itemQuantityOutOfStock: {
        color: '#CE1126', // Red color
        fontWeight: 'bold',
    },
    itemQuantityLowStock: {
        color: '#EAA800', // Dark yellow/orange color
        fontWeight: 'bold',
    },
    itemActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 10,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginVertical: 15,
        fontSize: 14,
    },
    infoText: {
        textAlign: 'center',
        marginVertical: 20,
        color: '#666666',
        fontSize: 15,
    },
    // --- Modal Styles ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333333',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#C0C0C0',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalInputHalf: {
        width: '48%',
    },
    pickerContainerModal: {
        borderWidth: 1,
        borderColor: '#C0C0C0',
        borderRadius: 5,
        marginBottom: 15,
    },
    pickerStyleModal: {
        // height: 50,
    },
    modalButtonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
});

export default StockManagementScreen;

