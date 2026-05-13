CREATE TABLE IF NOT EXISTS learners (
    id          BIGSERIAL PRIMARY KEY,
    fullname    VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(10)  NOT NULL,
    university  VARCHAR(255),
    graduated   BOOLEAN      NOT NULL DEFAULT FALSE,
    cohort_id   BIGINT       REFERENCES cohorts(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

