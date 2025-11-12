const fs = require('fs');
const path = require('path');
const db = require('./database');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
console.log('📦 Loaded DATABASE_URL =', process.env.DATABASE_URL); // debug temporaire

async function initDatabase() {
  console.log('='.repeat(60));
  console.log('🗄️  PolyShare - Database Initialization');
  console.log('='.repeat(60));
  
  try {
    // Tester la connexion d'abord
    console.log('\n📡 Testing database connection...');
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Check your DATABASE_URL in .env');
      process.exit(1);
    }
    
    // Lire le fichier SQL
    console.log('\n📄 Reading SQL schema file...');
    const sqlPath = path.join(__dirname, 'init-db.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ File not found: ${sqlPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ SQL file loaded successfully');
    
    // Exécuter le SQL
    console.log('\n🔄 Executing SQL schema...');
    console.log('⏳ This may take a few seconds...\n');
    
    await db.query(sql);
    
    console.log('✅ Database schema created successfully!');
    
    // Vérifier que les tables sont créées
    console.log('\n🔍 Verifying tables...');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\n📊 Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Vérifier les données de test
    console.log('\n🧪 Checking test data...');
    
    const universitiesCount = await db.query('SELECT COUNT(*) FROM universities');
    const facultiesCount = await db.query('SELECT COUNT(*) FROM faculties');
    const majorsCount = await db.query('SELECT COUNT(*) FROM majors');
    const coursesCount = await db.query('SELECT COUNT(*) FROM courses');
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    
    console.log(`   📚 Universities: ${universitiesCount.rows[0].count}`);
    console.log(`   🏛️  Faculties: ${facultiesCount.rows[0].count}`);
    console.log(`   🎓 Majors: ${majorsCount.rows[0].count}`);
    console.log(`   📖 Courses: ${coursesCount.rows[0].count}`);
    console.log(`   👤 Users: ${usersCount.rows[0].count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database initialization completed successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 Next step: Run "npm run dev" to start the server\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR: Database initialization failed!');
    console.error('='.repeat(60));
    console.error('\n📝 Error details:');
    console.error(error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\n🔍 Full error:');
      console.error(error);
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your DATABASE_URL in .env file');
    console.error('   2. Make sure your Supabase project is active');
    console.error('   3. Verify your database password is correct');
    console.error('   4. Check your internet connection\n');
    
    process.exit(1);
  }
}

// Exécuter
initDatabase();
