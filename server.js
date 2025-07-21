import express from 'express';
import cors from 'cors';
import contactRouter from './Projet/contact/contact.js';
import projetRouter from './Projet/projet.js';

const app = express();

// CORS config
app.use(cors({
  origin: ['https://oumar-diane.vercel.app'],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Logger des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes principales
app.use('/api/contact', contactRouter);
app.use('/api/projet', projetRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Gestion des erreurs 404
app.use((req, res) => {
  console.error(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Export pour Vercel
export default app;