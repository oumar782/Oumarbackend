import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import contactRouter from './Projet/contact/contact.js';
import projetRouter from './Projet/projet.js';

dotenv.config();

const app = express();

// Configuration CORS corrigée
app.use(cors({
  origin: 'https://oumar-diane.vercel.app/', // Retirer le slash final
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logging amélioré
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes avec gestion d'erreur
app.use('/api/contact', contactRouter);
app.use('/api/projet', projetRouter);

// Health check étendu
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected' // À adapter selon votre base de données
  });
});


// Gestion des routes non trouvées
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Error handler amélioré
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Erreur de validation',
      errors: err.errors
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur backend en marche : http://localhost:${PORT}`);
});