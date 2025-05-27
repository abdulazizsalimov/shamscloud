# 🐳 ShamsCloud Docker Установка

Быстрая и простая установка ShamsCloud через Docker - всё в одном контейнере!

## 🚀 Быстрый старт (5 минут)

### Требования
- Docker 20.10+
- Docker Compose 2.0+
- 2GB свободной оперативной памяти
- 5GB свободного места на диске

### Установка в одну команду

1. **Скачайте проект:**
   ```bash
   git clone https://github.com/abdulazizsalimov/shamscloud.git
   cd shamscloud
   ```

2. **Запустите автоматическую установку:**
   ```bash
   ./docker-start.sh
   ```

3. **Готово!** Приложение доступно по адресу `http://localhost:5000`

## 📋 Что включено

✅ **Приложение ShamsCloud** - Полнофункциональное облачное хранилище  
✅ **PostgreSQL 16** - Надежная база данных  
✅ **Nginx** - Веб-сервер и reverse proxy (опционально)  
✅ **Автоматическая настройка** - Создание схемы БД и админа  
✅ **Persistent данные** - Файлы и база данных сохраняются между перезапусками  

## 👤 Тестовые аккаунты

После установки доступны готовые аккаунты:

- **Администратор**: `admin@shamscloud.com` / `admin123`
- **Пользователь**: `demo@shamscloud.com` / `demo123`

## 🛠 Варианты установки

### Вариант 1: Полная установка (с Nginx)
```bash
# Запуск всех сервисов включая Nginx
docker-compose up -d

# Приложение доступно на:
# http://localhost      (через Nginx)
# http://localhost:5000 (прямое подключение)
```

### Вариант 2: Простая установка (только приложение + БД)
```bash
# Запуск без Nginx
docker-compose -f docker-compose.simple.yml up -d

# Приложение доступно на:
# http://localhost:5000
```

### Вариант 3: Только приложение (внешняя БД)
```bash
# Если у вас уже есть PostgreSQL
docker build -t shamscloud .
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -v $(pwd)/uploads:/app/uploads \
  shamscloud
```

## ⚙️ Настройка

### Переменные окружения

Отредактируйте файл `.env`:

```env
# Пароль базы данных (измените для production!)
POSTGRES_PASSWORD=ваш_безопасный_пароль

# Firebase для Google OAuth (опционально)
VITE_FIREBASE_API_KEY=ваш_ключ
VITE_FIREBASE_PROJECT_ID=ваш_проект
VITE_FIREBASE_APP_ID=ваш_app_id
```

### Настройка Firebase (для Google входа)

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Создайте проект или выберите существующий
3. Включите Authentication → Google провайдер
4. Добавьте домен в Authorized domains
5. Скопируйте ключи в файл `.env`
6. Перезапустите контейнер:
   ```bash
   docker-compose restart shamscloud
   ```

## 🔧 Управление

### Основные команды

```bash
# Запуск сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f shamscloud

# Остановка
docker-compose stop

# Перезапуск
docker-compose restart shamscloud

# Полное удаление (включая данные!)
docker-compose down -v
```

### Резервное копирование

```bash
# Бэкап базы данных
docker-compose exec postgres pg_dump -U shamscloud shamscloud > backup.sql

# Бэкап файлов
docker run --rm -v shamscloud_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data

# Восстановление БД
docker-compose exec -T postgres psql -U shamscloud shamscloud < backup.sql
```

### Обновление

```bash
# Получение обновлений
git pull origin main

# Пересборка образа
docker-compose build --no-cache shamscloud

# Применение обновлений
docker-compose up -d
```

## 📊 Мониторинг

### Проверка состояния

```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Проверка здоровья
curl http://localhost:5000/api/auth/me
```

### Логи

```bash
# Логи приложения
docker-compose logs -f shamscloud

# Логи базы данных
docker-compose logs -f postgres

# Логи Nginx (если используется)
docker-compose logs -f nginx
```

## 🔒 Безопасность для Production

### 1. Изменение паролей

```bash
# Обязательно измените пароли в .env:
POSTGRES_PASSWORD=очень_сложный_пароль_2024
```

### 2. Настройка SSL (с собственным доменом)

```bash
# Добавьте в docker-compose.yml для certbot:
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ssl_certs:/etc/letsencrypt
    command: certonly --webroot -w /var/www/certbot -d yourdomain.com
```

### 3. Ограничение доступа

```bash
# Закройте прямой доступ к БД
# В docker-compose.yml уберите:
# ports:
#   - "5432:5432"
```

## 🚨 Устранение проблем

### Приложение не запускается

```bash
# Проверьте логи
docker-compose logs shamscloud

# Перезапустите с пересборкой
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### База данных недоступна

```bash
# Проверьте статус PostgreSQL
docker-compose exec postgres pg_isready -U shamscloud

# Пересоздайте БД
docker-compose down -v
docker-compose up -d
```

### Недостаточно места

```bash
# Очистка неиспользуемых образов
docker system prune -a

# Проверка использования места
docker system df
```

### Проблемы с портами

```bash
# Проверьте занятые порты
netstat -tulpn | grep :5000

# Измените порт в docker-compose.yml:
ports:
  - "8080:5000"  # Вместо 5000
```

## 📈 Производительность

### Для высоких нагрузок

```yaml
# В docker-compose.yml добавьте:
services:
  shamscloud:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### Настройка PostgreSQL

```yaml
# Для больших объемов данных:
services:
  postgres:
    command: >
      postgres 
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
```

## 🔄 Обновления и миграции

### Автоматические обновления

```bash
# Создайте скрипт update.sh:
#!/bin/bash
git pull origin main
docker-compose build --no-cache shamscloud
docker-compose up -d
docker-compose exec shamscloud npm run db:push
```

### Версионность

```bash
# Создание tagged образа
docker build -t shamscloud:v1.3.0 .
docker tag shamscloud:v1.3.0 shamscloud:latest
```

## 📞 Поддержка

**Проблемы с установкой?**

1. Проверьте [Issues на GitHub](https://github.com/abdulazizsalimov/shamscloud/issues)
2. Убедитесь что у Docker достаточно ресурсов (2GB RAM минимум)
3. Проверьте логи: `docker-compose logs -f`
4. Создайте новый Issue с логами и описанием проблемы

**Требования к системе:**
- Docker 20.10+ и Docker Compose 2.0+
- 2GB RAM (рекомендуется 4GB)
- 5GB свободного места (рекомендуется 20GB)
- Открытые порты 5000, 80, 443 (если используется)

---

🎉 **Готово!** ShamsCloud успешно запущен в Docker контейнерах. Наслаждайтесь безопасным облачным хранилищем!