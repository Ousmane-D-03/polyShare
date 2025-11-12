const jwt = require('jsonwebtoken');

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user - L'objet utilisateur
 * @returns {String} Le token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'polyshare-api'
    }
  );
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Le token à vérifier
 * @returns {Object} Le payload décodé
 * @throws {Error} Si le token est invalide
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token invalide');
    }
    throw error;
  }
};

/**
 * Extrait le token du header Authorization
 * @param {String} authHeader - Le header Authorization
 * @returns {String|null} Le token ou null
 */
const extractToken = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Format attendu: "Bearer TOKEN"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};
