import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Middleware pour logger les requêtes
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

/**
 * @route POST /projects
 * @description Crée un nouveau projet
 * @body {string} title - Titre du projet
 * @body {string} description - Description du projet
 * @body {string} [image] - URL de l'image
 * @body {string[]} [technologies] - Tableau de technologies
 * @body {boolean} [featured=false] - Si le projet est mis en avant
 * @body {object} [stats] - Statistiques du projet
 * @body {string} slug - Slug URL du projet
 * @returns {object} Le projet créé
 */
router.post('/', async (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Le corps de la requête doit être un objet JSON'
    });
  }

  const { title, description, image, technologies, featured, stats, slug } = req.body;

  // Validation
  const errors = [];
  
  if (!title) errors.push('Le titre est obligatoire');
  else if (typeof title !== 'string') errors.push('Le titre doit être une chaîne de caractères');
  else if (title.trim() === '') errors.push('Le titre ne peut pas être vide');

  if (!description) errors.push('La description est obligatoire');
  else if (typeof description !== 'string') errors.push('La description doit être une chaîne de caractères');
  else if (description.trim() === '') errors.push('La description ne peut pas être vide');

  if (!slug) errors.push('Le slug est obligatoire');
  else if (typeof slug !== 'string') errors.push('Le slug doit être une chaîne de caractères');
  else if (slug.trim() === '') errors.push('Le slug ne peut pas être vide');
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.push('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors
    });
  }

  try {
    const query = `
      INSERT INTO projects 
        (title, description, image, technologies, featured, stats, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`;
    
    const values = [
      title.trim(),
      description.trim(),
      image || null,
      Array.isArray(technologies) ? technologies : null,
      typeof featured === 'boolean' ? featured : false,
      stats || null,
      slug.trim()
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Un projet avec ce slug existe déjà'
      });
    }
    console.error('Erreur lors de la création du projet:', error);
    next(error);
  }
});

/**
 * @route GET /projects
 * @description Récupère tous les projets
 * @returns {object[]} Liste des projets
 */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM projects 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    next(error);
  }
});

/**
 * @route GET /projects/:id
 * @description Récupère un projet par son ID
 * @param {number} id - ID du projet
 * @returns {object} Le projet demandé
 */
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: 'ID doit être un nombre valide'
    });
  }

  try {
    const { rows } = await pool.query(`
      SELECT * FROM projects 
      WHERE id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Projet non trouvé' 
      });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`Erreur lors de la récupération du projet ${id}:`, error);
    next(error);
  }
});

/**
 * @route PUT /projects/:id
 * @description Met à jour un projet existant
 * @param {number} id - ID du projet à mettre à jour
 * @body {string} [title] - Nouveau titre
 * @body {string} [description] - Nouvelle description
 * @body {string} [image] - Nouvelle URL d'image
 * @body {string[]} [technologies] - Nouvelles technologies
 * @body {boolean} [featured] - Nouveau statut featured
 * @body {object} [stats] - Nouvelles statistiques
 * @body {string} [slug] - Nouveau slug
 * @returns {object} Le projet mis à jour
 */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: 'ID doit être un nombre valide'
    });
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Le corps de la requête doit être un objet JSON'
    });
  }

  const { title, description, image, technologies, featured, stats, slug } = req.body;

  // Validation
  const errors = [];
  
  if (title !== undefined) {
    if (typeof title !== 'string') errors.push('Le titre doit être une chaîne de caractères');
    else if (title.trim() === '') errors.push('Le titre ne peut pas être vide');
  }

  if (description !== undefined) {
    if (typeof description !== 'string') errors.push('La description doit être une chaîne de caractères');
    else if (description.trim() === '') errors.push('La description ne peut pas être vide');
  }

  if (slug !== undefined) {
    if (typeof slug !== 'string') errors.push('Le slug doit être une chaîne de caractères');
    else if (slug.trim() === '') errors.push('Le slug ne peut pas être vide');
    else if (!/^[a-z0-9-]+$/.test(slug)) errors.push('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors
    });
  }

  try {
    // Vérifier que le projet existe
    const checkResult = await pool.query(`
      SELECT id FROM projects 
      WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    const query = `
      UPDATE projects
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        image = COALESCE($3, image),
        technologies = COALESCE($4, technologies),
        featured = COALESCE($5, featured),
        stats = COALESCE($6, stats),
        slug = COALESCE($7, slug),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *`;
    
    const values = [
      title ? title.trim() : null,
      description ? description.trim() : null,
      image || null,
      Array.isArray(technologies) ? technologies : null,
      typeof featured === 'boolean' ? featured : null,
      stats || null,
      slug ? slug.trim() : null,
      id
    ];

    const { rows } = await pool.query(query, values);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Un projet avec ce slug existe déjà'
      });
    }
    console.error(`Erreur lors de la mise à jour du projet ${id}:`, error);
    next(error);
  }
});

/**
 * @route DELETE /projects/:id
 * @description Supprime un projet
 * @param {number} id - ID du projet à supprimer
 * @returns {object} Confirmation de suppression
 */
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: 'ID doit être un nombre valide'
    });
  }

  try {
    // Vérifier que le projet existe
    const checkResult = await pool.query(`
      SELECT id FROM projects 
      WHERE id = $1
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ 
      success: true, 
      message: 'Projet supprimé avec succès',
      deletedId: id
    });
  } catch (error) {
    console.error(`Erreur lors de la suppression du projet ${id}:`, error);
    next(error);
  }
});

export default router;