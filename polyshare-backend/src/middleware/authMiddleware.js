const { verifyToken, extractToken } = require('../utils/tokenUtils');
const db = require('../config/database');

/**
 * Middleware pour protéger les routes qui nécessitent une authentification
 */
const requireAuth = async (req, res, next) => {
  try {
    // Extraire le token du header
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise. Token manquant.'
      });
    }

    // Vérifier et décoder le token
    const decoded = verifyToken(token);
    
    // Vérifier que l'utilisateur existe toujours dans la BDD
    const result = await db.query(
      'SELECT id, email, username, role, karma_points, university_id FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Attacher l'utilisateur à la requête
    req.user = result.rows[0];
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    return res.status(401).json({
      success: false,
      message: error.message || 'Token invalide'
    });
  }
};

/**
 * Middleware pour vérifier que l'utilisateur a un rôle spécifique
 * @param {...String} roles - Les rôles autorisés
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Permissions insuffisantes.'
      });
    }
    
    next();
  };
};

/**
 * Middleware optionnel: attache l'user si token présent, sinon continue
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      const result = await db.query(
        'SELECT id, email, username, role, karma_points FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, on continue quand même (auth optionnelle)
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};
