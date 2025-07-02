import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY);

// Handler principal du chatbot
app.post('/chat', async (req, res) => {
  try {
    const { userDishes = [], userIngredients = [], availableRecipes = [], mealPlans = [], familyMembers = [], userMessage = "" } = req.body;
    console.log('Données reçues:', {
      userDishes: userDishes.length,
      userIngredients: userIngredients.length,
      availableRecipes: availableRecipes.length,
      mealPlans: mealPlans.length,
      familyMembers: familyMembers.length
    });
    // Préparer le contexte pour l'IA
    const context = `
Tu es un assistant culinaire spécialisé dans la cuisine camerounaise et internationale. 
Tu as accès aux données suivantes de l'utilisateur :

PLATS DE L'UTILISATEUR (${userDishes.length} plats) :
${userDishes.map((dish) => `- ${dish.name} (${dish.type}, ${dish.prepTime}min) : ${dish.ingredients?.map((ing) => ing.name).join(", ")}`).join("\n")}

INGRÉDIENTS DISPONIBLES (${userIngredients.length} ingrédients) :
${userIngredients.map((ing) => `- ${ing.name} : ${ing.quantity} ${ing.unit} (expire: ${ing.expirationDate || "N/A"})`).join("\n")}

RECETTES DISPONIBLES (${availableRecipes.length} recettes) :
${availableRecipes.slice(0, 20).map((recipe) => `- ${recipe.name} (${recipe.type}) : ${recipe.ingredients?.map((ing) => ing.name).join(", ")}`).join("\n")}

PLANNING DES REPAS (${mealPlans.length} éléments) :
${mealPlans.slice(0, 20).map(plan => `- ${plan.date} : ${plan.mealType} - ${plan.dishName || plan.dishId || ''}`).join('\n')}

FAMILLE (${familyMembers.length} membres) :
${familyMembers.map(m => `- ${m.name || m.prenom || ''} (${m.role || ''})`).join('\n')}

RÈGLES :
1. Réponds en français
2. Formate ta réponse en Markdown (titres, listes, gras, etc.)
3. Sois créatif et propose des recettes adaptées aux ingrédients disponibles
4. Mentionne les recettes camerounaises quand c'est pertinent
5. Donne des conseils pratiques de cuisine
6. Si l'utilisateur demande une recette spécifique, adapte-la aux ingrédients disponibles
7. Propose des alternatives si certains ingrédients manquent
8. Mentionne les temps de préparation
9. Donne des conseils nutritionnels quand approprié

MESSAGE DE L'UTILISATEUR : "${userMessage}"
`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(context);
    const response = result.response.text();
    // Suggestions intelligentes
    const suggestions = generateSuggestions(userMessage, userIngredients, availableRecipes);
    res.json({ response, suggestions });
  } catch (error) {
    console.error("Erreur chatbot:", error);
    res.status(500).json({
      response: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard.",
      suggestions: [],
    });
  }
});

function generateSuggestions(userMessage, userIngredients, availableRecipes) {
  const suggestions = [];
  // Suggestions basées sur les ingrédients qui expirent bientôt
  const expiringIngredients = userIngredients.filter((ing) => {
    if (!ing.expirationDate) return false;
    const expDate = new Date(ing.expirationDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });
  if (expiringIngredients.length > 0) {
    suggestions.push(`Que puis-je faire avec ${expiringIngredients[0].name} qui expire bientôt ?`);
  }
  // Suggestions de recettes populaires
  const popularRecipes = availableRecipes
    .filter(
      (recipe) =>
        recipe.name.toLowerCase().includes("ndolé") ||
        recipe.name.toLowerCase().includes("poulet") ||
        recipe.name.toLowerCase().includes("poisson")
    )
    .slice(0, 2);
  popularRecipes.forEach((recipe) => {
    suggestions.push(`Comment préparer ${recipe.name} ?`);
  });
  // Suggestions générales

  return suggestions.slice(0, 3);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('API Gemini démarrée sur le port', PORT)); 