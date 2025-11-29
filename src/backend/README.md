# Planif-Tchop - Full Stack Deployment

This project includes both the frontend (Expo/React Native) and backend (Node.js/Express) API.

## Local Development

### Backend Only

1. Navigate to backend directory:
```bash
cd src/backend
npm install
```

2. Create a `.env` file in `src/backend/`:
```
GEMINI_APIKEY=your_gemini_api_key_here
PORT=3001
CORS_ORIGIN=*
```

3. Start the backend server:
```bash
npm start
```

The server will run on `http://localhost:3001`

### Frontend Only

1. Install dependencies:
```bash
npm install
```

2. Start Expo:
```bash
npm start
```

### Full Stack (Backend + Frontend)

1. Install all dependencies:
```bash
npm install
cd src/backend && npm install && cd ../..
```

2. Build frontend for web:
```bash
npm run build:web
```

3. Start backend (which will serve the frontend):
```bash
npm run start:prod
```

## Deployment on Render (Full Stack)

The project is configured to deploy both frontend and backend together on Render.

### Using render.yaml (Recommended)

1. **Push your code to GitHub**
2. **Go to [Render Dashboard](https://dashboard.render.com)**
3. **Click "New +" → "Blueprint"**
4. **Connect your repository** - Render will automatically detect `render.yaml`
5. **Review the configuration** and click "Apply"
6. **Set Environment Variables** in Render dashboard:
   - `GEMINI_APIKEY`: Your Google Gemini API key (required)
   - `CORS_ORIGIN`: `*` (or your specific domain)

### Manual Setup

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure the service:**
   - **Name**: `planif-tchop`
   - **Root Directory**: Leave empty (root of repo)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build:web && cd src/backend && npm install`
   - **Start Command**: `cd src/backend && npm start`

4. **Set Environment Variables**:
   - `GEMINI_APIKEY`: Your Google Gemini API key
   - `PORT`: Will be set automatically by Render
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `*` (or your frontend domain)

### After Deployment

- **Frontend**: Available at `https://your-app.onrender.com/`
- **API**: Available at `https://your-app.onrender.com/chat`
- **Health Check**: `https://your-app.onrender.com/health`

The frontend will automatically use the same domain for API calls when deployed together.

## API Endpoints

- `GET /` - Serves the frontend app (production) or API status (development)
- `GET /health` - Health check endpoint
- `POST /chat` - Chat endpoint (requires: userDishes, userIngredients, availableRecipes, mealPlans, familyMembers, userMessage)

