# 🐳 Docker Guide для ShamsCloud - ПОЛНАЯ КОПИЯ ПРОЕКТА

Этот гайд поможет вам запустить **точную копию** текущего ShamsCloud проекта в Docker.

## 🚀 Быстрый запуск (одна команда!)

```bash
# Запуск полной копии проекта
./docker-start.sh
```

**Готово!** Приложение будет доступно на http://localhost:5000

## 📋 Что создается автоматически

✅ **PostgreSQL база данных** с правильной схемой  
✅ **Пользователи по умолчанию:**
- Администратор: `admin@shamscloud.uz` / `ShamsAdmin2024!`
- Пользователь: `demo@shamscloud.uz` / `ShamsDemo2024!`

✅ **Демо папки** Documents и Photos  
✅ **Firebase настройки** (точно из текущего проекта)  
✅ **Все функции:** загрузка файлов, поделение, админ панель  

## 🔧 Ручной запуск

```bash
# Сборка и запуск
docker-compose up --build -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

## 🎯 Что включено

### База данных
- **PostgreSQL 16** с автоматической схемой
- **Persistent storage** - данные сохраняются между перезапусками
- **Health checks** - автоматическая проверка готовности

### Приложение
- **Точная копия** текущего кода
- **Production сборка** с оптимизацией
- **Автоматическая инициализация** пользователей и данных
- **Persistent uploads** - файлы сохраняются

### Firebase
- **Готовые настройки** из текущего проекта
- **Google OAuth** работает сразу (нужно добавить домен в Firebase Console)

## 📊 Управление

### Основные команды
```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Полная очистка (ВНИМАНИЕ: удаляет все данные!)
docker-compose down -v
```

### Мониторинг
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Проверка работы
curl http://localhost:5000/api/auth/me
```

## 🌐 Production развертывание

### С Nginx (для реального сервера)
```bash
# Запуск с прокси
docker-compose --profile production up -d --build
```

### Настройка домена
1. Измените порты в `docker-compose.yml` 
2. Настройте Nginx для вашего домена
3. Добавьте домен в Firebase Console

## 🔒 Безопасность

### Важные изменения для production:
```bash
# 1. Измените пароли в docker-compose.yml
POSTGRES_PASSWORD: your_secure_password

# 2. Измените SESSION_SECRET
SESSION_SECRET: your_super_secret_key

# 3. Настройте firewall
ufw allow 5000/tcp
```

## 💾 Backup и восстановление

### База данных
```bash
# Создание backup
docker-compose exec postgres pg_dump -U shamscloud shamscloud > backup.sql

# Восстановление
cat backup.sql | docker-compose exec -T postgres psql -U shamscloud shamscloud
```

### Файлы пользователей
```bash
# Backup файлов
docker run --rm -v shamscloud_uploads:/data -v $(pwd):/backup alpine tar czf /backup/files-backup.tar.gz -C /data .

# Восстановление файлов
docker run --rm -v shamscloud_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/files-backup.tar.gz -C /data
```

## 🔧 Решение проблем

### Приложение не запускается
```bash
# Проверить логи
docker-compose logs shamscloud

# Пересобрать образ
docker-compose build --no-cache shamscloud
docker-compose up -d
```

### База данных недоступна
```bash
# Проверить статус
docker-compose exec postgres pg_isready -U shamscloud

# Перезапустить базу
docker-compose restart postgres
```

### Очистка Docker
```bash
# Удалить неиспользуемые образы
docker image prune

# Полная очистка
docker system prune -a
```

## 🎉 Готово!

Теперь у вас есть **полная рабочая копия ShamsCloud** в Docker с:
- ✅ Готовой базой данных
- ✅ Тестовыми пользователями  
- ✅ Всеми функциями файлового хранилища
- ✅ Firebase интеграцией
- ✅ Админ панелью

**Запуск: `./docker-start.sh` и открывайте http://localhost:5000**