# ShamsCloud Deployment Guide

## Полная установка на Debian/Ubuntu сервер

### Требования
- Debian 10+ или Ubuntu 18.04+
- Пользователь с sudo правами (НЕ root)
- Минимум 2GB RAM  
- Минимум 10GB свободного места
- Доступ к интернету для установки пакетов

### Пошаговая установка на production сервере

#### Этап 1: Подготовка сервера

1. **Подключение к серверу:**
   ```bash
   ssh your-user@your-server-ip
   ```

2. **Обновление системы:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Установка базовых инструментов:**
   ```bash
   sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
   ```

#### Этап 2: Установка Node.js 20

1. **Добавление официального репозитория NodeSource:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   ```

2. **Установка Node.js:**
   ```bash
   sudo apt install -y nodejs
   ```

3. **Проверка установки:**
   ```bash
   node --version  # должно показать v20.x.x
   npm --version   # должно показать 10.x.x или выше
   ```

#### Этап 3: Установка PostgreSQL

1. **Установка PostgreSQL и дополнительных модулей:**
   ```bash
   sudo apt install -y postgresql postgresql-contrib postgresql-client
   ```

2. **Запуск и включение автозапуска:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Проверка статуса:**
   ```bash
   sudo systemctl status postgresql
   ```

#### Этап 4: Настройка базы данных

1. **Переключение на пользователя postgres:**
   ```bash
   sudo -i -u postgres
   ```

2. **Создание пользователя для приложения:**
   ```bash
   createuser --interactive --pwprompt shamscloud
   ```
   - Введите надежный пароль (сохраните его!)
   - На вопрос "Shall the new role be a superuser?" ответьте **n**
   - На вопрос "Shall the new role be allowed to create databases?" ответьте **n**  
   - На вопрос "Shall the new role be allowed to create more new roles?" ответьте **n**

3. **Создание базы данных:**
   ```bash
   createdb -O shamscloud shamscloud
   ```

4. **Тестирование подключения:**
   ```bash
   psql -U shamscloud -d shamscloud -h localhost
   # Введите пароль пользователя shamscloud
   # Если подключение успешно, выйдите: \q
   ```

5. **Выход из сессии postgres:**
   ```bash
   exit
   ```

#### Этап 5: Установка Nginx

1. **Установка Nginx:**
   ```bash
   sudo apt install -y nginx
   ```

2. **Запуск и включение автозапуска:**
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

3. **Проверка работы:**
   ```bash
   curl http://localhost
   # Должна появиться страница приветствия Nginx
   ```

#### Этап 6: Настройка firewall

1. **Включение UFW:**
   ```bash
   sudo ufw enable
   ```

2. **Разрешение необходимых портов:**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw allow 5432  # PostgreSQL (только если нужен внешний доступ)
   ```

3. **Проверка статуса:**
   ```bash
   sudo ufw status
   ```

#### Этап 7: Клонирование и настройка приложения

1. **Переход в домашнюю директорию:**
   ```bash
   cd ~
   ```

2. **Клонирование репозитория:**
   ```bash
   git clone https://github.com/abdulazizsalimov/shamscloud.git
   cd shamscloud
   ```

3. **Установка зависимостей:**
   ```bash
   npm install
   ```

4. **Создание файла окружения:**
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Настройка переменных окружения в .env:**
   ```env
   # Замените на ваши данные PostgreSQL
   DATABASE_URL=postgresql://shamscloud:ВАШ_ПАРОЛЬ@localhost:5432/shamscloud
   PGHOST=localhost
   PGPORT=5432
   PGUSER=shamscloud
   PGPASSWORD=ВАШ_ПАРОЛЬ
   PGDATABASE=shamscloud
   
   # Режим production
   NODE_ENV=production
   
   # Firebase (опционально, для Google OAuth)
   # VITE_FIREBASE_API_KEY=ваш_ключ
   # VITE_FIREBASE_PROJECT_ID=ваш_проект
   # VITE_FIREBASE_APP_ID=ваш_app_id
   ```

6. **Создание схемы базы данных:**
   ```bash
   npm run db:push
   ```

7. **Сборка приложения:**
   ```bash
   npm run build
   ```

8. **Тестирование запуска:**
   ```bash
   npm start
   # Нажмите Ctrl+C через несколько секунд для остановки
   ```

#### Этап 8: Настройка systemd сервиса

1. **Создание файла сервиса:**
   ```bash
   sudo nano /etc/systemd/system/shamscloud.service
   ```

2. **Содержимое файла сервиса:**
   ```ini
   [Unit]
   Description=ShamsCloud File Storage Application
   After=network.target postgresql.service
   Requires=postgresql.service
   
   [Service]
   Type=simple
   User=ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ
   WorkingDirectory=/home/ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ/shamscloud
   ExecStart=/usr/bin/npm start
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   EnvironmentFile=/home/ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ/shamscloud/.env
   
   # Безопасность
   NoNewPrivileges=yes
   PrivateTmp=yes
   ProtectSystem=strict
   ReadWritePaths=/home/ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ/shamscloud
   
   [Install]
   WantedBy=multi-user.target
   ```
   **Замените ВАШЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ на ваше имя пользователя!**

3. **Включение и запуск сервиса:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable shamscloud
   sudo systemctl start shamscloud
   ```

4. **Проверка статуса:**
   ```bash
   sudo systemctl status shamscloud
   ```

#### Этап 9: Настройка Nginx reverse proxy

1. **Создание конфигурации сайта:**
   ```bash
   sudo nano /etc/nginx/sites-available/shamscloud
   ```

2. **Содержимое конфигурации:**
   ```nginx
   server {
       listen 80;
       server_name ваш-домен.com www.ваш-домен.com;  # Замените на ваш домен
       
       # Безопасность
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Referrer-Policy "no-referrer-when-downgrade" always;
       
       # Лимит размера загружаемых файлов
       client_max_body_size 100M;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 86400;
       }
   }
   ```

3. **Активация сайта:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/shamscloud /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # Удаляем стандартный сайт
   ```

4. **Проверка конфигурации:**
   ```bash
   sudo nginx -t
   ```

5. **Перезапуск Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

#### Этап 10: Установка SSL сертификата

1. **Установка Certbot:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Получение SSL сертификата:**
   ```bash
   sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com
   ```
   
3. **Настройка автоматического обновления:**
   ```bash
   sudo crontab -e
   # Добавьте строку:
   # 0 12 * * * /usr/bin/certbot renew --quiet
   ```

#### Этап 11: Создание администратора

1. **Подключение к базе данных:**
   ```bash
   psql -h localhost -U shamscloud -d shamscloud
   ```

2. **Создание администратора:**
   ```sql
   INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
   VALUES (
       'admin@example.com',  -- замените на ваш email
       'Administrator',
       '$2b$10$HwzHHQlNXQNOjQNKj3s9wOLXz8qNvxjKwq1p/JvYAh.Q5s6DPOG8e',  -- пароль: admin123
       'admin',
       '107374182400',  -- 100GB квота
       '0',
       false,
       true,
       NOW()
   );
   ```

3. **Выход из базы данных:**
   ```sql
   \q
   ```

### Проверка установки

1. **Проверка статуса всех сервисов:**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl status nginx
   sudo systemctl status shamscloud
   ```

2. **Проверка доступности приложения:**
   ```bash
   curl http://localhost:5000
   curl http://ваш-домен.com  # если настроен домен
   ```

3. **Проверка логов приложения:**
   ```bash
   sudo journalctl -u shamscloud -f
   ```

4. **Проверка подключения к базе данных:**
   ```bash
   psql -h localhost -U shamscloud -d shamscloud -c "SELECT COUNT(*) FROM users;"
   ```

### Обслуживание и мониторинг

#### Полезные команды для администрирования:

**Перезапуск сервисов:**
```bash
sudo systemctl restart shamscloud
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

**Просмотр логов:**
```bash
# Логи приложения
sudo journalctl -u shamscloud -n 100

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Резервное копирование базы данных:**
```bash
# Создание бэкапа
pg_dump -h localhost -U shamscloud shamscloud > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
psql -h localhost -U shamscloud -d shamscloud < backup_файл.sql
```

**Обновление приложения:**
```bash
cd ~/shamscloud
git pull origin main
npm install
npm run build
sudo systemctl restart shamscloud
```

### Устранение неполадок

#### Проблема: Приложение не запускается

1. **Проверьте логи:**
   ```bash
   sudo journalctl -u shamscloud -n 50
   ```

2. **Проверьте файл .env:**
   ```bash
   cat ~/shamscloud/.env
   ```

3. **Проверьте подключение к базе данных:**
   ```bash
   psql -h localhost -U shamscloud -d shamscloud
   ```

#### Проблема: Nginx показывает ошибку 502

1. **Проверьте работает ли приложение:**
   ```bash
   curl http://localhost:5000
   ```

2. **Проверьте конфигурацию Nginx:**
   ```bash
   sudo nginx -t
   ```

3. **Перезапустите службы:**
   ```bash
   sudo systemctl restart shamscloud
   sudo systemctl restart nginx
   ```

#### Проблема: Не удается подключиться к базе данных

1. **Проверьте статус PostgreSQL:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Проверьте настройки подключения:**
   ```bash
   sudo -u postgres psql -c "\du"  # список пользователей
   sudo -u postgres psql -c "\l"   # список баз данных
   ```

3. **Пересоздайте пользователя и базу:**
   ```bash
   sudo -u postgres dropdb shamscloud
   sudo -u postgres dropuser shamscloud
   # Затем повторите шаги из Этапа 4
   ```

### Безопасность

#### Рекомендуемые настройки безопасности:

1. **Обновление системы:**
   ```bash
   # Настройте автоматические обновления безопасности
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

2. **Настройка fail2ban:**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Ограничение доступа к PostgreSQL:**
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   # Убедитесь, что доступ разрешен только локально
   ```

4. **Регулярные резервные копии:**
   ```bash
   # Добавьте в crontab для автоматических бэкапов
   sudo crontab -e
   # Добавьте строку:
   # 0 2 * * * /usr/bin/pg_dump -h localhost -U shamscloud shamscloud > /home/backup/shamscloud_$(date +\%Y\%m\%d).sql
   ```

### Производительность

#### Оптимизация для production:

1. **Настройка PostgreSQL:**
   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   ```
   Рекомендуемые изменения:
   ```
   shared_buffers = 256MB
   effective_cache_size = 1GB
   maintenance_work_mem = 64MB
   checkpoint_completion_target = 0.9
   ```

2. **Настройка Node.js:**
   ```bash
   # В файле systemd сервиса добавьте:
   Environment=NODE_OPTIONS="--max-old-space-size=512"
   ```

3. **Настройка Nginx для кэширования:**
   ```nginx
   # Добавьте в конфигурацию Nginx:
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Поддержка

Если у вас возникли проблемы:

1. Проверьте [Issues на GitHub](https://github.com/abdulazizsalimov/shamscloud/issues)
2. Создайте новый Issue с подробным описанием проблемы
3. Приложите логи из команд выше

### Обновления

Для получения обновлений:
```bash
cd ~/shamscloud
git pull origin main
npm install
npm run build
sudo systemctl restart shamscloud
```
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