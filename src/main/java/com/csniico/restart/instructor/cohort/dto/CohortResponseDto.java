package com.csniico.restart.instructor.cohort.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CohortResponseDto {
    private Long id;
    private String name;
    private String description;
    private Long trackId;
    private boolean active;
    private LocalDateTime createdAt;
}

