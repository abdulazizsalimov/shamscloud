# 🚀 ShamsCloud - Автоматическая установка за 5 минут

## Простая установка одной командой

```bash
# Скачиваем и запускаем автоустановщик
wget -O - https://raw.githubusercontent.com/abdulazizsalimov/shamscloud/main/auto-install.sh | bash
```

**ИЛИ** если у вас уже есть файлы:

```bash
# Если скачали проект
cd shamscloud
sudo ./auto-install.sh
```

## Что происходит автоматически

✅ **Системные пакеты** - Node.js 20, PostgreSQL 16, Nginx  
✅ **База данных** - Создание пользователя и схемы  
✅ **Приложение** - Сборка и настройка  
✅ **Тестовые данные** - Готовые аккаунты администратора и пользователя  
✅ **Веб-сервер** - Настройка Nginx как reverse proxy  
✅ **Автозапуск** - Systemd сервис для автоматического старта  

## После установки

**Приложение доступно:**
- `http://localhost` (через Nginx)
- `http://localhost:5000` (прямое подключение)

**Готовые аккаунты:**
- Администратор: `admin@shamscloud.local` / `ShamsAdmin2024!`
- Пользователь: `demo@shamscloud.local` / `ShamsDemo2024!`

**Данные сохранены в:** `~/shamscloud-credentials.txt`

## Управление

```bash
# Статус приложения
sudo systemctl status shamscloud

# Перезапуск
sudo systemctl restart shamscloud

# Просмотр логов
sudo journalctl -u shamscloud -f

# Полная переустановка
sudo ./auto-install.sh --force
```

## Возможные проблемы

**Приложение не запускается:**
```bash
sudo journalctl -u shamscloud -n 50
```

**Проблемы с базой данных:**
```bash
sudo systemctl status postgresql
```

**Nginx показывает ошибку:**
```bash
sudo nginx -t
sudo systemctl status nginx
```

## Системные требования

- Ubuntu 18.04+ или Debian 10+
- 2GB RAM (рекомендуется 4GB)
- 5GB свободного места
- Sudo права
- Интернет соединение

---

**Время установки:** 5-10 минут  
**Поддержка:** Все настраивается автоматически, без вашего участия!