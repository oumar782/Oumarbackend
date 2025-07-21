// Import d'Express et création d'un routeur Express
import express from 'express';
const router = express.Router();

// Import de la connexion à la base de données (db.js)
import db from '../../db.js';

/**
 * Fonction de validation des données du contact
 * Vérifie si tous les champs obligatoires sont présents et valides
 */
const validateContactData = (data) => {
  const errors = [];
  // Nom est requis
  if (!data.name?.trim()) errors.push('Le nom est requis');
  // Email est requis et doit être au format valide
  if (!data.email?.trim()) errors.push('Email est requis');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Email invalide');
  // Message est requis
  if (!data.message?.trim()) errors.push('Le message est requis');
  return errors; // Retourne un tableau d'erreurs s'il y en a
};

/**
 * Route POST / : Création d'un nouveau contact
 */
router.post('/', async (req, res) => {
  // Validation des données envoyées
  const errors = validateContactData(req.body);
  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  try {
    // Extraction des données du corps de la requête
    const { name, email, message } = req.body;

    // Insertion du contact dans la base de données
    const result = await db.query(
      `INSERT INTO contact (name, email, message) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, message, created_at`,
      [name, email, message]
    );

    // Réponse avec le contact inséré
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Route GET / : Liste tous les contacts avec pagination, filtres et tri
 */
router.get('/', async (req, res) => {
  try {
    // Extraction des paramètres de requête
    const { search, page = 1, limit = 10, sort = 'created_at-desc' } = req.query;
    const offset = (page - 1) * limit; // Calcul de l'offset pour la pagination

    let baseQuery = `FROM contact`;
    const filters = []; // Tableau pour stocker les conditions WHERE
    const params = [];  // Paramètres pour les requêtes SQL

    // Ajout d'un filtre de recherche (recherche globale)
    if (search) {
      filters.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR message ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    // Si des filtres existent, on les ajoute à la requête
    if (filters.length > 0) {
      baseQuery += ` WHERE ` + filters.join(' AND ');
    }

    // Gestion du tri (champ et ordre)
    const [sortField, sortOrder] = sort.split('-');
    const orderClause = `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;

    // Construction des requêtes finale (données paginées et comptage total)
    const dataQuery = `SELECT id, name, email, message, created_at ${baseQuery} ${orderClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;

    // Exécution parallèle des deux requêtes
    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...params, limit, offset]),
      db.query(countQuery, params)
    ]);

    // Réponse avec les données et les informations de pagination
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Route GET /:id : Récupère un contact spécifique par son ID
 */
router.get('/:id', async (req, res) => {
  try {
    // Requête SQL pour récupérer un contact
    const result = await db.query(
      `SELECT id, name, email, message, created_at FROM contact WHERE id = $1`,
      [req.params.id]
    );

    // Si aucun contact n'est trouvé, renvoyer une erreur 404
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact non trouvé' });
    }

    // Sinon, renvoyer le contact trouvé
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Route PUT /:id : Met à jour un contact existant
 */
router.put('/:id', async (req, res) => {
  // Valider les données reçues
  const errors = validateContactData(req.body);
  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  try {
    // Extraction des données du corps de la requête
    const { name, email, message } = req.body;

    // Mise à jour du contact dans la base de données
    const result = await db.query(
      `UPDATE contact SET name = $1, email = $2, message = $3 WHERE id = $4 RETURNING *`,
      [name, email, message, req.params.id]
    );

    // Si aucun contact n'est trouvé après mise à jour, erreur 404
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact non trouvé' });
    }

    // Renvoyer le contact mis à jour
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Route DELETE /:id : Supprime un contact par son ID
 */
router.delete('/:id', async (req, res) => {
  try {
    // Requête SQL pour supprimer un contact et retourner ses données
    const result = await db.query(
      'DELETE FROM contact WHERE id = $1 RETURNING id, name',
      [req.params.id]
    );

    // Si aucun contact n'a été supprimé, erreur 404
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact non trouvé' });
    }

    // Sinon, renvoyer les données du contact supprimé
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Export du routeur configuré
export default router;