package com.csniico.restart.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponseDto {
    private String token;
    private String role;
    private String tenantId;
}

