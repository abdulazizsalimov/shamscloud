#!/bin/bash

# Скрипт запуска ShamsCloud в Docker - ПОЛНАЯ КОПИЯ ТЕКУЩЕГО ПРОЕКТА
# Автор: ShamsCloud Team

echo "🚀 Запуск ShamsCloud в Docker..."
echo "📦 Создание полной копии текущего проекта"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Останавливаем существующие контейнеры (если есть)
echo "🛑 Остановка существующих контейнеров..."
docker-compose down 2>/dev/null || true

# Создаем и запускаем контейнеры
echo "🔨 Сборка и запуск контейнеров..."
docker-compose up --build -d

# Ждем запуска приложения
echo "⏳ Ожидание запуска приложения..."
echo "📊 Проверяем состояние контейнеров..."

# Показываем статус
docker-compose ps

# Ждем готовности приложения
echo "🔍 Проверяем доступность приложения..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/auth/me >/dev/null 2>&1; then
        echo "✅ Приложение готово!"
        break
    fi
    echo "⏳ Ждем готовности приложения... ($i/30)"
    sleep 2
done

echo ""
echo "🌟 ShamsCloud успешно запущен!"
echo "🌐 Открыть приложение: http://localhost:5000"
echo ""
echo "👤 Данные для входа:"
echo "🔑 Администратор: admin@shamscloud.uz / ShamsAdmin2024!"
echo "🔑 Пользователь: demo@shamscloud.uz / ShamsDemo2024!"
echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов:     docker-compose logs -f"
echo "   Остановка:          docker-compose down"
echo "   Перезапуск:         docker-compose restart"
echo "   Очистка данных:     docker-compose down -v"
echo ""
echo "✨ Готово! Ваша точная копия ShamsCloud работает в Docker!"