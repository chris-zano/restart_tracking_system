package com.csniico.restart.instructor.progress.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class ProgressUploadRequestDto {

    @NotNull(message = "Cohort ID is required")
    private Long cohortId;

    @NotNull(message = "Student entries are required")
    private List<StudentGradebookEntry> students;

    @Getter
    @Setter
    public static class StudentGradebookEntry {
        /** Full name (or email) as it appears in the Canvas gradebook Student column. */
        private String studentName;
        /** Email from the SIS Login ID column — used for strict email matching. */
        private String email;
        /**
         * Map of Canvas column header → raw score string.
         * Empty/null string means not submitted.
         */
        private Map<String, String> scores;
    }
}

