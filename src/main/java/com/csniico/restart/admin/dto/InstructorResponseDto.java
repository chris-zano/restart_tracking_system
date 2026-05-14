package com.csniico.restart.admin.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class InstructorResponseDto {
    private Long id;
    private String username;
    private String displayName;
    private String email;
    private String schemaName;
    private String role;
    private boolean active;
    private LocalDateTime createdAt;
    /** Only populated on initial creation — null on all other reads. */
    private String tempPassword;
}
