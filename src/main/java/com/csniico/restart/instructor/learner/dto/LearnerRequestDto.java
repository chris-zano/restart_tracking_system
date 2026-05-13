package com.csniico.restart.instructor.learner.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LearnerRequestDto {

    @NotBlank(message = "Full name is required")
    private String fullname;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^0[2-5]\\d{8}$", message = "Phone must be a valid 10-digit Ghanaian number starting with 02-05")
    private String phone;

    private String gender;

    private String location;

    private String region;

    private String institution;

    private boolean graduated = false;

    private Long cohortId;
}

