#!/bin/bash

# ShamsCloud Docker быстрый запуск
echo "🌟 Запуск ShamsCloud через Docker..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    echo "🔗 https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    echo "🔗 https://docs.docker.com/compose/install/"
    exit 1
fi

# Копируем переменные окружения если .env не существует
if [ ! -f .env ]; then
    echo "📝 Создаём файл .env из шаблона..."
    cp .env.docker .env
    echo "✅ Файл .env создан. При необходимости отредактируйте его для настройки Firebase."
fi

# Останавливаем предыдущие контейнеры
echo "🔄 Останавливаем предыдущие контейнеры..."
docker-compose -f docker-compose.simple.yml down

# Собираем и запускаем контейнеры
echo "🏗️  Собираем Docker образы..."
docker-compose -f docker-compose.simple.yml build --no-cache

echo "🚀 Запускаем сервисы..."
docker-compose -f docker-compose.simple.yml up -d

# Ждём запуска базы данных
echo "⏳ Ожидаем запуска базы данных..."
sleep 10

# Применяем схему базы данных
echo "📋 Инициализируем базу данных..."
docker-compose -f docker-compose.simple.yml exec shamscloud npm run db:push

echo ""
echo "🎉 ShamsCloud успешно запущен!"
echo ""
echo "📍 Приложение доступно по адресу:"
echo "   http://localhost        (через Nginx)"
echo "   http://localhost:5000   (прямое подключение)"
echo ""
echo "👤 Тестовые аккаунты:"
echo "   Администратор: admin@shamscloud.com / admin123"
echo "   Пользователь:  demo@shamscloud.com  / demo123"
echo ""
echo "🛠️  Полезные команды:"
echo "   docker-compose logs -f              # Просмотр логов"
echo "   docker-compose stop                 # Остановка сервисов"
echo "   docker-compose restart shamscloud   # Перезапуск приложения"
echo "   docker-compose down -v              # Полное удаление (включая данные)"
echo ""
echo "🔧 Настройка Firebase (опционально):"
echo "   1. Отредактируйте файл .env"
echo "   2. Добавьте Firebase ключи"
echo "   3. Перезапустите: docker-compose restart shamscloud"
echo ""