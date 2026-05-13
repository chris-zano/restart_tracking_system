CREATE TABLE IF NOT EXISTS admin_users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'ADMIN',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

