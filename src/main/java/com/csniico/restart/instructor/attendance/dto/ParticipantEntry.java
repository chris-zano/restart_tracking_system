package com.csniico.restart.instructor.attendance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ParticipantEntry {

    @NotNull(message = "Learner ID is required")
    private Long learnerId;

    @NotNull(message = "Participant duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer duration;
}

