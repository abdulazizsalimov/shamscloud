-- Создание администратора по умолчанию
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    'admin@shamscloud.com',
    'Administrator',
    '$2b$10$HwzHHQlNXQNOjQNKj3s9wOLXz8qNvxjKwq1p/JvYAh.Q5s6DPOG8e',  -- пароль: admin123
    'admin',
    '107374182400',  -- 100GB
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Создание демо пользователя
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    'demo@shamscloud.com',
    'Demo User',
    '$2b$10$HwzHHQlNXQNOjQNKj3s9wOLXz8qNvxjKwq1p/JvYAh.Q5s6DPOG8e',  -- пароль: demo123
    'user',
    '5368709120',   -- 5GB
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;