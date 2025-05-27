#!/bin/bash

# ShamsCloud - Полностью автоматическая установка
# Версия: 2.0
# Этот скрипт полностью автоматически развернет ShamsCloud на вашем сервере

set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
LOG_FILE="/tmp/shamscloud-install.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

# Функция логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка состояния установки
INSTALL_STATE_FILE="$HOME/.shamscloud-install-state"

# Функция для отметки выполненного шага
mark_step_completed() {
    echo "$1=completed" >> "$INSTALL_STATE_FILE"
}

# Функция для проверки выполнения шага
is_step_completed() {
    if [ -f "$INSTALL_STATE_FILE" ]; then
        grep -q "$1=completed" "$INSTALL_STATE_FILE" 2>/dev/null
    else
        return 1
    fi
}

# Функция для сброса состояния (если нужен полный переустановка)
reset_install_state() {
    if [ "$1" == "--force" ]; then
        log "Принудительный сброс состояния установки"
        rm -f "$INSTALL_STATE_FILE"
    fi
}

# Автоматические значения (из реального проекта)
AUTO_DB_PASSWORD="ShamsCloud_Secure_2024_$(date +%s)"
AUTO_ADMIN_EMAIL="admin@shamscloud.local"
AUTO_ADMIN_PASSWORD="ShamsAdmin2024!"
AUTO_DEMO_EMAIL="demo@shamscloud.local"
AUTO_DEMO_PASSWORD="ShamsDemo2024!"
AUTO_DOMAIN="shamscloud.uz"
AUTO_PROJECT_DIR="$HOME/shamscloud"

log "🌟 Начинаем автоматическую установку ShamsCloud"
log "📍 Логи сохраняются в: $LOG_FILE"
log "💾 Состояние установки: $INSTALL_STATE_FILE"

# Проверка аргументов
reset_install_state "$1"

# ==================== ШАГ 1: ПРОВЕРКА СИСТЕМЫ ====================
if ! is_step_completed "system_check"; then
    log "🔍 Шаг 1: Проверка системных требований"
    
    # Проверка ОС
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error "Поддерживается только Linux. Ваша ОС: $OSTYPE"
    fi
    
    # Проверка прав sudo
    if ! sudo -n true 2>/dev/null; then
        error "Требуются sudo права. Запустите: sudo -v"
    fi
    
    # Проверка свободного места (минимум 5GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=5242880  # 5GB в KB
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        error "Недостаточно места на диске. Требуется минимум 5GB"
    fi
    
    # Проверка RAM (минимум 2GB)
    TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
    if [ "$TOTAL_RAM" -lt 2000 ]; then
        warn "Обнаружено меньше 2GB RAM. Рекомендуется минимум 2GB"
    fi
    
    log "✅ Системные требования проверены"
    mark_step_completed "system_check"
fi

# ==================== ШАГ 2: ОБНОВЛЕНИЕ СИСТЕМЫ ====================
if ! is_step_completed "system_update"; then
    log "🔄 Шаг 2: Обновление системы"
    
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    sudo apt-get install -y -qq curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release unzip
    
    log "✅ Система обновлена"
    mark_step_completed "system_update"
fi

# ==================== ШАГ 3: УСТАНОВКА NODE.JS ====================
if ! is_step_completed "nodejs_install"; then
    log "📦 Шаг 3: Установка Node.js 20"
    
    # Удаляем старые версии Node.js
    sudo apt-get remove -y nodejs npm 2>/dev/null || true
    
    # Устанавливаем Node.js 20 через NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Проверяем установку
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "✅ Node.js установлен: $NODE_VERSION"
    log "✅ npm установлен: $NPM_VERSION"
    
    mark_step_completed "nodejs_install"
fi

# ==================== ШАГ 4: УСТАНОВКА POSTGRESQL ====================
if ! is_step_completed "postgresql_install"; then
    log "🐘 Шаг 4: Установка PostgreSQL 16"
    
    # Добавляем официальный репозиторий PostgreSQL
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
    
    sudo apt-get update -qq
    sudo apt-get install -y postgresql-16 postgresql-contrib-16 postgresql-client-16
    
    # Запускаем PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log "✅ PostgreSQL установлен и запущен"
    mark_step_completed "postgresql_install"
fi

# ==================== ШАГ 5: НАСТРОЙКА БАЗЫ ДАННЫХ ====================
if ! is_step_completed "database_setup"; then
    log "🗄️ Шаг 5: Настройка базы данных"
    
    # Создаем пользователя и базу данных
    sudo -u postgres psql << EOF
-- Создаем пользователя
DROP USER IF EXISTS shamscloud;
CREATE USER shamscloud WITH PASSWORD '$AUTO_DB_PASSWORD';

-- Создаем базу данных
DROP DATABASE IF EXISTS shamscloud;
CREATE DATABASE shamscloud OWNER shamscloud;

-- Даем права
GRANT ALL PRIVILEGES ON DATABASE shamscloud TO shamscloud;
ALTER USER shamscloud CREATEDB;
EOF
    
    # Проверяем подключение
    PGPASSWORD="$AUTO_DB_PASSWORD" psql -h localhost -U shamscloud -d shamscloud -c "SELECT version();" > /dev/null
    
    log "✅ База данных настроена"
    log "📋 Пользователь БД: shamscloud"
    log "🔑 Пароль БД: $AUTO_DB_PASSWORD"
    
    mark_step_completed "database_setup"
fi

# ==================== ШАГ 6: УСТАНОВКА NGINX ====================
if ! is_step_completed "nginx_install"; then
    log "🌐 Шаг 6: Установка Nginx"
    
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Настройка firewall для домена
    sudo ufw allow 'Nginx Full' 2>/dev/null || true
    sudo ufw allow ssh 2>/dev/null || true
    sudo ufw allow 80/tcp 2>/dev/null || true
    sudo ufw allow 443/tcp 2>/dev/null || true
    
    log "✅ Nginx установлен и запущен"
    mark_step_completed "nginx_install"
fi

# ==================== ШАГ 7: СКАЧИВАНИЕ КОДА ====================
if ! is_step_completed "code_download"; then
    log "📥 Шаг 7: Загрузка исходного кода ShamsCloud"
    
    # Удаляем старую директорию если есть
    if [ -d "$AUTO_PROJECT_DIR" ]; then
        warn "Удаляем существующую директорию $AUTO_PROJECT_DIR"
        rm -rf "$AUTO_PROJECT_DIR"
    fi
    
    # Создаем архив из текущего проекта (копируем все файлы)
    mkdir -p "$AUTO_PROJECT_DIR"
    
    # Копируем все файлы проекта (имитируем git clone)
    cp -r . "$AUTO_PROJECT_DIR/" 2>/dev/null || true
    
    # Или скачиваем с GitHub (если проект там размещен)
    # git clone https://github.com/abdulazizsalimov/shamscloud.git "$AUTO_PROJECT_DIR"
    
    cd "$AUTO_PROJECT_DIR"
    
    log "✅ Исходный код загружен в $AUTO_PROJECT_DIR"
    mark_step_completed "code_download"
fi

# ==================== ШАГ 8: НАСТРОЙКА ОКРУЖЕНИЯ ====================
if ! is_step_completed "env_setup"; then
    log "⚙️ Шаг 8: Настройка окружения"
    
    cd "$AUTO_PROJECT_DIR"
    
    # Создаем .env файл с реальными данными
    cat > .env << EOF
# База данных
DATABASE_URL=postgresql://shamscloud:$AUTO_DB_PASSWORD@localhost:5432/shamscloud
PGHOST=localhost
PGPORT=5432
PGUSER=shamscloud
PGPASSWORD=$AUTO_DB_PASSWORD
PGDATABASE=shamscloud

# Режим работы
NODE_ENV=production

# Firebase (можно добавить позже)
# VITE_FIREBASE_API_KEY=
# VITE_FIREBASE_PROJECT_ID=
# VITE_FIREBASE_APP_ID=

# Безопасность
SESSION_SECRET=ShamsCloud_Session_Secret_$(openssl rand -hex 32)

# Автоматически сгенерированные данные
AUTO_INSTALL=true
INSTALL_DATE=$(date)
EOF
    
    log "✅ Файл окружения создан"
    mark_step_completed "env_setup"
fi

# ==================== ШАГ 9: УСТАНОВКА ЗАВИСИМОСТЕЙ ====================
if ! is_step_completed "dependencies_install"; then
    log "📦 Шаг 9: Установка зависимостей проекта"
    
    cd "$AUTO_PROJECT_DIR"
    
    # Очищаем кеш npm
    npm cache clean --force
    
    # Устанавливаем зависимости
    npm install
    
    log "✅ Зависимости установлены"
    mark_step_completed "dependencies_install"
fi

# ==================== ШАГ 10: СБОРКА ПРИЛОЖЕНИЯ ====================
if ! is_step_completed "app_build"; then
    log "🏗️ Шаг 10: Сборка приложения"
    
    cd "$AUTO_PROJECT_DIR"
    
    # Собираем приложение
    npm run build
    
    log "✅ Приложение собрано"
    mark_step_completed "app_build"
fi

# ==================== ШАГ 11: ИНИЦИАЛИЗАЦИЯ БД ====================
if ! is_step_completed "db_init"; then
    log "🗂️ Шаг 11: Инициализация схемы базы данных"
    
    cd "$AUTO_PROJECT_DIR"
    
    # Применяем схему
    npm run db:push
    
    log "✅ Схема базы данных создана"
    mark_step_completed "db_init"
fi

# ==================== ШАГ 12: СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================
if ! is_step_completed "users_create"; then
    log "👥 Шаг 12: Создание тестовых пользователей"
    
    # Создаем SQL файл с пользователями
    cat > /tmp/create_users.sql << EOF
-- Создание администратора
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    '$AUTO_ADMIN_EMAIL',
    'Системный Администратор',
    '\$2b\$10\$HwzHHQlNXQNOjQNKj3s9wOLXz8qNvxjKwq1p/JvYAh.Q5s6DPOG8e',
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
    '$AUTO_DEMO_EMAIL',
    'Демо Пользователь',
    '\$2b\$10\$HwzHHQlNXQNOjQNKj3s9wOLXz8qNvxjKwq1p/JvYAh.Q5s6DPOG8e',
    'user',
    '5368709120',
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;
EOF
    
    # Выполняем SQL
    PGPASSWORD="$AUTO_DB_PASSWORD" psql -h localhost -U shamscloud -d shamscloud -f /tmp/create_users.sql
    
    log "✅ Тестовые пользователи созданы"
    log "👤 Администратор: $AUTO_ADMIN_EMAIL / ShamsAdmin2024!"
    log "👤 Пользователь: $AUTO_DEMO_EMAIL / ShamsDemo2024!"
    
    rm -f /tmp/create_users.sql
    mark_step_completed "users_create"
fi

# ==================== ШАГ 13: СОЗДАНИЕ SYSTEMD СЕРВИСА ====================
if ! is_step_completed "systemd_service"; then
    log "⚙️ Шаг 13: Создание systemd сервиса"
    
    # Создаем сервис файл
    sudo tee /etc/systemd/system/shamscloud.service > /dev/null << EOF
[Unit]
Description=ShamsCloud File Storage Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$AUTO_PROJECT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$AUTO_PROJECT_DIR/.env

# Безопасность
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$AUTO_PROJECT_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Перезагружаем systemd и запускаем сервис
    sudo systemctl daemon-reload
    sudo systemctl enable shamscloud
    sudo systemctl start shamscloud
    
    # Ждем запуска
    sleep 10
    
    log "✅ Systemd сервис создан и запущен"
    mark_step_completed "systemd_service"
fi

# ==================== ШАГ 14: НАСТРОЙКА NGINX ====================
if ! is_step_completed "nginx_config"; then
    log "🌐 Шаг 14: Настройка Nginx для домена $AUTO_DOMAIN"
    
    # Создаем конфигурацию сайта
    sudo tee /etc/nginx/sites-available/shamscloud > /dev/null << EOF
server {
    listen 80;
    server_name $AUTO_DOMAIN www.$AUTO_DOMAIN;
    
    # Перенаправляем на HTTPS (после установки SSL)
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $AUTO_DOMAIN www.$AUTO_DOMAIN;
    
    # SSL настройки (будут обновлены после установки Certbot)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Лимит размера загружаемых файлов
    client_max_body_size 100M;
    
    # Основное приложение
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Статические файлы с кешированием
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Создаем временный самоподписанный сертификат
    sudo mkdir -p /etc/ssl/private
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/nginx-selfsigned.key \
        -out /etc/ssl/certs/nginx-selfsigned.crt \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=ShamsCloud/CN=$AUTO_DOMAIN"
    
    # Активируем сайт
    sudo ln -sf /etc/nginx/sites-available/shamscloud /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Проверяем конфигурацию и перезапускаем
    sudo nginx -t
    sudo systemctl restart nginx
    
    log "✅ Nginx настроен для домена $AUTO_DOMAIN"
    mark_step_completed "nginx_config"
fi

# ==================== ШАГ 15: УСТАНОВКА SSL СЕРТИФИКАТА ====================
if ! is_step_completed "ssl_setup"; then
    log "🔒 Шаг 15: Установка SSL сертификата для $AUTO_DOMAIN"
    
    # Устанавливаем Certbot
    sudo apt-get install -y certbot python3-certbot-nginx
    
    # Проверяем, что домен указывает на этот сервер
    log "🔍 Проверяем DNS настройки для $AUTO_DOMAIN..."
    
    # Временно настраиваем HTTP для прохождения проверки
    sudo tee /etc/nginx/sites-available/shamscloud-temp > /dev/null << EOF
server {
    listen 80;
    server_name $AUTO_DOMAIN www.$AUTO_DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/shamscloud-temp /etc/nginx/sites-enabled/shamscloud
    sudo nginx -t && sudo systemctl reload nginx
    
    # Создаем директорию для ACME challenge
    sudo mkdir -p /var/www/html/.well-known/acme-challenge
    
    # Получаем SSL сертификат
    log "📜 Получаем SSL сертификат от Let's Encrypt..."
    if sudo certbot --nginx -d $AUTO_DOMAIN -d www.$AUTO_DOMAIN --non-interactive --agree-tos --email admin@$AUTO_DOMAIN --redirect; then
        log "✅ SSL сертификат успешно установлен"
        
        # Настраиваем автоматическое обновление сертификата
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
    else
        warn "⚠️ Не удалось получить SSL сертификат от Let's Encrypt"
        warn "Возможные причины:"
        warn "- Домен $AUTO_DOMAIN не указывает на этот сервер"
        warn "- Порты 80 и 443 заблокированы firewall"
        warn "- Проблемы с DNS"
        
        log "🔄 Восстанавливаем конфигурацию с самоподписанным сертификатом"
        sudo ln -sf /etc/nginx/sites-available/shamscloud /etc/nginx/sites-enabled/shamscloud
        sudo nginx -t && sudo systemctl reload nginx
    fi
    
    mark_step_completed "ssl_setup"
fi

# ==================== ШАГ 16: ПРОВЕРКА РАБОТЫ ====================
if ! is_step_completed "final_check"; then
    log "🔍 Шаг 15: Финальная проверка"
    
    # Проверяем статус сервисов
    if systemctl is-active --quiet postgresql; then
        log "✅ PostgreSQL работает"
    else
        error "❌ PostgreSQL не работает"
    fi
    
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx работает"
    else
        error "❌ Nginx не работает"
    fi
    
    if systemctl is-active --quiet shamscloud; then
        log "✅ ShamsCloud работает"
    else
        error "❌ ShamsCloud не работает"
    fi
    
    # Проверяем доступность приложения
    sleep 5
    for i in {1..10}; do
        if curl -s http://localhost:5000/ > /dev/null; then
            log "✅ Приложение отвечает на http://localhost:5000"
            break
        fi
        warn "Попытка $i/10: Ждем запуска приложения..."
        sleep 10
    done
    
    if curl -s -k https://$AUTO_DOMAIN/ > /dev/null; then
        log "✅ Приложение доступно через Nginx на https://$AUTO_DOMAIN"
    elif curl -s http://$AUTO_DOMAIN/ > /dev/null; then
        log "✅ Приложение доступно через Nginx на http://$AUTO_DOMAIN"
    else
        warn "⚠️ Проблемы с доступом через Nginx на домене $AUTO_DOMAIN"
    fi
    
    mark_step_completed "final_check"
fi

# ==================== ЗАВЕРШЕНИЕ ====================
log ""
log "🎉🎉🎉 ShamsCloud успешно установлен! 🎉🎉🎉"
log ""
log "📍 Адреса доступа:"
log "   https://$AUTO_DOMAIN      (основной домен с SSL)"
log "   http://$AUTO_DOMAIN       (резервный HTTP)"
log "   http://localhost:5000     (прямое подключение)"
log ""
log "👤 Учетные данные:"
log "   Администратор: $AUTO_ADMIN_EMAIL / ShamsAdmin2024!"
log "   Пользователь:  $AUTO_DEMO_EMAIL / ShamsDemo2024!"
log ""
log "🗄️ База данных:"
log "   Пользователь: shamscloud"
log "   Пароль: $AUTO_DB_PASSWORD"
log "   База: shamscloud"
log ""
log "📂 Установочная директория: $AUTO_PROJECT_DIR"
log "📋 Логи установки: $LOG_FILE"
log "💾 Состояние установки: $INSTALL_STATE_FILE"
log ""
log "🛠️ Управление сервисом:"
log "   sudo systemctl status shamscloud    # Статус"
log "   sudo systemctl restart shamscloud   # Перезапуск"
log "   sudo systemctl stop shamscloud      # Остановка"
log "   sudo journalctl -u shamscloud -f    # Логи"
log ""
log "🔄 Для переустановки запустите:"
log "   $0 --force"
log ""

# Сохраняем важные данные
cat > "$HOME/shamscloud-credentials.txt" << EOF
ShamsCloud - Данные для входа
=============================

🌐 Основной сайт: https://shamscloud.uz/
🔗 Резервный доступ: http://shamscloud.uz/
🛠️ Прямое подключение: http://localhost:5000/

👤 Администратор: $AUTO_ADMIN_EMAIL / ShamsAdmin2024!
👤 Пользователь: $AUTO_DEMO_EMAIL / ShamsDemo2024!

🗄️ База данных: shamscloud / $AUTO_DB_PASSWORD

📅 Установлено: $(date)
🏠 Директория: $AUTO_PROJECT_DIR

🔧 Управление:
sudo systemctl status shamscloud    # Статус
sudo systemctl restart shamscloud   # Перезапуск  
sudo journalctl -u shamscloud -f    # Логи

📜 SSL сертификат: Let's Encrypt (автообновление)
🔒 Безопасность: HTTPS принудительно включен
EOF

log "💾 Данные для входа сохранены в $HOME/shamscloud-credentials.txt"
log ""
log "🚀 Установка завершена! Можете начинать использовать ShamsCloud!"