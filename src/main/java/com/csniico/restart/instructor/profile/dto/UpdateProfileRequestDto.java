package com.csniico.restart.instructor.profile.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequestDto {

    @NotBlank(message = "Display name must not be blank")
    private String displayName;

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Must be a valid email address")
    private String email;
}
