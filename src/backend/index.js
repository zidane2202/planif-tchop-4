import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from backend directory, or use process.env (for Render)
dotenv.config({ path: join(__dirname, '.env') });

const app = express();

console.log('Current working directory:', process.cwd());



// CORS configuration - allow all origins in production, or specific ones
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' }));


// API Routes - must come before static file serving
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY);

// Handler principal du chatbot
app.post('/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_APIKEY) {
      console.error('ERREUR CRITIQUE: GEMINI_APIKEY non définie dans les variables d\'environnement');
      return res.status(500).json({ 
        response: "Configuration serveur incomplète : Clé API manquante.",
        error: "GEMINI_APIKEY_MISSING"
      });
    }

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(context);
    const response = result?.response?.text?.();

    let responseText = '';
    if (typeof response === 'string' && response.trim().length > 0) {
      responseText = response;
    } else {
      console.warn('Réponse IA vide ou non textuelle:', response);
      responseText = "Je n'ai pas pu générer de réponse compréhensible. Réessaie dans un instant.";
    }

    // Suggestions intelligentes
    const suggestions = generateSuggestions(userMessage, userIngredients, availableRecipes);
    console.log('Réponse IA finale (préfix 200 chars):', responseText.slice(0, 200));
    res.json({ response: responseText, suggestions });
  } catch (error) {
    console.error("Erreur chatbot détaillée:", error);
    // Return specific error message for debugging
    res.status(500).json({
      response: "Désolé, je rencontre des difficultés techniques.",
      message: error.message, // Helpful for client debugging
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

// Serve static files from the Expo web build (if it exists)
// Path: project root -> dist (Expo web export output)
import fs from 'fs';

// In production on Render, process.cwd() points to the project root where
// the Expo web export creates the "dist" folder. Using process.cwd() is
// therefore more reliable than walking up from __dirname.
const distPath = join(process.cwd(), 'dist');

// Check if dist folder exists (production build)
if (fs.existsSync(distPath)) {
  // Serve static files
  console.log('Serving static files from:', distPath);
  // Serve index.html for all non-API routes (SPA routing)
  // Serve static files
  app.use(express.static(distPath));


  // Use middleware for catch-all (Express 5 safe)
  app.use((req, res, next) => {
    // API protection
    if (req.path.startsWith('/chat') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'Not found' });
    }
    // Check if GET request
    if (req.method !== 'GET') {
      return next();
    }
    res.sendFile(join(distPath, 'index.html'));
  });

} else {

  // Development mode - just show API status
  app.get('/', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Planif-Tchop API is running (development mode - frontend not built)',
      timestamp: new Date().toISOString()
    });
  });
  console.log('Development mode: Frontend not built, serving API only');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Planif-Tchop server démarré sur le port', PORT);
  console.log(`API disponible sur http://localhost:${PORT}/chat`);
  console.log(`Frontend disponible sur http://localhost:${PORT}/`);
}); 