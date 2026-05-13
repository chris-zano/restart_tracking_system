package com.csniico.restart.instructor.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class AttendanceRequestDto {

    @NotNull(message = "Cohort ID is required")
    private Long cohortId;

    @NotNull(message = "Session date is required")
    private LocalDate sessionDate;

    @NotNull(message = "Session duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer duration;

    @NotEmpty(message = "At least one participant is required")
    @Valid
    private List<ParticipantEntry> participants;
}

