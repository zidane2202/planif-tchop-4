import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { db } from '../../config/firebaseConfig'; // Assurez-vous que le chemin est correct
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    deleteDoc,
    serverTimestamp,
    onSnapshot,
    runTransaction, // Import runTransaction
    updateDoc, // Import updateDoc for marking as prepared
    getDoc // Import getDoc
} from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import 'moment/locale/fr';
import EmailButton from '../common/EmailButton';

moment.locale('fr');

const MEAL_TYPES = [
    'Petit-déjeuner',
    'Déjeuner',
    'Dîner',
    'Collation',
    'Brunch',
];

// Placeholder User ID - Replace with actual authenticated user ID
const userId = 'user_test_id';

function MealPlanner() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState(MEAL_TYPES[0]);
    const [selectedDishId, setSelectedDishId] = useState('');
    const [servingsPlanned, setServingsPlanned] = useState('');
    const [dishes, setDishes] = useState([]);
    const [mealPlans, setMealPlans] = useState([]);
    const [loadingDishes, setLoadingDishes] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingPrepare, setLoadingPrepare] = useState({}); // Track loading state for each plan
    const [error, setError] = useState(null);

    // Charger les plats disponibles
    useEffect(() => {
        setLoadingDishes(true);
        const dishesCol = collection(db, 'dishes');
        const unsubscribe = onSnapshot(dishesCol, (snapshot) => {
            const dishesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDishes(dishesList);
            if (dishesList.length > 0 && !selectedDishId) {
                setSelectedDishId(dishesList[0].id);
            }
            setLoadingDishes(false);
        }, (err) => {
            console.error("Erreur chargement plats:", err);
            setError("Impossible de charger les plats.");
            setLoadingDishes(false);
        });
        return () => unsubscribe();
    }, []);

    // Charger les plans de repas pour la semaine sélectionnée
    useEffect(() => {
        // Ne pas charger les plans si les plats ne sont pas encore chargés
        // Sauf si le chargement des plats est terminé (même s'il n'y a pas de plats)
        if (loadingDishes) return;

        setLoadingPlans(true);
        const startOfWeek = moment(selectedDate).startOf('week').toDate();
        const endOfWeek = moment(selectedDate).endOf('week').toDate();

        const q = query(
            collection(db, 'mealPlans'),
            where('date', '>=', moment(startOfWeek).format('YYYY-MM-DD')),
            where('date', '<=', moment(endOfWeek).format('YYYY-MM-DD')),
            where('userId', '==', userId) // Filter by user ID
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Associer les détails du plat SEULEMENT si les plats sont chargés
            const plansWithDishes = plans.map(plan => {
                const dishDetail = dishes.find(dish => dish.id === plan.dishId);
                return { ...plan, dish: dishDetail }; // dish peut être undefined si plat supprimé ou non trouvé
            }).sort((a, b) => {
                // Trier d'abord par date, puis par type de repas
                const dateDiff = moment(a.date).diff(moment(b.date));
                if (dateDiff !== 0) return dateDiff;
                return MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType);
            });
            setMealPlans(plansWithDishes);
            setLoadingPlans(false);
            setError(null);
        }, (err) => {
            console.error("Erreur chargement plans:", err);
            // Vérifier si l'erreur est due à un index manquant
            if (err.code === 'failed-precondition') {
                setError("Index Firebase manquant. Veuillez créer l'index requis dans votre console Firebase.");
                // Ici, vous pourriez afficher des instructions plus précises pour l'index
                console.log("Index manquant probable pour la collection 'mealPlans' sur les champs 'userId', 'date'.");
            } else {
                setError("Impossible de charger le planning.");
            }
            setLoadingPlans(false);
        });

        return () => unsubscribe();
    }, [selectedDate, dishes, loadingDishes]); // Re-exécuter si la date ou les plats changent

    const handleDateChange = (event, newDate) => {
        const currentDate = newDate || selectedDate;
        // Ne cache pas le picker sur iOS, il se ferme tout seul
        setShowDatePicker(Platform.OS === 'ios');
        setSelectedDate(currentDate);
    };

    const handleAddMealPlan = async () => {
        setError(null);
        if (!selectedDishId || !servingsPlanned || parseInt(servingsPlanned) <= 0) {
            setError("Sélectionnez un plat et un nombre de portions valide.");
            return;
        }

        setLoadingSubmit(true);
        try {
            const newMealPlan = {
                userId: userId,
                date: moment(selectedDate).format('YYYY-MM-DD'),
                mealType: selectedMealType,
                dishId: selectedDishId,
                servingsPlanned: parseInt(servingsPlanned),
                prepared: false, // Initial status
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'mealPlans'), newMealPlan);
            Alert.alert('Succès', 'Repas planifié avec succès !');
            setServingsPlanned(''); // Reset servings input
        } catch (err) {
            console.error("Erreur planification repas:", err);
            setError("Erreur lors de la planification.");
            Alert.alert("Erreur", "Impossible de planifier le repas.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleDeleteMealPlan = (id) => {
        Alert.alert(
            "Confirmer suppression",
            "Supprimer ce repas planifié ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'mealPlans', id));
                            // UI updates via onSnapshot
                        } catch (err) {
                            console.error("Erreur suppression plan:", err);
                            Alert.alert("Erreur", "Impossible de supprimer le plan.");
                        }
                    },
                },
            ]
        );
    };

    // --- Fonction pour marquer un repas comme préparé (SANS déduction de stock pour l'instant) ---
    // La logique de stock est complexe et sera ajoutée dans une étape ultérieure
    const handleMarkMealAsPrepared = useCallback(async (plan) => {
        if (!plan || plan.prepared) {
            // Alert.alert("Info", "Ce repas est déjà marqué comme préparé.");
            return; // Ne rien faire si déjà préparé
        }

        setLoadingPrepare(prev => ({ ...prev, [plan.id]: true }));

        try {
            const planRef = doc(db, 'mealPlans', plan.id);
            await updateDoc(planRef, {
                 prepared: true,
                 preparedAt: serverTimestamp()
            });
            // Alert.alert("Succès", "Repas marqué comme préparé."); // Optionnel, l'UI se met à jour
        } catch (error) {
            console.error("Erreur lors du marquage du repas:", error);
            Alert.alert("Erreur", `Impossible de marquer le repas comme préparé : ${error.message}`);
        } finally {
            setLoadingPrepare(prev => ({ ...prev, [plan.id]: false }));
        }
    }, []); // Pas de dépendances pour l'instant
    // --- Fin de la fonction de préparation ---

    // Regrouper les plans par date pour l'affichage
    const groupedMealPlans = mealPlans.reduce((acc, plan) => {
        const date = moment(plan.date).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(plan);
        // Le tri est déjà fait dans useEffect
        return acc;
    }, {});

    // Générer les jours de la semaine à afficher
    const daysOfWeek = Array.from({ length: 7 }, (_, i) =>
        moment(selectedDate).startOf('week').add(i, 'days')
    );

    function getPlanningText() {
      const weekStart = moment(selectedDate).startOf('week');
      const weekEnd = moment(selectedDate).endOf('week');
      let text = `Planning de la semaine (${weekStart.format('DD MMM')} - ${weekEnd.format('DD MMM')}) :\n\n`;
      daysOfWeek.forEach(day => {
        const dayStr = day.format('YYYY-MM-DD');
        const plansForDay = groupedMealPlans[dayStr] || [];
        text += `${day.format('dddd DD')} :\n`;
        if (plansForDay.length > 0) {
          plansForDay.forEach(plan => {
            text += `- ${plan.mealType} : ${plan.dish ? plan.dish.name : 'Plat supprimé'} (${plan.servingsPlanned}p)\n`;
          });
        } else {
          text += `- Rien de prévu\n`;
        }
        text += '\n';
      });
      return text;
    }

    // --- Composant Header pour la FlatList (Formulaire + Titre Planning) ---
    const renderListHeader = () => (
        <View style={styles.headerFooterContainer}>
            <Text style={styles.sectionTitle}><FontAwesome name="calendar-plus-o" size={20} color={styles.TEXT_PRIMARY} /> Planifier un Repas</Text>

            {/* Affichage de l'erreur globale */} 
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Formulaire d'ajout */} 
            <View style={styles.formContainer}>
                {/* Date Picker */} 
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Date:</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                        <FontAwesome name="calendar" size={16} color={styles.TEXT_SECONDARY} style={{ marginRight: 8 }} />
                        <Text style={styles.dateButtonText}>{moment(selectedDate).format('dddd DD MMMM YYYY')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={selectedDate}
                            mode={'date'}
                            is24Hour={true}
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </View>

                {/* Meal Type Picker */} 
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Type de Repas:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedMealType}
                            onValueChange={(itemValue) => setSelectedMealType(itemValue)}
                            style={styles.picker} // Style appliqué au Picker lui-même
                            itemStyle={styles.pickerItem} // Style pour les items (peut ne pas fonctionner partout)
                        >
                            {MEAL_TYPES.map((type) => (
                                <Picker.Item key={type} label={type} value={type} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Dish Picker */} 
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Plat:</Text>
                    {loadingDishes ? (
                        <ActivityIndicator color={styles.ACCENT_GREEN} />
                    ) : dishes.length > 0 ? (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedDishId}
                                onValueChange={(itemValue) => setSelectedDishId(itemValue)}
                                style={styles.picker}
                                itemStyle={styles.pickerItem}
                                enabled={dishes.length > 0}
                            >
                                {dishes.map((dish) => (
                                    <Picker.Item key={dish.id} label={dish.name} value={dish.id} />
                                ))}
                            </Picker>
                        </View>
                    ) : (
                        <Text style={styles.infoText}>Aucun plat disponible. Ajoutez des plats via l'onglet 'Gestion des Plats'.</Text>
                    )}
                </View>

                {/* Servings Input */} 
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Portions Prévues:</Text>
                    <TextInput
                        style={styles.input}
                        value={servingsPlanned}
                        onChangeText={setServingsPlanned}
                        placeholder="Ex: 4"
                        keyboardType="numeric"
                    />
                </View>

                {/* Submit Button */} 
                <TouchableOpacity
                    style={[styles.submitButton, (loadingSubmit || dishes.length === 0) && styles.submitButtonDisabled]}
                    onPress={handleAddMealPlan}
                    disabled={loadingSubmit || dishes.length === 0}
                >
                    {loadingSubmit ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}><FontAwesome name="plus" size={16} /> Planifier</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Titre pour la section planning */} 
            <Text style={styles.sectionTitle}><FontAwesome name="calendar" size={20} color={styles.TEXT_PRIMARY} /> Planning de la semaine</Text>
            <Text style={styles.weekRangeText}>
                ({moment(selectedDate).startOf('week').format('DD MMM')} - {moment(selectedDate).endOf('week').format('DD MMM')})
            </Text>

            {/* Indicateur de chargement pour les plans */} 
            {loadingPlans && <ActivityIndicator size="large" color={styles.ACCENT_GREEN} style={{ marginVertical: 20 }} />}
        </View>
    );

    // --- Composant pour afficher un jour dans la FlatList ---
    const renderDayItem = ({ item: day }) => {
        const dayStr = day.format('YYYY-MM-DD');
        const plansForDay = groupedMealPlans[dayStr] || [];
        return (
            <View style={styles.dayCard}>
                <Text style={styles.dayTitle}>{day.format('dddd DD')}</Text>
                {plansForDay.length > 0 ? (
                    plansForDay.map((plan) => (
                        <View key={plan.id} style={[styles.mealItem, plan.prepared && styles.mealItemPrepared]}>
                            {/* Informations sur le repas */} 
                            <View style={styles.mealInfo}>
                                <Text style={styles.mealType}>{plan.mealType}:</Text>
                                <Text style={styles.mealDish}>
                                    {plan.dish ? plan.dish.name : 'Plat Supprimé'} ({plan.servingsPlanned}p)
                                </Text>
                                {plan.prepared && (
                                    <Text style={styles.preparedText}>
                                        <FontAwesome name="check-circle" size={12} color={styles.ACCENT_GREEN} /> Préparé
                                    </Text>
                                )}
                            </View>

                            {/* Actions sur le repas */} 
                            <View style={styles.mealActions}>
                                {/* Bouton Préparer */} 
                                {!plan.prepared && (
                                    <TouchableOpacity
                                        style={styles.prepareButton}
                                        onPress={() => handleMarkMealAsPrepared(plan)}
                                        disabled={loadingPrepare[plan.id]}
                                    >
                                        {loadingPrepare[plan.id] ? (
                                            <ActivityIndicator size="small" color={styles.ACCENT_GREEN} />
                                        ) : (
                                            <FontAwesome name="check-square-o" size={22} color={styles.ACCENT_GREEN} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                {/* Bouton Supprimer */} 
                                <TouchableOpacity onPress={() => handleDeleteMealPlan(plan.id)} style={styles.deleteButton}>
                                    <FontAwesome name="trash" size={20} color={styles.ACCENT_RED} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noMealText}>Rien de prévu</Text>
                )}
            </View>
        );
    };

    // --- Rendu principal avec FlatList ---
    return (
        <>
            <FlatList
                style={styles.container} // Style du conteneur FlatList
                data={daysOfWeek} // Données : les jours de la semaine
                keyExtractor={(day) => day.format('YYYY-MM-DD')}
                ListHeaderComponent={renderListHeader} // Formulaire et titres
                renderItem={renderDayItem} // Affichage de chaque jour
                ListEmptyComponent={ // S'affiche si daysOfWeek est vide (ne devrait pas arriver)
                    !loadingPlans && mealPlans.length === 0 && !error ? (
                        // Affiche ce message seulement si pas en chargement, pas d'erreur, et pas de plans
                        <View style={styles.headerFooterContainer}>
                            <Text style={styles.infoText}>Aucun repas planifié pour cette semaine.</Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={styles.listContentContainer} // Style pour le contenu interne
            />
            <View style={{padding: 16, alignItems: 'center'}}>
                <EmailButton message={getPlanningText()} />
            </View>
        </>
    );
}

// --- Styles --- (Inspirés des documents fournis, couleurs de pasted_content_2.txt)
const styles = StyleSheet.create({
    // --- Palette (extraite de pasted_content_2.txt et complétée) ---
    ACCENT_GREEN: '#007A5E',       // Vert principal
    ACCENT_RED: '#CE1126',         // Rouge principal
    ACCENT_BLUE: '#007bff',        // Bleu pour les boutons/liens (vu dans pasted_content_2)
    BACKGROUND_PRIMARY: '#FFFFFF',    // Fond blanc pour cartes/formulaires
    BACKGROUND_SECONDARY: '#f8f9fa', // Fond gris clair pour l'écran (vu dans pasted_content_2)
    BACKGROUND_PREPARED: '#e9f5e9', // Fond vert clair pour repas préparés (vu dans pasted_content_2)
    BORDER_LIGHT: '#ced4da',        // Bordure claire pour inputs/pickers (vu dans pasted_content_2)
    TEXT_PRIMARY: '#343a40',         // Texte principal sombre (vu dans pasted_content_2)
    TEXT_SECONDARY: '#6c757d',      // Texte secondaire gris (vu dans pasted_content_2)
    TEXT_WHITE: '#FFFFFF',           // Texte blanc
    TEXT_PLACEHOLDER: '#6c757d',    // Couleur Placeholder
    TEXT_LINK: '#007bff',           // Couleur Lien/Titre Jour
    TEXT_ERROR: '#dc3545',         // Rouge pour erreurs (cohérent avec ACCENT_RED)
    TEXT_SUCCESS: '#007A5E',       // Vert pour succès (cohérent avec ACCENT_GREEN)

    // --- Styles Généraux ---
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // BACKGROUND_SECONDARY
    },
    headerFooterContainer: {
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    listContentContainer: {
        paddingBottom: 30, // Plus d'espace en bas
    },
    sectionTitle: {
        fontSize: 22, // Plus grand
        fontWeight: '600', // Semi-bold
        marginBottom: 20,
        marginTop: 15,
        color: '#343a40', // TEXT_PRIMARY
        textAlign: 'center',
    },
    weekRangeText: {
        textAlign: 'center',
        fontSize: 15,
        color: '#6c757d', // TEXT_SECONDARY
        marginBottom: 25,
    },
    errorText: {
        color: '#dc3545', // TEXT_ERROR
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
        padding: 10,
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        borderWidth: 1,
        borderRadius: 5,
        marginHorizontal: 10, // Pour ne pas coller aux bords
    },
    infoText: {
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        color: '#6c757d', // TEXT_SECONDARY
        fontSize: 14,
        paddingHorizontal: 15,
    },

    // --- Formulaire --- 
    formContainer: {
        backgroundColor: '#FFFFFF', // BACKGROUND_PRIMARY
        padding: 20,
        borderRadius: 10, // Plus arrondi
        marginBottom: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e9ecef', // Bordure très légère
    },
    formGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#495057', // Un peu plus foncé que TEXT_SECONDARY
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ced4da', // BORDER_LIGHT
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#343a40', // TEXT_PRIMARY
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ced4da', // BORDER_LIGHT
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        // La hauteur est gérée par le contenu du Picker
    },
    picker: {
        width: '100%',
        height: Platform.OS === 'ios' ? undefined : 50, // Hauteur fixe sur Android si nécessaire
        color: '#343a40', // Couleur du texte sélectionné
    },
    pickerItem: {
        // Style des items dans le Picker (peut avoir un support limité)
        fontSize: 16,
        color: '#343a40',
    },
    dateButton: {
        flexDirection: 'row', // Pour icône et texte
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ced4da', // BORDER_LIGHT
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#495057',
        marginLeft: 8, // Espace après l'icône
    },
    submitButton: {
        backgroundColor: '#007A5E', // ACCENT_GREEN
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    submitButtonDisabled: {
        backgroundColor: '#a1a1a1', // Gris plus clair pour désactivé
        elevation: 0,
    },
    submitButtonText: {
        color: '#FFFFFF', // TEXT_WHITE
        fontSize: 17,
        fontWeight: 'bold',
    },

    // --- Liste des Jours/Repas --- 
    dayCard: {
        backgroundColor: '#FFFFFF', // BACKGROUND_PRIMARY
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        marginHorizontal: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 5, // Bordure latérale pour accent
        borderLeftColor: '#007A5E', // ACCENT_GREEN
    },
    dayTitle: {
        fontSize: 18, // Plus grand
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#007A5E', // ACCENT_GREEN
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    mealItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    mealItemPrepared: {
        backgroundColor: '#e9f5e9', // BACKGROUND_PREPARED
        // opacity: 0.8, // On peut utiliser un fond léger plutôt que l'opacité
        borderRadius: 5, // Léger arrondi pour le fond
        marginHorizontal: -5, // Compenser le padding de la carte
        paddingHorizontal: 5, // Remettre le padding interne
    },
    mealInfo: {
        flex: 1,
        marginRight: 10,
    },
    mealType: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#343a40', // TEXT_PRIMARY
        marginBottom: 3,
    },
    mealDish: {
        fontSize: 15,
        color: '#495057',
    },
    preparedText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#007A5E', // TEXT_SUCCESS
        marginTop: 4,
    },
    mealActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    prepareButton: {
        padding: 8, // Zone cliquable plus grande
        marginRight: 12, // Espace entre les boutons
    },
    deleteButton: {
        padding: 8, // Zone cliquable plus grande
    },
    noMealText: {
        fontSize: 14,
        color: '#6c757d', // TEXT_SECONDARY
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 15,
    },
});

export default MealPlanner;

