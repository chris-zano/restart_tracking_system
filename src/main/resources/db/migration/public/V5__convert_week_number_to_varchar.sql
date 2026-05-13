-- Hibernate's @Enumerated(EnumType.STRING) binds enum values as character varying.
-- PostgreSQL refuses to compare a week_number ENUM column against varchar without
-- an explicit cast, causing "operator does not exist: week_number = character varying".
-- Converting to VARCHAR(50) + CHECK constraint keeps data-integrity at the DB level
-- while letting Hibernate bind the value natively.

ALTER TABLE public.weekly_targets
    ALTER COLUMN week_number TYPE VARCHAR(50) USING week_number::VARCHAR;

DROP TYPE IF EXISTS week_number;

ALTER TABLE public.weekly_targets
    ADD CONSTRAINT chk_week_number_values CHECK (week_number IN (
        'WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4', 'WEEK_5',
        'WEEK_6', 'WEEK_7', 'WEEK_8', 'WEEK_9', 'WEEK_10'
    ));
