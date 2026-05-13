package com.csniico.restart.instructor.cohort.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CohortRequestDto {

    @NotBlank(message = "Cohort name must not be blank")
    private String name;

    private String description;

    private Long trackId;
}

