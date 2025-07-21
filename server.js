import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import contactRouter from './Projet/contact/contact.js';
import projetRouter from './Projet/projet.js';

// Charger les variables d'environnement
dotenv.config();

// Créer l'app Express
const app = express();

// Middlewares
app.use(cors({
  origin: 'https://oumar-diane.vercel.app', // remplace par ton front prod si besoin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Log des requêtes entrantes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/contact', contactRouter);
app.use('/api/projet', projetRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime()
  });
});

// 404 handler pour route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur backend en marche sur http://localhost:${PORT}`);
});
