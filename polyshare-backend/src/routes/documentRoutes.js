const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { uploadDocumentValidation } = require('../utils/validators');

/**
 * @route   POST /api/documents
 * @desc    Upload un nouveau document
 * @access  Private
 */
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  handleMulterError,
  uploadDocumentValidation,
  documentController.uploadDocument
);

/**
 * @route   GET /api/documents
 * @desc    Lister tous les documents (avec filtres)
 * @access  Public
 * @query   university_id, faculty_id, major_id, course_id, search, page, limit
 */
router.get('/', documentController.getAllDocuments);

/**
 * @route   GET /api/documents/my/uploads
 * @desc    Récupérer mes documents uploadés
 * @access  Private
 */
router.get('/my/uploads', requireAuth, documentController.getMyDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Récupérer un document spécifique
 * @access  Public
 */
router.get('/:id', documentController.getDocumentById);

/**
 * @route   POST /api/documents/:id/download
 * @desc    Enregistrer un téléchargement
 * @access  Private
 */
router.post('/:id/download', requireAuth, documentController.recordDownload);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Supprimer un document
 * @access  Private (owner or admin)
 */
router.delete('/:id', requireAuth, documentController.deleteDocument);

module.exports = router;
