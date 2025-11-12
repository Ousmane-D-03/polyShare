const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { generateToken } = require('../utils/tokenUtils');

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
const register = async (req, res) => {
  try {
    // Valider les inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password, username, university_id } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier que l'université existe
    if (university_id) {
      const universityExists = await db.query(
        'SELECT id FROM universities WHERE id = $1',
        [university_id]
      );

      if (universityExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Université non trouvée'
        });
      }
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Créer l'utilisateur
    const result = await db.query(
      `INSERT INTO users (email, password_hash, username, university_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, karma_points, role, university_id, created_at`,
      [email.toLowerCase(), passwordHash, username, university_id || null]
    );

    const newUser = result.rows[0];

    // Générer un token JWT
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie !',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          karma_points: newUser.karma_points,
          role: newUser.role,
          university_id: newUser.university_id,
          created_at: newUser.created_at
        }
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
const login = async (req, res) => {
  try {
    // Valider les inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Chercher l'utilisateur
    const result = await db.query(
      `SELECT u.*, un.name as university_name
       FROM users u
       LEFT JOIN universities un ON u.university_id = un.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer un token JWT
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Connexion réussie !',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          karma_points: user.karma_points,
          role: user.role,
          university_id: user.university_id,
          university_name: user.university_name,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Récupérer les infos de l'utilisateur connecté
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    // req.user est déjà attaché par le middleware requireAuth
    const result = await db.query(
      `SELECT u.id, u.email, u.username, u.karma_points, u.role, 
              u.university_id, u.created_at, u.updated_at,
              un.name as university_name, un.city as university_city
       FROM users u
       LEFT JOIN universities un ON u.university_id = un.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion (côté client supprime le token)
 * @access  Private
 */
const logout = async (req, res) => {
  // Avec JWT, la déconnexion est gérée côté client
  // (supprimer le token du localStorage/cookies)
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
