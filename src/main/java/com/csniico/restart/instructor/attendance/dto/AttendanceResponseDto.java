package com.csniico.restart.instructor.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class AttendanceResponseDto {
    private Long id;
    private Long cohortId;
    private LocalDate sessionDate;
    private Integer duration;
    private List<ParticipantEntry> participants;
    private LocalDateTime createdAt;
}

