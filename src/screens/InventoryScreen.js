import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Platform,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    Button,
    ScrollView // Needed for Shopping List view
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../config/firebaseConfig';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    serverTimestamp,
    getDocs,
    getDoc
} from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { INGREDIENT_CATEGORIES } from '../utils/IngredientCategories';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/fr';
import EmailButton from '../components/common/EmailButton';

moment.locale('fr');

// --- Shared Constants & Helpers ---
const userId = 'user_test_id'; // Placeholder
const LOW_STOCK_THRESHOLD = 1;
const normalizeName = (name) => name ? name.trim().toLowerCase() : '';
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

// --- Main Inventory Screen Component ---
function InventoryScreen() {
    const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'shopping'

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header with title */}
                <View style={styles.headerContainer}>
                    <View style={styles.titleContainer}>
                        <FontAwesome 
                            name={activeTab === 'stock' ? 'cubes' : 'shopping-basket'} 
                            size={32} 
                            color={styles.ACCENT_RED} 
                        />
                        <Text style={styles.title}>
                            {activeTab === 'stock' ? 'Gestion du Stock' : 'Liste de Courses'}
                        </Text>
                    </View>
                    <EmailButton 
                        type={activeTab === 'stock' ? 'stock' : 'shopping'} 
                        style={styles.emailButton} 
                    />
                </View>

                {/* Tab navigation */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'stock' && styles.activeTab]}
                        onPress={() => setActiveTab('stock')}
                    >
                        <FontAwesome
                            name="cubes"
                            size={18}
                            color={activeTab === 'stock' ? '#fff' : styles.ACCENT_GREEN}
                        />
                        <Text style={[styles.tabText, activeTab === 'stock' && styles.activeTabText]}>
                            Stock
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'shopping' && styles.activeTab]}
                        onPress={() => setActiveTab('shopping')}
                    >
                        <FontAwesome
                            name="shopping-basket"
                            size={18}
                            color={activeTab === 'shopping' ? '#fff' : styles.ACCENT_GREEN}
                        />
                        <Text style={[styles.tabText, activeTab === 'shopping' && styles.activeTabText]}>
                            Liste de Courses
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content based on active tab */}
                <View style={styles.contentContainer}>
                    {activeTab === 'stock' ? <StockManagementView /> : <ShoppingListView />}
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- Stock Management View Component ---
function StockManagementView() {
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
    }, []);

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

    const renderCategorySection = ({ item: category }) => (
        <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <FlatList
                data={filteredStock()[category]}
                renderItem={renderStockItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false} // Important: disable scroll for nested FlatList
            />
        </View>
    );

    return (
        <View style={styles.contentView}> {/* Use View instead of SafeAreaView here */}
            <FlatList
                ListHeaderComponent={
                    <View style={styles.searchAddContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher un ingrédient..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={styles.TEXT_SECONDARY} // Ensure placeholder is visible
                        />
                        <TouchableOpacity onPress={openModalToAdd} style={styles.addButton}>
                            <FontAwesome name="plus" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
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
                ListFooterComponent={loading ? <ActivityIndicator size="large" color={styles.ACCENT_GREEN} style={{ marginVertical: 20 }} /> : null}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}

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
                            placeholderTextColor={styles.TEXT_SECONDARY}
                        />
                        <View style={styles.modalRow}>
                            <TextInput
                                style={[styles.modalInput, styles.modalInputHalf]}
                                placeholder="Quantité"
                                value={itemQuantity}
                                onChangeText={setItemQuantity}
                                keyboardType="numeric"
                                placeholderTextColor={styles.TEXT_SECONDARY}
                            />
                            <TextInput
                                style={[styles.modalInput, styles.modalInputHalf]}
                                placeholder="Unité (kg, g, L, unité...)"
                                value={itemUnit}
                                onChangeText={setItemUnit}
                                placeholderTextColor={styles.TEXT_SECONDARY}
                            />
                        </View>
                        {/* *** CORRECTION APPLIQUÉE ICI pour les OPTIONS *** */}
                        <View style={styles.pickerContainerModal}>
                            <Picker
                                selectedValue={itemCategory}
                                onValueChange={(itemValue) => setItemCategory(itemValue)}
                                style={styles.pickerStyleModal} // Style principal (couleur valeur sélectionnée + Android options)
                                itemStyle={styles.pickerItemStyleModal} // Style des options (surtout iOS)
                            >
                                {INGREDIENT_CATEGORIES.map((cat, index) => (
                                    cat !== "Sélectionner une catégorie" &&
                                    <Picker.Item
                                        key={index}
                                        label={cat}
                                        value={cat}
                                        // color="#333333" // Optionnel: Forcer couleur sur Item (peut aider sur certains Android)
                                    />
                                ))}
                            </Picker>
                        </View>
                        {/* *** FIN DE LA CORRECTION *** */}
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
        </View>
    );
}

// --- Shopping List View Component ---
function ShoppingListView() {
    const [startDate, setStartDate] = useState(moment().startOf('week').toDate());
    const [endDate, setEndDate] = useState(moment().endOf('week').toDate());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shoppingList, setShoppingList] = useState({});
    const [error, setError] = useState(null);

    const handleStartDateChange = (event, newDate) => {
        const currentDate = newDate || startDate;
        setShowStartDatePicker(Platform.OS === 'ios');
        setStartDate(currentDate);
        if (moment(currentDate).isAfter(endDate)) {
            setEndDate(moment(currentDate).endOf('week').toDate());
        }
    };

    const handleEndDateChange = (event, newDate) => {
        const currentDate = newDate || endDate;
        setShowEndDatePicker(Platform.OS === 'ios');
        if (moment(currentDate).isBefore(startDate)) {
            Alert.alert("Date invalide", "La date de fin ne peut pas être antérieure à la date de début.");
        } else {
            setEndDate(currentDate);
        }
    };

    const generateShoppingList = useCallback(async () => {
        setLoading(true);
        setError(null);
        setShoppingList({});
        const aggregatedIngredients = {}; // { 'ingredientName_unit': { name, quantity, unit, category, sources: [] } }
        const itemsToBuy = {}; // { 'category': [ { name, quantity, unit } ] }

        try {
            // 1. Get current stock
            const stockQuery = query(collection(db, 'userStock'), where('userId', '==', userId));
            const stockSnapshot = await getDocs(stockQuery);
            const stockItems = {};
            stockSnapshot.docs.forEach(doc => {
                const item = doc.data();
                const key = normalizeName(item.name) + '_' + item.unit.toLowerCase();
                stockItems[key] = {
                    id: doc.id,
                    ...item
                };
            });

            // 2. Get meal plans for the selected date range
            const mealPlansQuery = query(
                collection(db, 'mealPlans'),
                where('date', '>=', moment(startDate).format('YYYY-MM-DD')),
                where('date', '<=', moment(endDate).format('YYYY-MM-DD')),
                where('userId', '==', userId)
            );
            const mealPlansSnapshot = await getDocs(mealPlansQuery);
            const mealPlans = mealPlansSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 3. For each meal plan, get the dish and its ingredients
            for (const plan of mealPlans) {
                if (!plan.dishId) continue;

                const dishDoc = await getDoc(doc(db, 'dishes', plan.dishId));
                if (!dishDoc.exists()) continue;

                const dish = dishDoc.data();
                const servingsMultiplier = plan.servingsPlanned / (dish.servings || 1);

                // Process each ingredient
                (dish.ingredients || []).forEach(ingredient => {
                    const normalizedName = normalizeName(ingredient.name);
                    const normalizedUnit = ingredient.unit.toLowerCase();
                    const key = normalizedName + '_' + normalizedUnit;

                    // Calculate required quantity
                    const requiredQuantity = (ingredient.quantity || 0) * servingsMultiplier;

                    // Add to aggregated ingredients
                    if (!aggregatedIngredients[key]) {
                        aggregatedIngredients[key] = {
                            name: ingredient.name,
                            quantity: requiredQuantity,
                            unit: ingredient.unit,
                            category: ingredient.category || 'Autres',
                            sources: [{
                                dishName: dish.name,
                                planDate: plan.date,
                                mealType: plan.mealType,
                                quantity: requiredQuantity
                            }]
                        };
                    } else {
                        aggregatedIngredients[key].quantity += requiredQuantity;
                        aggregatedIngredients[key].sources.push({
                            dishName: dish.name,
                            planDate: plan.date,
                            mealType: plan.mealType,
                            quantity: requiredQuantity
                        });
                    }
                });
            }

            // 4. Compare with stock and create shopping list
            Object.keys(aggregatedIngredients).forEach(key => {
                const ingredient = aggregatedIngredients[key];
                const stockItem = stockItems[key];

                let neededQuantity = ingredient.quantity;
                if (stockItem) {
                    neededQuantity -= (stockItem.quantity || 0);
                }

                // Only add to shopping list if we need more than what's in stock
                if (neededQuantity > 0) {
                    const category = ingredient.category;
                    if (!itemsToBuy[category]) {
                        itemsToBuy[category] = [];
                    }
                    itemsToBuy[category].push({
                        name: ingredient.name,
                        quantity: neededQuantity,
                        unit: ingredient.unit,
                        sources: ingredient.sources
                    });
                }
            });

            // 5. Sort items in each category
            Object.keys(itemsToBuy).forEach(category => {
                itemsToBuy[category].sort((a, b) => a.name.localeCompare(b.name));
            });

            setShoppingList(itemsToBuy);
            setLoading(false);
        } catch (err) {
            console.error("Erreur génération liste courses:", err);
            setError("Impossible de générer la liste de courses: " + err.message);
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        generateShoppingList();
    }, [generateShoppingList]);

    const renderShoppingItem = ({ item }) => (
        <View style={styles.shoppingItem}>
            <View style={styles.shoppingItemInfo}>
                <Text style={styles.shoppingItemName}>{item.name}</Text>
                <Text style={styles.shoppingItemQuantity}>{item.quantity.toFixed(2)} {item.unit}</Text>
            </View>
            <View style={styles.shoppingItemSources}>
                {item.sources.map((source, index) => (
                    <Text key={index} style={styles.shoppingItemSource}>
                        • {source.dishName} ({moment(source.planDate).format('DD/MM')}, {source.mealType})
                    </Text>
                ))}
            </View>
        </View>
    );

    const renderCategorySection = ({ item: category }) => (
        <View style={styles.shoppingCategorySection}>
            <Text style={styles.shoppingCategoryTitle}>{category}</Text>
            <FlatList
                data={shoppingList[category]}
                renderItem={renderShoppingItem}
                keyExtractor={(item, index) => `${item.name}_${index}`}
                scrollEnabled={false}
            />
        </View>
    );

    return (
        <View style={styles.contentView}>
            <View style={styles.datePickerContainer}>
                <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>Du:</Text>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerButton}>
                        <FontAwesome name="calendar" size={16} color={styles.TEXT_SECONDARY} style={{ marginRight: 8 }} />
                        <Text style={styles.datePickerButtonText}>{moment(startDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={handleStartDateChange}
                        />
                    )}
                </View>
                <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>Au:</Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePickerButton}>
                        <FontAwesome name="calendar" size={16} color={styles.TEXT_SECONDARY} style={{ marginRight: 8 }} />
                        <Text style={styles.datePickerButtonText}>{moment(endDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={handleEndDateChange}
                        />
                    )}
                </View>
                <TouchableOpacity onPress={generateShoppingList} style={styles.generateButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <FontAwesome name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.generateButtonText}>Générer</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {loading ? (
                <ActivityIndicator size="large" color={styles.ACCENT_GREEN} style={{ marginVertical: 20 }} />
            ) : (
                <FlatList
                    data={Object.keys(shoppingList).sort()}
                    renderItem={renderCategorySection}
                    keyExtractor={(category) => category}
                    contentContainerStyle={styles.listContentContainer}
                    ListEmptyComponent={
                        <Text style={styles.infoText}>
                            Aucun article à acheter pour cette période ou aucun repas planifié.
                        </Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // --- Palette de Couleurs ---
    ACCENT_GREEN: '#007A5E',
    ACCENT_RED: '#CE1126',
    ACCENT_YELLOW: '#FCD116',
    ACCENT_YELLOW_DARK: '#E6B800', // Darker yellow for better contrast
    BACKGROUND_PRIMARY: '#FFFFFF',
    SCREEN_BACKGROUND: '#EEF7F4',
    BORDER_LIGHT: '#E0E0E0',
    BORDER_MEDIUM: '#C0C0C0',
    TEXT_PRIMARY: '#333333',
    TEXT_SECONDARY: '#666666',

    // --- Main Screen Styles ---
    safeArea: {
        flex: 1,
        backgroundColor: '#EEF7F4',
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    container: {
        flex: 1,
        backgroundColor: '#EEF7F4',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#333333',
        textShadowColor: 'rgba(0, 0, 0, 0.05)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    emailButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#007A5E',
    },
    tabText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#007A5E',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },

    // --- Shared Content View Styles ---
    contentView: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    errorText: {
        color: '#dc3545',
        textAlign: 'center',
        margin: 15,
        fontSize: 16,
    },
    infoText: {
        textAlign: 'center',
        margin: 20,
        fontSize: 16,
        color: '#666',
    },
    listContentContainer: {
        paddingBottom: 20,
    },

    // --- Stock Management Styles ---
    searchAddContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#FFFFFF',
    },
    searchInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#f8f9fa',
        borderRadius: 5,
        paddingHorizontal: 15,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: '#333333',
    },
    addButton: {
        width: 40,
        height: 40,
        backgroundColor: '#007A5E',
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categorySection: {
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333333',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingBottom: 5,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    itemOutOfStock: {
        backgroundColor: '#ffebee',
        borderColor: '#ffcdd2',
    },
    itemLowStock: {
        backgroundColor: '#fff8e1',
        borderColor: '#ffecb3',
    },
    statusIcon: {
        marginRight: 10,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333333',
    },
    itemNameOutOfStock: {
        color: '#b71c1c',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#666666',
        marginTop: 2,
    },
    itemQuantityOutOfStock: {
        color: '#b71c1c',
    },
    itemQuantityLowStock: {
        color: '#f57f17',
    },
    itemActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 5,
    },

    // --- Modal Styles ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333333',
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#f8f9fa',
        color: '#333333',
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
        borderColor: '#E0E0E0',
        borderRadius: 5,
        marginBottom: 15,
        backgroundColor: '#f8f9fa',
    },
    pickerStyleModal: {
        color: '#333333',
    },
    pickerItemStyleModal: {
        color: '#333333',
    },
    modalButtonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },

    // --- Shopping List Styles ---
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    datePickerGroup: {
        flex: 1,
        marginRight: 10,
    },
    datePickerLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 5,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 5,
        padding: 8,
    },
    datePickerButtonText: {
        fontSize: 14,
        color: '#333333',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007A5E',
        borderRadius: 5,
        padding: 10,
        marginLeft: 5,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    shoppingCategorySection: {
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    shoppingCategoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333333',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingBottom: 5,
    },
    shoppingItem: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    shoppingItemInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    shoppingItemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333333',
    },
    shoppingItemQuantity: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007A5E',
    },
    shoppingItemSources: {
        marginTop: 5,
    },
    shoppingItemSource: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 2,
    },
});

export default InventoryScreen;

