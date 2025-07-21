import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import contactRouter from './Projet/contact/contact.js';
import projetRouter from './Projet/projet.js';

dotenv.config();

const app = express();

// ✅ CORS bien configuré
app.use(
  cors({
    origin: [-
      "http://localhost:5173",
      "https://oumar-diane.vercel.app",
      "https://backendjournee.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// 📄 Route racine simplifiée
app.get('/', (req, res) => {
  res.send('✅ Serveur backend en marche');
});

// 📌 Vos routes existantes
app.use('/api/contact', contactRouter);
app.use('/api/projet', projetRouter);

// 🏥 Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

// 🚨 Gestion des erreurs améliorée
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

// 🚀 Lancement serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});