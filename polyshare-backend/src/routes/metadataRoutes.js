const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * @route   GET /api/metadata/universities
 * @desc    Récupérer toutes les universités
 * @access  Public
 */
router.get('/universities', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM universities ORDER BY name'
    );
    
    res.json({
      success: true,
      data: { universities: result.rows }
    });
  } catch (error) {
    console.error('Get universities error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des universités'
    });
  }
});

/**
 * @route   GET /api/metadata/faculties
 * @desc    Récupérer toutes les facultés (optionnel: par université)
 * @access  Public
 * @query   university_id
 */
router.get('/faculties', async (req, res) => {
  try {
    const { university_id } = req.query;
    
    let query = 'SELECT f.*, u.name as university_name FROM faculties f JOIN universities u ON f.university_id = u.id';
    const params = [];
    
    if (university_id) {
      query += ' WHERE f.university_id = $1';
      params.push(university_id);
    }
    
    query += ' ORDER BY f.name';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: { faculties: result.rows }
    });
  } catch (error) {
    console.error('Get faculties error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des facultés'
    });
  }
});

/**
 * @route   GET /api/metadata/majors
 * @desc    Récupérer toutes les filières (optionnel: par faculté)
 * @access  Public
 * @query   faculty_id
 */
router.get('/majors', async (req, res) => {
  try {
    const { faculty_id } = req.query;
    
    let query = 'SELECT m.*, f.name as faculty_name FROM majors m JOIN faculties f ON m.faculty_id = f.id';
    const params = [];
    
    if (faculty_id) {
      query += ' WHERE m.faculty_id = $1';
      params.push(faculty_id);
    }
    
    query += ' ORDER BY m.name';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: { majors: result.rows }
    });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des filières'
    });
  }
});

/**
 * @route   GET /api/metadata/courses
 * @desc    Récupérer tous les cours (optionnel: par filière)
 * @access  Public
 * @query   major_id
 */
router.get('/courses', async (req, res) => {
  try {
    const { major_id } = req.query;
    
    let query = 'SELECT c.*, m.name as major_name FROM courses c JOIN majors m ON c.major_id = m.id';
    const params = [];
    
    if (major_id) {
      query += ' WHERE c.major_id = $1';
      params.push(major_id);
    }
    
    query += ' ORDER BY c.semester, c.name';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: { courses: result.rows }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des cours'
    });
  }
});

module.exports = router;
