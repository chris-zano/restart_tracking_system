package com.csniico.restart.instructor.weeklytarget;

import com.csniico.restart.admin.dto.WeeklyTargetResponseDto;
import com.csniico.restart.admin.service.WeeklyTargetService;
import com.csniico.restart.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/weekly-targets")
public class InstructorWeeklyTargetController {

    private final WeeklyTargetService weeklyTargetService;

    public InstructorWeeklyTargetController(WeeklyTargetService weeklyTargetService) {
        this.weeklyTargetService = weeklyTargetService;
    }

    @GetMapping("/track/{trackId}")
    public ResponseEntity<ApiResponse<List<WeeklyTargetResponseDto>>> getByTrack(
            @PathVariable Long trackId) {
        return ResponseEntity.ok(ApiResponse.success(
                weeklyTargetService.getWeeklyTargetsByTrack(trackId)));
    }
}
