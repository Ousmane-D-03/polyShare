const { body } = require('express-validator');

/**
 * Validation pour l'inscription
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
    .matches(/\d/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre'),
  
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 2 et 50 caractères')
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, espaces, tirets et underscores'),
  
  body('university_id')
    .optional()
    .isUUID()
    .withMessage('ID université invalide')
];

/**
 * Validation pour la connexion
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

/**
 * Validation pour la mise à jour du profil
 */
const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 2 et 50 caractères'),
  
  body('university_id')
    .optional()
    .isUUID()
    .withMessage('ID université invalide')
];

/**
 * Validation pour l'upload de document
 */
const uploadDocumentValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Le titre doit contenir entre 3 et 255 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La description ne peut pas dépasser 2000 caractères'),
  
  body('course_id')
    .isUUID()
    .withMessage('ID cours invalide')
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  uploadDocumentValidation
};
