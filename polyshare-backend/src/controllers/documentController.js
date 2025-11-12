const { validationResult } = require('express-validator');
const db = require('../config/database');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * @route   POST /api/documents
 * @desc    Upload un nouveau document
 * @access  Private
 */
const uploadDocument = async (req, res) => {
  try {
    // Valider les inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Supprimer le fichier uploadé si validation échoue
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const { title, description, course_id } = req.body;
    const user = req.user;

    // Vérifier que le cours existe
    const courseExists = await db.query(
      'SELECT id FROM courses WHERE id = $1',
      [course_id]
    );

    if (courseExists.rows.length === 0) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Cours non trouvé'
      });
    }

    // Calculer le hash du fichier (pour éviter les doublons)
    const fileBuffer = await fs.readFile(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Vérifier si le fichier existe déjà (même hash)
    const duplicateCheck = await db.query(
      'SELECT id, title FROM documents WHERE file_hash = $1',
      [fileHash]
    );

    if (duplicateCheck.rows.length > 0) {
      await fs.unlink(req.file.path);
      return res.status(409).json({
        success: false,
        message: 'Ce fichier a déjà été uploadé',
        duplicate: duplicateCheck.rows[0]
      });
    }

    // Pour le MVP, on garde le fichier en local
    // Dans une version production, on uploaderait sur Cloudinary/S3
    const fileUrl = `/uploads/${req.file.filename}`;

    // Insérer le document dans la BDD
    const result = await db.query(
      `INSERT INTO documents (title, description, course_id, uploaded_by, file_url, file_size, file_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, course_id, user.id, fileUrl, req.file.size, fileHash]
    );

    const newDocument = result.rows[0];

    // Augmenter le karma de l'utilisateur (+10 points)
    await db.query(
      'UPDATE users SET karma_points = karma_points + 10 WHERE id = $1',
      [user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès ! +10 karma',
      data: {
        document: newDocument
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    
    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   GET /api/documents
 * @desc    Lister tous les documents (avec filtres et pagination)
 * @access  Public
 */
const getAllDocuments = async (req, res) => {
  try {
    const {
      university_id,
      faculty_id,
      major_id,
      course_id,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    // Construction de la requête SQL dynamique
    let whereConditions = ['d.status = $1'];
    let queryParams = ['approved'];
    let paramCounter = 2;

    if (university_id) {
      whereConditions.push(`u.id = $${paramCounter}`);
      queryParams.push(university_id);
      paramCounter++;
    }

    if (faculty_id) {
      whereConditions.push(`f.id = $${paramCounter}`);
      queryParams.push(faculty_id);
      paramCounter++;
    }

    if (major_id) {
      whereConditions.push(`m.id = $${paramCounter}`);
      queryParams.push(major_id);
      paramCounter++;
    }

    if (course_id) {
      whereConditions.push(`c.id = $${paramCounter}`);
      queryParams.push(course_id);
      paramCounter++;
    }

    if (search) {
      whereConditions.push(`(d.title ILIKE $${paramCounter} OR d.description ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Requête pour compter le total
    const countQuery = `
      SELECT COUNT(*) 
      FROM documents d
      JOIN courses c ON d.course_id = c.id
      JOIN majors m ON c.major_id = m.id
      JOIN faculties f ON m.faculty_id = f.id
      JOIN universities u ON f.university_id = u.id
      WHERE ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Requête pour récupérer les documents
    const documentsQuery = `
      SELECT 
        d.id, d.title, d.description, d.file_url, d.file_size, 
        d.downloads_count, d.created_at,
        c.name as course_name, c.code as course_code, c.semester,
        m.name as major_name,
        f.name as faculty_name,
        u.name as university_name,
        up.username as uploaded_by_username
      FROM documents d
      JOIN courses c ON d.course_id = c.id
      JOIN majors m ON c.major_id = m.id
      JOIN faculties f ON m.faculty_id = f.id
      JOIN universities u ON f.university_id = u.id
      LEFT JOIN users up ON d.uploaded_by = up.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(limit, offset);
    const documentsResult = await db.query(documentsQuery, queryParams);

    res.json({
      success: true,
      data: {
        documents: documentsResult.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
};

/**
 * @route   GET /api/documents/:id
 * @desc    Récupérer un document spécifique
 * @access  Public
 */
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        d.*,
        c.name as course_name, c.code as course_code, c.semester,
        m.id as major_id, m.name as major_name,
        f.id as faculty_id, f.name as faculty_name,
        u.id as university_id, u.name as university_name, u.city as university_city,
        up.id as uploader_id, up.username as uploader_username, up.karma_points as uploader_karma
      FROM documents d
      JOIN courses c ON d.course_id = c.id
      JOIN majors m ON c.major_id = m.id
      JOIN faculties f ON m.faculty_id = f.id
      JOIN universities u ON f.university_id = u.id
      LEFT JOIN users up ON d.uploaded_by = up.id
      WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        document: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du document'
    });
  }
};

/**
 * @route   POST /api/documents/:id/download
 * @desc    Enregistrer un téléchargement (pour stats et karma)
 * @access  Private
 */
const recordDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Vérifier que le document existe
    const docResult = await db.query(
      'SELECT id FROM documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier le karma de l'utilisateur
    if (user.karma_points < 1) {
      return res.status(403).json({
        success: false,
        message: 'Karma insuffisant. Uploadez un document pour gagner des points!'
      });
    }

    // Enregistrer le téléchargement (ou mettre à jour si déjà téléchargé)
    await db.query(
      `INSERT INTO downloads (user_id, document_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, document_id) DO NOTHING`,
      [user.id, id]
    );

    // Incrémenter le compteur de téléchargements
    await db.query(
      'UPDATE documents SET downloads_count = downloads_count + 1 WHERE id = $1',
      [id]
    );

    // Déduire 1 point de karma
    await db.query(
      'UPDATE users SET karma_points = karma_points - 1 WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Téléchargement enregistré. -1 karma'
    });

  } catch (error) {
    console.error('Record download error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du téléchargement'
    });
  }
};

/**
 * @route   DELETE /api/documents/:id
 * @desc    Supprimer un document
 * @access  Private (owner or admin)
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Récupérer le document
    const docResult = await db.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const document = docResult.rows[0];

    // Vérifier que l'utilisateur est le propriétaire ou admin
    if (document.uploaded_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de supprimer ce document'
      });
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '..', '..', document.file_url);
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('File deletion error:', unlinkError);
      // Continue même si le fichier n'existe pas
    }

    // Supprimer de la BDD
    await db.query('DELETE FROM documents WHERE id = $1', [id]);

    // Retirer 10 points de karma à l'uploader
    await db.query(
      'UPDATE users SET karma_points = GREATEST(karma_points - 10, 0) WHERE id = $1',
      [document.uploaded_by]
    );

    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document'
    });
  }
};

/**
 * @route   GET /api/documents/my/uploads
 * @desc    Récupérer les documents uploadés par l'utilisateur connecté
 * @access  Private
 */
const getMyDocuments = async (req, res) => {
  try {
    const user = req.user;

    const result = await db.query(
      `SELECT 
        d.*,
        c.name as course_name, c.code as course_code
      FROM documents d
      JOIN courses c ON d.course_id = c.id
      WHERE d.uploaded_by = $1
      ORDER BY d.created_at DESC`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        documents: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos documents'
    });
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  recordDownload,
  deleteDocument,
  getMyDocuments
};
