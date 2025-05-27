# Используем Node.js 20
FROM node:20

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Открываем порт
EXPOSE 5000

# Команда запуска
CMD ["npm", "start"]