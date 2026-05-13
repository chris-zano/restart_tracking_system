package com.csniico.restart.admin.dto;

import com.csniico.restart.common.enums.WeekNumber;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class WeeklyTargetRequestDto {

    @NotNull(message = "Track ID must not be null")
    private Long trackId;

    @NotNull(message = "Week number must not be null")
    private WeekNumber weekNumber;

    private List<String> labs;

    private List<String> knowledgeChecks;
}

