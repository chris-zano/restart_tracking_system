package com.csniico.restart.instructor.learner.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class LearnerResponseDto {
    private Long id;
    private String fullname;
    private String email;
    private String phone;
    private String gender;
    private String location;
    private String region;
    private String institution;
    private boolean graduated;
    private Long cohortId;
    private LocalDateTime createdAt;
}

