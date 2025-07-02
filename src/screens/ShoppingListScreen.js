import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView // Keep ScrollView for the overall screen layout
} from 'react-native';
import { db } from '../config/firebaseConfig'; // Adapter le chemin
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/fr';
import * as FileSystem from 'expo-file-system';

moment.locale('fr');

// Helper function to normalize ingredient names (lowercase, trim)
const normalizeName = (name) => name ? name.trim().toLowerCase() : '';

// Placeholder User ID - Replace with actual authenticated user ID
const userId = 'user_test_id';

function ShoppingListScreen() {
    const [startDate, setStartDate] = useState(moment().startOf('week').toDate());
    const [endDate, setEndDate] = useState(moment().endOf('week').toDate());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shoppingList, setShoppingList] = useState({}); // Object grouped by category
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
        const aggregatedIngredients = {}; // Key: 'normalizedName_unit', Value: { name, quantity, unit, category }
        const itemsToBuy = {}; // Key: 'normalizedName_unit', Value: { name, quantityToBuy, unit, category }

        try {
            // 1. Fetch user's current stock
            const stockQuery = query(collection(db, 'userStock'), where('userId', '==', userId));
            const stockSnapshot = await getDocs(stockQuery);
            const currentStock = stockSnapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                const normalizedName = normalizeName(data.name);
                const unit = data.unit ? data.unit.trim() : '';
                const key = `${normalizedName}_${unit}`;
                acc[key] = { ...data, id: doc.id }; // Store full stock item data
                return acc;
            }, {});

            // 2. Fetch meal plans for the selected date range
            const plansQuery = query(
                collection(db, 'mealPlans'),
                where('userId', '==', userId),
                where('date', '>=', moment(startDate).format('YYYY-MM-DD')),
                where('date', '<=', moment(endDate).format('YYYY-MM-DD')),
                where('prepared', '==', false) // Only consider unprepared meals
            );
            const plansSnapshot = await getDocs(plansQuery);
            const mealPlans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (mealPlans.length === 0) {
                setError("Aucun repas non préparé trouvé pour cette période.");
                setLoading(false);
                return;
            }

            // 3. Get unique dish IDs
            const dishIds = [...new Set(mealPlans.map(plan => plan.dishId))];

            // 4. Fetch details for all required dishes
            const dishPromises = dishIds.map(id => getDoc(doc(db, 'dishes', id)));
            const dishSnapshots = await Promise.all(dishPromises);
            const dishesMap = dishSnapshots.reduce((acc, docSnap) => {
                if (docSnap.exists()) {
                    acc[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
                }
                return acc;
            }, {});

            // 5. Aggregate required ingredients
            mealPlans.forEach(plan => {
                const dish = dishesMap[plan.dishId];
                if (!dish || !dish.ingredients || dish.ingredients.length === 0) return;

                const baseServings = dish.servings > 0 ? dish.servings : 1;
                const plannedServings = plan.servingsPlanned > 0 ? plan.servingsPlanned : 1;
                const multiplier = plannedServings / baseServings;

                dish.ingredients.forEach(ingredient => {
                    if (!ingredient.name || !ingredient.quantity || !ingredient.unit || !ingredient.category) return;

                    const requiredQuantity = ingredient.quantity * multiplier;
                    const normalizedName = normalizeName(ingredient.name);
                    const unit = ingredient.unit.trim();
                    const key = `${normalizedName}_${unit}`;

                    if (aggregatedIngredients[key]) {
                        aggregatedIngredients[key].quantity += requiredQuantity;
                    } else {
                        aggregatedIngredients[key] = {
                            name: ingredient.name.trim(),
                            quantity: requiredQuantity,
                            unit: unit,
                            category: ingredient.category || 'Autres'
                        };
                    }
                });
            });

            // 6. Compare required ingredients with current stock
            Object.values(aggregatedIngredients).forEach(requiredItem => {
                const normalizedName = normalizeName(requiredItem.name);
                const unit = requiredItem.unit;
                const key = `${normalizedName}_${unit}`;
                const stockItem = currentStock[key];
                const stockQuantity = stockItem ? (stockItem.quantity || 0) : 0;

                const quantityNeeded = requiredItem.quantity - stockQuantity;

                if (quantityNeeded > 0) {
                    // Only add if we need to buy some
                    itemsToBuy[key] = {
                        name: requiredItem.name,
                        quantityToBuy: quantityNeeded,
                        unit: unit,
                        category: requiredItem.category
                    };
                }
                 // Optional: Log unit mismatches if stockItem exists but unit differs
                 if (stockItem && stockItem.unit !== unit) {
                     console.warn(`Unit mismatch for ${requiredItem.name}: Stock (${stockItem.unit}) vs Required (${unit}). Cannot compare quantities accurately.`);
                     // Decide how to handle this - maybe add to list regardless, or show a warning?
                     // For now, we ignore the stock if units mismatch and add the full required amount.
                     itemsToBuy[key] = {
                         name: requiredItem.name,
                         quantityToBuy: requiredItem.quantity, // Add full required amount if units mismatch
                         unit: unit,
                         category: requiredItem.category,
                         warning: `Unités différentes (Stock: ${stockItem.unit})`
                     };
                 }
            });

            // 7. Group items to buy by category
            const groupedList = Object.values(itemsToBuy).reduce((acc, item) => {
                const category = item.category;
                if (!acc[category]) {
                    acc[category] = [];
                }
                item.displayQuantity = parseFloat(item.quantityToBuy.toFixed(2));
                acc[category].push(item);
                return acc;
            }, {});

            // Sort categories and items within categories
            const sortedGroupedList = {};
            Object.keys(groupedList).sort().forEach(category => {
                sortedGroupedList[category] = groupedList[category].sort((a, b) => a.name.localeCompare(b.name));
            });

            if (Object.keys(sortedGroupedList).length === 0 && mealPlans.length > 0) {
                 setError("Tous les ingrédients nécessaires sont déjà en stock !");
            } else {
                 setShoppingList(sortedGroupedList);
            }

        } catch (err) {
            console.error("Erreur lors de la génération de la liste:", err);
            setError("Une erreur est survenue lors de la génération de la liste.");
            Alert.alert("Erreur", "Impossible de générer la liste de courses.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, userId]); // Add userId dependency

    return (
        // Use ScrollView for the overall screen layout as FlatList is used inside for categories
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}><FontAwesome name="shopping-cart" size={24} /> Liste de Courses</Text>

            {/* Date Range Selection */}
            <View style={styles.dateSelectionContainer}>
                <View style={styles.datePickerGroup}>
                    <Text style={styles.label}>Du:</Text>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
                        <Text style={styles.dateButtonText}>{moment(startDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode={'date'}
                            display="default"
                            onChange={handleStartDateChange}
                        />
                    )}
                </View>
                <View style={styles.datePickerGroup}>
                    <Text style={styles.label}>Au:</Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
                        <Text style={styles.dateButtonText}>{moment(endDate).format('DD/MM/YYYY')}</Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate}
                            mode={'date'}
                            display="default"
                            minimumDate={startDate}
                            onChange={handleEndDateChange}
                        />
                    )}
                </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
                style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                onPress={generateShoppingList}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.generateButtonText}><FontAwesome name="refresh" /> Générer la Liste</Text>
                )}
            </TouchableOpacity>

            {/* Display Shopping List */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {!loading && Object.keys(shoppingList).length === 0 && !error && (
                <Text style={styles.infoText}>Cliquez sur "Générer la Liste" pour voir les ingrédients à acheter (en fonction du stock).</Text>
            )}

            {Object.keys(shoppingList).map(category => (
                <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    {shoppingList[category].map((item, index) => (
                        <View key={`${item.name}_${item.unit}_${index}`} style={styles.listItem}>
                            <Text style={styles.itemText}>
                                <FontAwesome name="square-o" size={16} color="#6c757d" /> {/* Basic Checkbox Placeholder */}
                                {' '}{item.displayQuantity} {item.unit} {item.name}
                            </Text>
                            {item.warning && <Text style={styles.warningText}>{item.warning}</Text>}
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContentContainer: { // Added for ScrollView padding
        padding: 15,
        paddingBottom: 30, // Ensure space at the bottom
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#343a40',
    },
    dateSelectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 1,
    },
    datePickerGroup: {
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 5,
    },
    dateButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 5,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#007bff',
    },
    generateButton: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 20,
    },
    generateButtonDisabled: {
        backgroundColor: '#6c757d',
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
    },
    infoText: {
        textAlign: 'center',
        marginVertical: 20,
        color: '#6c757d',
        fontSize: 15,
    },
    categorySection: {
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        elevation: 1,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007bff',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    listItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemText: {
        fontSize: 16,
        color: '#495057',
    },
    warningText: {
        fontSize: 12,
        color: '#fd7e14', // Orange color for warnings
        fontStyle: 'italic',
        marginLeft: 20, // Indent warning
        marginTop: 2,
    },
});

export default ShoppingListScreen;

