CREATE TABLE IF NOT EXISTS tracks (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE week_number AS ENUM (
    'WEEK_1','WEEK_2','WEEK_3','WEEK_4','WEEK_5',
    'WEEK_6','WEEK_7','WEEK_8','WEEK_9','WEEK_10'
);

CREATE TABLE IF NOT EXISTS weekly_targets (
    id               BIGSERIAL PRIMARY KEY,
    track_id         BIGINT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    week_number      week_number NOT NULL,
    labs             TEXT NOT NULL DEFAULT '[]',
    knowledge_checks TEXT NOT NULL DEFAULT '[]',
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (track_id, week_number)
);

