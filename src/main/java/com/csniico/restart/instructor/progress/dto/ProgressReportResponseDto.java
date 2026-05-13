package com.csniico.restart.instructor.progress.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProgressReportResponseDto {

    private Long cohortId;
    private String cohortName;
    private List<LearnerProgressDto> learners;
    /** ISO-8601 instant — set when the report was saved to / loaded from the database. */
    private String uploadedAt;

    @Getter
    @Setter
    public static class LearnerProgressDto {
        /** DB learner id — null if this gradebook entry could not be matched */
        private Long learnerId;
        /** fullname from the DB (null if unmatched) */
        private String learnerDbName;
        /** name as it appears in the Canvas gradebook */
        private String gradebookName;
        private boolean matched;
        private List<WeekProgressDto> weeks;
    }

    @Getter
    @Setter
    public static class WeekProgressDto {
        private String weekNumber;
        private List<ItemProgressDto> labs;
        private List<ItemProgressDto> knowledgeChecks;
        private int labsCompleted;
        private int labsTotal;
        private int kcCompleted;
        private int kcTotal;
    }

    @Getter
    @Setter
    public static class ItemProgressDto {
        private String title;
        private boolean completed;
        /** Raw score string from Canvas, null if column not found */
        private String score;
        /** True if a matching column was found in the Canvas gradebook */
        private boolean foundInGradebook;
    }
}

