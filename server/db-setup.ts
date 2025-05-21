import { db } from './db';
import { users, files } from '@shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

/**
 * Инициализация базы данных: создание таблиц и заполнение начальными данными
 */
export async function setupDatabase() {
  try {
    console.log('Проверка и настройка базы данных...');
    
    // Создаем папку для загрузок, если её нет
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Проверяем количество пользователей
    try {
      const userCount = await db.select({ count: sql`count(*)` }).from(users);
      
      // Если пользователей нет, создаем default users
      if (Number(userCount[0].count) === 0) {
        await createDefaultUsers();
      }
    } catch (error) {
      // Если таблица не существует, создаем ее
      console.log('Создание таблиц...');
      await db.execute(sql`
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
      
      // Создаем пользователей по умолчанию
      await createDefaultUsers();
    }
    
    console.log('База данных настроена успешно!');
  } catch (error) {
    console.error('Ошибка при настройке базы данных:', error);
    throw error;
  }
}

/**
 * Создание пользователей по умолчанию
 */
async function createDefaultUsers() {
  try {
    console.log('Создание пользователей по умолчанию...');
    
    // Хешируем пароли
    const adminPassword = await bcrypt.hash('admin123', 10);
    const demoPassword = await bcrypt.hash('demo123', 10);
    
    // Создаем администратора
    const adminResult = await db.execute(sql`
      INSERT INTO users (email, name, password, role, quota, used_space, is_blocked)
      VALUES ('admin@shamscloud.com', 'Admin', ${adminPassword}, 'admin', '10737418240', '0', false)
      RETURNING id
    `);
    const adminId = Number(adminResult.rows[0].id);
    
    // Создаем демо-пользователя
    const demoResult = await db.execute(sql`
      INSERT INTO users (email, name, password, role, quota, used_space, is_blocked)
      VALUES ('demo@shamscloud.com', 'Demo User', ${demoPassword}, 'user', '5368709120', '0', false)
      RETURNING id
    `);
    const demoId = Number(demoResult.rows[0].id);
    
    // Создаем директории для пользователей
    const adminDir = path.join(process.cwd(), 'uploads', adminId.toString());
    const demoDir = path.join(process.cwd(), 'uploads', demoId.toString());
    
    if (!fs.existsSync(adminDir)) {
      fs.mkdirSync(adminDir, { recursive: true });
    }
    
    if (!fs.existsSync(demoDir)) {
      fs.mkdirSync(demoDir, { recursive: true });
    }
    
    // Создаем демо-папки для демо-пользователя
    const documentsResult = await db.execute(sql`
      INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
      VALUES ('Documents', '', 'folder', '0', true, NULL, ${demoId})
      RETURNING id
    `);
    const documentsId = Number(documentsResult.rows[0].id);
    
    const photosResult = await db.execute(sql`
      INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
      VALUES ('Photos', '', 'folder', '0', true, NULL, ${demoId})
      RETURNING id
    `);
    const photosId = Number(photosResult.rows[0].id);
    
    await db.execute(sql`
      INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
      VALUES ('Work', '', 'folder', '0', true, ${documentsId}, ${demoId})
    `);
    
    console.log('Пользователи по умолчанию созданы!');
  } catch (error) {
    console.error('Ошибка при создании пользователей по умолчанию:', error);
    throw error;
  }
}