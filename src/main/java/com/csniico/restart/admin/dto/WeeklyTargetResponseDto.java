package com.csniico.restart.admin.dto;

import com.csniico.restart.common.enums.WeekNumber;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class WeeklyTargetResponseDto {

    private Long id;
    private Long trackId;
    private WeekNumber weekNumber;
    private List<String> labs;
    private List<String> knowledgeChecks;
    private LocalDateTime createdAt;
}

