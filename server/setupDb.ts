import { neonConfig, Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

// Configure Neon database with WebSocket
neonConfig.webSocketConstructor = ws;

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('Setting up database...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        quota TEXT NOT NULL DEFAULT '10737418240',
        used_space TEXT NOT NULL DEFAULT '0',
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        size TEXT NOT NULL DEFAULT '0',
        is_folder BOOLEAN NOT NULL DEFAULT false,
        parent_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (parent_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    
    // Check if we have any users
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(rows[0].count);
    
    if (userCount === 0) {
      console.log('Creating default users...');
      
      // Create uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminResult = await client.query(`
        INSERT INTO users (email, name, password, role, quota, used_space, is_blocked)
        VALUES ('admin@shamscloud.com', 'Admin', $1, 'admin', '10737418240', '0', false)
        RETURNING id
      `, [adminPassword]);
      
      const adminId = adminResult.rows[0].id;
      
      // Create demo user
      const demoPassword = await bcrypt.hash('demo123', 10);
      const demoResult = await client.query(`
        INSERT INTO users (email, name, password, role, quota, used_space, is_blocked)
        VALUES ('demo@shamscloud.com', 'Demo User', $1, 'user', '5368709120', '0', false)
        RETURNING id
      `, [demoPassword]);
      
      const demoId = demoResult.rows[0].id;
      
      // Create user directories
      const adminDir = path.join(uploadsDir, adminId.toString());
      const demoDir = path.join(uploadsDir, demoId.toString());
      
      if (!fs.existsSync(adminDir)) {
        fs.mkdirSync(adminDir, { recursive: true });
      }
      
      if (!fs.existsSync(demoDir)) {
        fs.mkdirSync(demoDir, { recursive: true });
      }
      
      // Create demo folders
      const documentsResult = await client.query(`
        INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
        VALUES ('Documents', '/uploads/${demoId}/Documents', 'folder', '0', true, NULL, $1)
        RETURNING id
      `, [demoId]);
      
      const documentsId = documentsResult.rows[0].id;
      
      await client.query(`
        INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
        VALUES ('Photos', '/uploads/${demoId}/Photos', 'folder', '0', true, NULL, $1)
      `, [demoId]);
      
      await client.query(`
        INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
        VALUES ('Work', '/uploads/${demoId}/Documents/Work', 'folder', '0', true, $1, $2)
      `, [documentsId, demoId]);
      
      console.log('Default users created successfully!');
    }
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { setupDatabase };