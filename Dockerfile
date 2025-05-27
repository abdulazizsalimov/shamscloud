# Dockerfile для ShamsCloud - полная копия текущего проекта
FROM node:20-alpine AS base

# Устанавливаем системные зависимости
RUN apk add --no-cache \
    libc6-compat \
    postgresql-client \
    curl \
    bash

WORKDIR /app

# Копируем конфигурационные файлы
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY drizzle.config.ts ./

# Устанавливаем зависимости
FROM base AS deps
RUN npm ci

# Этап сборки
FROM deps AS builder

# Копируем весь исходный код (точно как в текущем проекте)
COPY . .

# Собираем фронтенд
RUN npm run build

# Production образ
FROM node:20-alpine AS runner

# Устанавливаем системные зависимости для production
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

WORKDIR /app

# Создаем пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 shamscloud

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Создаем необходимые директории
RUN mkdir -p uploads data settings
RUN chown -R shamscloud:nodejs uploads data settings

# Создаем скрипт запуска с инициализацией данных
COPY --chown=shamscloud:nodejs <<'EOF' /app/docker-start.sh
#!/bin/bash

echo "🚀 Запуск ShamsCloud в Docker..."

# Ждем готовности PostgreSQL
echo "📊 Ожидание готовности базы данных..."
until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER; do
  echo "⏳ База данных не готова, ждем..."
  sleep 2
done

echo "✅ База данных готова!"

# Инициализируем схему базы данных
echo "🔧 Инициализация схемы базы данных..."
npm run db:push

# Создаем пользователей по умолчанию (если их нет)
echo "👥 Создание пользователей по умолчанию..."

# Хешируем пароли
ADMIN_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('ShamsAdmin2024!', 10));")
DEMO_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('ShamsDemo2024!', 10));")

# Создаем SQL для пользователей
cat > /tmp/docker_users.sql << SQL_EOF
-- Создание администратора
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    'admin@shamscloud.uz',
    'Системный Администратор',
    '$ADMIN_HASH',
    'admin',
    '107374182400',
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Создание демо пользователя
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    'demo@shamscloud.uz',
    'Демо Пользователь',
    '$DEMO_HASH',
    'user',
    '5368709120',
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Создание демо папок
DO \$\$
DECLARE
    demo_user_id INTEGER;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@shamscloud.uz';
    
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id, is_public, public_token, share_type, is_password_protected, share_password, created_at, updated_at)
        VALUES 
            ('Documents', '', 'folder', '0', true, NULL, demo_user_id, false, NULL, NULL, false, NULL, NOW(), NOW()),
            ('Photos', '', 'folder', '0', true, NULL, demo_user_id, false, NULL, NULL, false, NULL, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;
END \$\$;
SQL_EOF

# Выполняем SQL
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f /tmp/docker_users.sql

# Создаем директории для файлов пользователей
echo "📁 Создание файловых директорий..."
ADMIN_ID=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT id FROM users WHERE email = 'admin@shamscloud.uz';" | xargs)
DEMO_ID=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT id FROM users WHERE email = 'demo@shamscloud.uz';" | xargs)

if [ ! -z "$ADMIN_ID" ]; then
    mkdir -p "uploads/$ADMIN_ID"
fi

if [ ! -z "$DEMO_ID" ]; then
    mkdir -p "uploads/$DEMO_ID"
fi

echo "✅ Инициализация завершена!"
echo "👤 Администратор: admin@shamscloud.uz / ShamsAdmin2024!"
echo "👤 Пользователь: demo@shamscloud.uz / ShamsDemo2024!"

# Запускаем приложение
echo "🌟 Запуск ShamsCloud на порту $PORT..."
exec npm start
EOF

# Делаем скрипт исполняемым
RUN chmod +x /app/docker-start.sh

# Переключаемся на пользователя
USER shamscloud

# Переменные окружения (как в текущем проекте)
ENV NODE_ENV=production
ENV PORT=5000

# Открываем порт
EXPOSE 5000

# Запускаем через наш скрипт инициализации
CMD ["/app/docker-start.sh"]