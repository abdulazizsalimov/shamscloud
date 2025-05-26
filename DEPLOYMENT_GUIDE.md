# ShamsCloud Deployment Guide

## Быстрая установка на Debian/Ubuntu сервер

### Требования
- Debian 10+ или Ubuntu 18.04+
- Пользователь с sudo правами (НЕ root)
- Минимум 2GB RAM
- Минимум 10GB свободного места

### Автоматическая установка

1. **Загрузите файлы на сервер:**
   ```bash
   # Скопируйте архив и скрипт на ваш сервер
   scp shamscloud-project.tar.gz install-shamscloud.sh user@your-server:/home/user/
   ```

2. **Запустите установку:**
   ```bash
   ssh user@your-server
   cd /home/user
   chmod +x install-shamscloud.sh
   ./install-shamscloud.sh
   ```

3. **Следуйте инструкциям на экране:**
   - Скрипт запросит email и пароль для администратора
   - Дождитесь завершения установки

### Что делает скрипт автоматически:

✅ **Системные зависимости:**
- Обновляет систему
- Устанавливает Node.js 20
- Устанавливает PostgreSQL
- Устанавливает Nginx
- Настраивает firewall (UFW)

✅ **База данных:**
- Создает пользователя и базу данных
- Генерирует безопасные пароли
- Настраивает схему БД

✅ **Приложение:**
- Извлекает исходный код
- Устанавливает зависимости
- Собирает production версию
- Создает systemd сервис

✅ **Веб-сервер:**
- Настраивает Nginx как reverse proxy
- Конфигурирует безопасность
- Устанавливает лимиты загрузки файлов

✅ **Безопасность:**
- Настраивает firewall
- Добавляет security headers
- Создает изолированный systemd сервис

### После установки:

1. **Настройте домен в Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/shamscloud
   # Замените "server_name _;" на ваш домен
   sudo systemctl reload nginx
   ```

2. **Установите SSL сертификат:**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Настройте Firebase (опционально):**
   ```bash
   nano .env
   # Добавьте ваши Firebase credentials:
   # VITE_FIREBASE_API_KEY=your_api_key
   # VITE_FIREBASE_PROJECT_ID=your_project_id
   # VITE_FIREBASE_APP_ID=your_app_id
   
   sudo systemctl restart shamscloud
   ```

### Полезные команды:

```bash
# Просмотр логов
sudo journalctl -u shamscloud -f

# Перезапуск сервиса
sudo systemctl restart shamscloud

# Проверка статуса
sudo systemctl status shamscloud

# Просмотр конфигурации Nginx
sudo nginx -t

# Просмотр переменных окружения
cat .env
```

### Структура файлов после установки:

```
/home/user/
├── shamscloud-project.tar.gz    # Исходный архив
├── install-shamscloud.sh        # Скрипт установки
├── .env                        # Переменные окружения
├── client/                     # Frontend код
├── server/                     # Backend код
├── shared/                     # Общие типы
├── uploads/                    # Загруженные файлы
└── node_modules/              # Зависимости
```

### Системные файлы:

```
/etc/systemd/system/shamscloud.service    # Systemd сервис
/etc/nginx/sites-available/shamscloud     # Nginx конфигурация
```

### Порты:

- **5000** - ShamsCloud приложение (внутренний)
- **80** - HTTP (Nginx)
- **443** - HTTPS (Nginx после SSL)
- **5432** - PostgreSQL (только localhost)

### Решение проблем:

1. **Сервис не запускается:**
   ```bash
   sudo journalctl -u shamscloud --no-pager
   ```

2. **Nginx ошибки:**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

3. **База данных недоступна:**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "\l"
   ```

4. **Проверка соединения:**
   ```bash
   curl http://localhost:5000/api/auth/me
   ```

### Контакты и поддержка:

Если возникли проблемы при установке, проверьте логи и убедитесь, что:
- У пользователя есть sudo права
- Сервер имеет интернет-соединение
- Порты 80 и 443 открыты
- Достаточно свободного места на диске

Приложение будет доступно по адресу: `http://your-server-ip`