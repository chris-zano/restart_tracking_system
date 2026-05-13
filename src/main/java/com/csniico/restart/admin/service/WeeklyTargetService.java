package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.WeeklyTargetRequestDto;
import com.csniico.restart.admin.dto.WeeklyTargetResponseDto;
import com.csniico.restart.common.enums.WeekNumber;

import java.util.List;

public interface WeeklyTargetService {
    WeeklyTargetResponseDto createWeeklyTarget(WeeklyTargetRequestDto request);
    WeeklyTargetResponseDto updateWeeklyTarget(Long id, WeeklyTargetRequestDto request);
    WeeklyTargetResponseDto getWeeklyTargetById(Long id);
    List<WeeklyTargetResponseDto> getWeeklyTargetsByTrack(Long trackId);
    WeeklyTargetResponseDto getWeeklyTargetByTrackAndWeek(Long trackId, WeekNumber weekNumber);
    void deleteWeeklyTarget(Long id);
}

