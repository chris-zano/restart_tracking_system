package com.csniico.restart.instructor.profile.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileResponseDto {
    private String username;
    private String displayName;
    private String email;
    private boolean mustChangePassword;
}
