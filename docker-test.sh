#!/bin/bash

# Тестовый скрипт для Docker конфигурации ShamsCloud
echo "🧪 Тестирование Docker конфигурации ShamsCloud..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден. Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не найден. Установите Docker Compose."
    exit 1
fi

echo "✅ Docker и Docker Compose найдены"

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cp .env.docker .env
fi

echo "🧹 Очищаем предыдущие контейнеры..."
docker-compose -f docker-compose.simple.yml down -v 2>/dev/null || true

echo "🏗️ Собираем Docker образ..."
if ! docker-compose -f docker-compose.simple.yml build; then
    echo "❌ Ошибка при сборке образа"
    exit 1
fi

echo "✅ Образ успешно собран"

echo "🚀 Запускаем сервисы..."
if ! docker-compose -f docker-compose.simple.yml up -d; then
    echo "❌ Ошибка при запуске сервисов"
    exit 1
fi

echo "⏳ Ожидаем запуска сервисов (60 секунд)..."
sleep 60

echo "🔍 Проверяем статус контейнеров..."
docker-compose -f docker-compose.simple.yml ps

echo "📋 Инициализируем базу данных..."
if ! docker-compose -f docker-compose.simple.yml exec -T shamscloud npm run db:push; then
    echo "⚠️ Возможная ошибка при инициализации БД, но продолжаем..."
fi

echo "🏥 Проверяем здоровье приложения..."
for i in {1..10}; do
    if curl -f http://localhost:5000/ >/dev/null 2>&1; then
        echo "✅ Приложение отвечает!"
        break
    fi
    echo "⏳ Попытка $i/10..."
    sleep 10
done

if ! curl -f http://localhost:5000/ >/dev/null 2>&1; then
    echo "❌ Приложение не отвечает"
    echo "📋 Логи приложения:"
    docker-compose -f docker-compose.simple.yml logs shamscloud
    exit 1
fi

echo ""
echo "🎉 Docker конфигурация работает!"
echo "📍 Приложение доступно: http://localhost:5000"
echo ""
echo "🛠️ Полезные команды:"
echo "  docker-compose -f docker-compose.simple.yml logs -f     # Логи"
echo "  docker-compose -f docker-compose.simple.yml stop       # Остановка"
echo "  docker-compose -f docker-compose.simple.yml down -v    # Полная очистка"