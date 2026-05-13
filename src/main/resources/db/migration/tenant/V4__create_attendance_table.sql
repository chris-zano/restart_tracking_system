CREATE TABLE IF NOT EXISTS attendance (
    id           BIGSERIAL PRIMARY KEY,
    cohort_id    BIGINT    NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    session_date DATE      NOT NULL,
    duration     INTEGER   NOT NULL,
    participants TEXT      NOT NULL DEFAULT '[]',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_cohort ON attendance(cohort_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_date ON attendance(session_date);


