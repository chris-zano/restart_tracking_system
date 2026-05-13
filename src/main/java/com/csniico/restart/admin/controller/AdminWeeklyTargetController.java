package com.csniico.restart.admin.controller;

import com.csniico.restart.admin.dto.WeeklyTargetRequestDto;
import com.csniico.restart.admin.dto.WeeklyTargetResponseDto;
import com.csniico.restart.admin.service.WeeklyTargetService;
import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.enums.WeekNumber;
import com.csniico.restart.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/weekly-targets")
public class AdminWeeklyTargetController {

    private final WeeklyTargetService weeklyTargetService;

    public AdminWeeklyTargetController(WeeklyTargetService weeklyTargetService) {
        this.weeklyTargetService = weeklyTargetService;
    }

    /** POST /api/admin/weekly-targets */
    @PostMapping
    @Auditable(action = "CREATE_WEEKLY_TARGET", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<WeeklyTargetResponseDto>> create(
            @Valid @RequestBody WeeklyTargetRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Weekly target created", weeklyTargetService.createWeeklyTarget(request)));
    }

    /** GET /api/admin/weekly-targets/{id} */
    @GetMapping("/{id}")
    @Auditable(action = "GET_WEEKLY_TARGET", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<WeeklyTargetResponseDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(weeklyTargetService.getWeeklyTargetById(id)));
    }

    /** GET /api/admin/weekly-targets/track/{trackId} */
    @GetMapping("/track/{trackId}")
    @Auditable(action = "LIST_WEEKLY_TARGETS_BY_TRACK", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<List<WeeklyTargetResponseDto>>> getByTrack(@PathVariable Long trackId) {
        return ResponseEntity.ok(ApiResponse.success(weeklyTargetService.getWeeklyTargetsByTrack(trackId)));
    }

    /** GET /api/admin/weekly-targets/track/{trackId}/week/{weekNumber} */
    @GetMapping("/track/{trackId}/week/{weekNumber}")
    @Auditable(action = "GET_WEEKLY_TARGET_BY_TRACK_WEEK", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<WeeklyTargetResponseDto>> getByTrackAndWeek(
            @PathVariable Long trackId, @PathVariable WeekNumber weekNumber) {
        return ResponseEntity.ok(ApiResponse.success(
                weeklyTargetService.getWeeklyTargetByTrackAndWeek(trackId, weekNumber)));
    }

    /** PUT /api/admin/weekly-targets/{id} */
    @PutMapping("/{id}")
    @Auditable(action = "UPDATE_WEEKLY_TARGET", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<WeeklyTargetResponseDto>> update(
            @PathVariable Long id, @Valid @RequestBody WeeklyTargetRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Weekly target updated",
                weeklyTargetService.updateWeeklyTarget(id, request)));
    }

    /** DELETE /api/admin/weekly-targets/{id} */
    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE_WEEKLY_TARGET", resourceType = "WEEKLY_TARGET")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        weeklyTargetService.deleteWeeklyTarget(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
