package com.csniico.restart.admin.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class TrackResponseDto {

    private Long id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
}

