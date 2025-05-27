# Многоэтапная сборка для оптимизации размера образа
FROM node:20-alpine AS builder

# Установка зависимостей для сборки
RUN apk add --no-cache python3 make g++

# Рабочая директория
WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20-alpine AS production

# Устанавливаем необходимые системные пакеты
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S shamscloud -u 1001 -G nodejs

# Рабочая директория
WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение из builder
COPY --from=builder --chown=shamscloud:nodejs /app/dist ./dist
COPY --from=builder --chown=shamscloud:nodejs /app/shared ./shared
COPY --from=builder --chown=shamscloud:nodejs /app/server ./server

# Создаем директорию для загрузок
RUN mkdir -p /app/uploads && chown -R shamscloud:nodejs /app/uploads

# Переключаемся на непривилегированного пользователя
USER shamscloud

# Открываем порт
EXPOSE 5000

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/auth/me || exit 1

# Используем dumb-init для правильной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]

# Запускаем приложение
CMD ["npm", "start"]