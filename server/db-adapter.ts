import { User, File } from '@shared/schema';

// Функция для преобразования snake_case в camelCase при получении данных из БД
export function adaptUserFromDb(dbUser: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    password: dbUser.password,
    role: dbUser.role,
    quota: dbUser.quota,
    usedSpace: dbUser.used_space,
    isBlocked: dbUser.is_blocked,
    isEmailVerified: dbUser.is_email_verified,
    createdAt: dbUser.created_at
  };
}

// Функция для преобразования camelCase в snake_case при отправке данных в БД
export function adaptUserToDb(user: Partial<User>): any {
  const result: any = {};
  
  if (user.id !== undefined) result.id = user.id;
  if (user.email !== undefined) result.email = user.email;
  if (user.name !== undefined) result.name = user.name;
  if (user.password !== undefined) result.password = user.password;
  if (user.role !== undefined) result.role = user.role;
  if (user.quota !== undefined) result.quota = user.quota;
  if (user.usedSpace !== undefined) result.used_space = user.usedSpace;
  if (user.isBlocked !== undefined) result.is_blocked = user.isBlocked;
  if (user.isEmailVerified !== undefined) result.is_email_verified = user.isEmailVerified;
  
  return result;
}

// Функция для преобразования snake_case в camelCase при получении файлов из БД
export function adaptFileFromDb(dbFile: any): File {
  return {
    id: dbFile.id,
    name: dbFile.name,
    path: dbFile.path,
    type: dbFile.type,
    size: dbFile.size,
    isFolder: dbFile.is_folder,
    parentId: dbFile.parent_id,
    userId: dbFile.user_id,
    createdAt: dbFile.created_at,
    updatedAt: dbFile.updated_at
  };
}

// Функция для преобразования camelCase в snake_case при отправке файлов в БД
export function adaptFileToDb(file: Partial<File>): any {
  const result: any = {};
  
  if (file.id !== undefined) result.id = file.id;
  if (file.name !== undefined) result.name = file.name;
  if (file.path !== undefined) result.path = file.path;
  if (file.type !== undefined) result.type = file.type;
  if (file.size !== undefined) result.size = file.size;
  if (file.isFolder !== undefined) result.is_folder = file.isFolder;
  if (file.parentId !== undefined) result.parent_id = file.parentId;
  if (file.userId !== undefined) result.user_id = file.userId;
  
  return result;
}