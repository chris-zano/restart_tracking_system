package com.csniico.restart.instructor.progress.controller;

import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.progress.dto.ProgressReportResponseDto;
import com.csniico.restart.instructor.progress.dto.ProgressUploadRequestDto;
import com.csniico.restart.instructor.progress.service.ProgressService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/instructor/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    /**
     * POST /api/instructor/progress/report
     *
     * Accepts a parsed Canvas Gradebook export (JSON) and returns a progress report
     * grouped by weekly targets for the specified cohort.
     */
    @PostMapping("/report")
    @Auditable(action = "GENERATE_PROGRESS_REPORT", resourceType = "PROGRESS")
    public ResponseEntity<ApiResponse<ProgressReportResponseDto>> generateReport(
            @Valid @RequestBody ProgressUploadRequestDto request) {
        return ResponseEntity.ok(
                ApiResponse.success(progressService.generateReport(request)));
    }

    @GetMapping("/report/cohort/{cohortId}")
    public ResponseEntity<ApiResponse<ProgressReportResponseDto>> getSavedReport(
            @PathVariable Long cohortId) {
        return ResponseEntity.ok(
                ApiResponse.success(progressService.getSavedReport(cohortId)));
    }

    @DeleteMapping("/report/cohort/{cohortId}")
    @Auditable(action = "DELETE_PROGRESS_REPORT", resourceType = "PROGRESS")
    public ResponseEntity<ApiResponse<Void>> deleteReport(@PathVariable Long cohortId) {
        progressService.deleteReport(cohortId);
        return ResponseEntity.ok(ApiResponse.success("Report cleared", null));
    }
}

