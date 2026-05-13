package com.csniico.restart.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackRequestDto {

    @NotBlank(message = "Track name is required")
    private String name;

    private String description;
}

