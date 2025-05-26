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

### Автоматическая установка (рекомендуется)

```bash
# Скачайте install-shamscloud.sh с репозитория
wget https://raw.githubusercontent.com/your-username/shamscloud/main/install-shamscloud.sh
chmod +x install-shamscloud.sh
./install-shamscloud.sh
```

### Ручная установка

1. **Клонирование репозитория:**
```bash
git clone https://github.com/your-username/shamscloud.git
cd shamscloud
```

2. **Установка зависимостей:**
```bash
npm install
```

3. **Настройка базы данных:**
```bash
# Создайте PostgreSQL базу данных
createdb shamscloud

# Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env файл
```

4. **Инициализация схемы БД:**
```bash
npm run db:push
```

5. **Запуск в режиме разработки:**
```bash
npm run dev
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

1. Проверьте [Issues](https://github.com/your-username/shamscloud/issues) на GitHub
2. Создайте новый Issue с подробным описанием проблемы
3. Проверьте [документацию по развертыванию](./DEPLOYMENT_GUIDE.md)

## 🔄 Версии

- **v1.0.0** - Начальный релиз с базовой функциональностью
- **v1.1.0** - Добавлена Google аутентификация
- **v1.2.0** - Улучшена доступность и многоязычность

---

<div align="center">
  Сделано с ❤️ для доступного облачного хранилища
</div>