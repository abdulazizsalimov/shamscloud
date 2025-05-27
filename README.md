# 🌟 ShamsCloud

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
</div>

## 📋 Описание

**ShamsCloud** — это современное облачное хранилище файлов с продвинутой поддержкой доступности и многоязычности. Приложение разработано с фокусом на пользовательский опыт и интуитивный интерфейс.

### ✨ Ключевые особенности

- 🔐 **Безопасная аутентификация** - Поддержка Google OAuth и классической регистрации
- 🌍 **Многоязычность** - Полная поддержка русского и английского языков
- ♿ **Доступность** - Соответствие стандартам WCAG, поддержка скринридеров
- 🎨 **Адаптивный дизайн** - Современный интерфейс с темной/светлой темой
- 👥 **Административная панель** - Управление пользователями и системными настройками
- 📁 **Управление файлами** - Загрузка, организация и управление файлами
- 🔒 **Контроль квот** - Гибкая система управления дисковым пространством

## 🚀 Технологический стек

### Frontend
- **React 18** с TypeScript
- **Tailwind CSS** для стилизации
- **Shadcn/ui** компоненты
- **TanStack Query** для управления состоянием
- **Wouter** для маршрутизации
- **React Hook Form** для работы с формами

### Backend
- **Node.js** с Express.js
- **TypeScript** для типобезопасности
- **PostgreSQL** база данных
- **Drizzle ORM** для работы с БД
- **Multer** для загрузки файлов
- **Passport.js** для аутентификации

### Дополнительно
- **Firebase Authentication** для Google OAuth
- **Vite** для сборки frontend
- **ESBuild** для сборки backend

## 🛠️ Быстрая установка

### 🐳 Docker установка (Рекомендуется)

**Самый простой способ запуска в одну команду:**

```bash
# Клонируем репозиторий
git clone https://github.com/abdulazizsalimov/shamscloud.git
cd shamscloud

# Запускаем автоматическую установку
./docker-start.sh
```

**Готово!** Приложение доступно по адресу `http://localhost:5000`

**Тестовые аккаунты:**
- Администратор: `admin@shamscloud.com` / `admin123`
- Пользователь: `demo@shamscloud.com` / `demo123`

📖 **Подробное руководство:** [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)

### 📦 Ручная установка

### Подробная пошаговая установка

#### Шаг 1: Подготовка системы

**Обновление системы (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt upgrade -y
```

**Установка необходимых пакетов:**
```bash
sudo apt install -y curl wget git build-essential
```

#### Шаг 2: Установка Node.js 20

```bash
# Добавляем репозиторий NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Устанавливаем Node.js
sudo apt install -y nodejs

# Проверяем установку
node --version  # должно показать v20.x.x
npm --version   # должно показать версию npm
```

#### Шаг 3: Установка PostgreSQL

```bash
# Устанавливаем PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запускаем сервис
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверяем статус
sudo systemctl status postgresql
```

#### Шаг 4: Настройка базы данных

```bash
# Переключаемся на пользователя postgres
sudo -i -u postgres

# Создаем пользователя для приложения
createuser --interactive --pwprompt shamscloud
# Введите пароль для пользователя (запомните его!)
# Ответьте "n" на все вопросы о правах

# Создаем базу данных
createdb -O shamscloud shamscloud

# Выходим из сессии postgres
exit
```

#### Шаг 5: Клонирование и настройка проекта

```bash
# Клонируем репозиторий
git clone https://github.com/abdulazizsalimov/shamscloud.git
cd shamscloud

# Устанавливаем зависимости
npm install
```

#### Шаг 6: Конфигурация окружения

```bash
# Копируем файл с примером настроек
cp .env.example .env

# Редактируем файл конфигурации
nano .env
```

**Заполните .env файл следующими данными:**
```env
# Замените на ваши данные PostgreSQL
DATABASE_URL=postgresql://shamscloud:ваш_пароль@localhost:5432/shamscloud
PGHOST=localhost
PGPORT=5432
PGUSER=shamscloud
PGPASSWORD=ваш_пароль
PGDATABASE=shamscloud

# Окружение
NODE_ENV=development

# Firebase (опционально, для Google OAuth)
# VITE_FIREBASE_API_KEY=ваш_ключ
# VITE_FIREBASE_PROJECT_ID=ваш_проект
# VITE_FIREBASE_APP_ID=ваш_app_id
```

#### Шаг 7: Инициализация базы данных

```bash
# Создаем схему базы данных
npm run db:push

# Проверяем подключение к базе
psql -h localhost -U shamscloud -d shamscloud -c "\dt"
# Введите пароль пользователя shamscloud
```

#### Шаг 8: Сборка и запуск приложения

**Для разработки:**
```bash
npm run dev
```

**Для production:**
```bash
# Собираем приложение
npm run build

# Запускаем production версию
npm start
```

#### Шаг 9: Проверка работы

Откройте браузер и перейдите по адресу:
- **Разработка:** `http://localhost:5000`
- **Приложение:** Должна открыться главная страница ShamsCloud

#### Шаг 10: Создание администратора (опционально)

```bash
# Подключаемся к базе данных
psql -h localhost -U shamscloud -d shamscloud

# Создаем администратора (замените email и пароль)
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    'admin@example.com',
    'Administrator',
    '$2b$10$dummy_hash',  -- замените на хэш вашего пароля
    'admin',
    '107374182400',  -- 100GB квота
    '0',
    false,
    true,
    NOW()
);

# Выходим из psql
\q
```

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL=postgresql://username:password@localhost:5432/shamscloud
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=shamscloud

# Firebase (опционально)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Окружение
NODE_ENV=development
```

### Firebase настройка (для Google OAuth)

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Включите Google Authentication
3. Добавьте ваш домен в Authorized domains
4. Скопируйте конфигурацию в `.env` файл

## 📚 Структура проекта

```
shamscloud/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── providers/     # Context провайдеры
│   │   └── lib/          # Утилиты и библиотеки
├── server/                # Express backend
│   ├── auth.ts           # Аутентификация
│   ├── files.ts          # Управление файлами
│   ├── storage.ts        # Интерфейс хранилища
│   └── db.ts             # Подключение к БД
├── shared/                # Общие типы и схемы
│   └── schema.ts         # Drizzle схемы
└── uploads/              # Загруженные файлы
```

## 🎯 Основные команды

```bash
# Разработка
npm run dev              # Запуск в режиме разработки
npm run build            # Сборка для production
npm start               # Запуск production версии

# База данных
npm run db:push         # Применить изменения схемы
npm run db:studio       # Открыть Drizzle Studio

# Утилиты
npm run type-check      # Проверка типов TypeScript
npm run lint            # Проверка кода ESLint
```

## 🌐 Развертывание

### Требования для сервера
- Ubuntu 18.04+ или Debian 10+
- Node.js 20+
- PostgreSQL 12+
- Nginx (рекомендуется)
- Минимум 2GB RAM

### Production развертывание

Используйте автоматический скрипт установки `install-shamscloud.sh` который:
- Настроит все системные зависимости
- Создаст PostgreSQL базу данных
- Настроит Nginx reverse proxy
- Создаст systemd сервис
- Настроит SSL сертификат

Подробности в [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте feature ветку (`git checkout -b feature/amazing-feature`)
3. Сделайте коммит (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - смотрите [LICENSE](LICENSE) файл для деталей.

## 🆘 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте [Issues](https://github.com/abdulazizsalimov/shamscloud/issues) на GitHub
2. Создайте новый Issue с подробным описанием проблемы
3. Проверьте [документацию по развертыванию](./DEPLOYMENT_GUIDE.md)

## 📋 Changelog

### v1.3.0 (2025-01-26) - Полная клавиатурная доступность
#### ♿ Доступность
- **Полная клавиатурная навигация**: Добавлена поддержка стрелок вверх/вниз для навигации по файлам
- **Enter и Space активация**: Возможность открывать папки и скачивать файлы с клавиатуры
- **Backspace для возврата**: Быстрый возврат к родительской папке одной клавишей
- **Умные ARIA-объявления**: Четкие объявления "файл" или "папка" + название на русском языке
- **Границы навигации**: Убрано зацикливание, добавлены сообщения "Это первый/последний элемент списка"
- **Голосовая обратная связь**: "Папка открывается" и "Файл скачивается" при действиях
- **Автофокус**: Автоматический фокус на списке файлов при входе в папку

#### 🎯 Улучшения UX
- **Визуальные индикаторы фокуса**: Четкие границы фокуса для всех интерактивных элементов
- **Плавные переходы**: Анимации при навигации между папками
- **Оптимизированная производительность**: Улучшена скорость загрузки списков файлов

### v1.2.0 (2025-01-25) - Google OAuth и расширенное управление
#### 🔐 Аутентификация
- **Google OAuth интеграция**: Быстрый вход через Google аккаунт
- **Firebase Authentication**: Надежная система аутентификации
- **Управление сессиями**: Улучшенная безопасность сессий

#### 📁 Управление файлами
- **Публичное расшаривание**: Создание публичных ссылок на файлы и папки
- **Защита паролем**: Дополнительная безопасность для важных файлов
- **Варианты доступа**: Просмотр, скачивание, прямые ссылки
- **Обмен папками**: Возможность расшарить целые папки с содержимым

#### 👥 Администрирование
- **Панель администратора**: Полное управление пользователями
- **Управление квотами**: Гибкое назначение дискового пространства
- **Блокировка пользователей**: Контроль доступа к системе
- **Системные настройки**: Конфигурация параметров приложения

### v1.1.0 (2025-01-20) - Многоязычность и темизация
#### 🌍 Интернационализация
- **Поддержка русского языка**: Полная локализация интерфейса
- **Английский язык**: Интерфейс на английском языке
- **Переключение языков**: Динамическое изменение языка интерфейса
- **Локализация сообщений**: Перевод всех уведомлений и сообщений

#### 🎨 Интерфейс
- **Темная тема**: Полная поддержка темного режима
- **Светлая тема**: Оптимизированный светлый интерфейс
- **Адаптивный дизайн**: Отзывчивость на всех устройствах
- **Shadcn/ui компоненты**: Современные UI элементы

### v1.0.0 (2025-01-15) - Начальный релиз
#### 🚀 Основная функциональность
- **Управление файлами**: Загрузка, скачивание, организация файлов
- **Система папок**: Иерархическая структура для организации
- **Пользовательская система**: Регистрация и аутентификация
- **PostgreSQL интеграция**: Надежное хранение данных
- **Drizzle ORM**: Современная работа с базой данных

#### 🛠 Техническая основа
- **React 18**: Современный frontend фреймворк
- **TypeScript**: Типобезопасность во всем приложении
- **Express.js**: Надежный backend сервер
- **Tailwind CSS**: Гибкая система стилей
- **Vite**: Быстрая сборка и разработка

## 🔄 План развития

### v1.4.0 (Планируется)
- Полнотекстовый поиск по содержимому файлов
- Версионирование файлов
- Комментарии к файлам
- Теги и метаданные

### v1.5.0 (Планируется)  
- Мобильное приложение
- Синхронизация с облачными сервисами
- Расширенная аналитика использования
- API для интеграций

---

<div align="center">
  Сделано с ❤️ для доступного облачного хранилища
</div>