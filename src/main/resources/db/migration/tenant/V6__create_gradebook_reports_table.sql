CREATE TABLE gradebook_reports (
    cohort_id   BIGINT       PRIMARY KEY,
    report_json TEXT         NOT NULL,
    uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
