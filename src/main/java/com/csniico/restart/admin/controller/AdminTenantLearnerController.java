package com.csniico.restart.admin.controller;

import com.csniico.restart.admin.service.AdminLearnerService;
import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tenants/{schemaName}/learners")
public class AdminTenantLearnerController {

    private final AdminLearnerService adminLearnerService;

    public AdminTenantLearnerController(AdminLearnerService adminLearnerService) {
        this.adminLearnerService = adminLearnerService;
    }

    @PostMapping
    @Auditable(action = "ADMIN_CREATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> createLearner(
            @PathVariable String schemaName,
            @Valid @RequestBody LearnerRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Learner created", adminLearnerService.createLearner(schemaName, request)));
    }

    @PostMapping("/bulk")
    @Auditable(action = "ADMIN_BULK_CREATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<List<LearnerResponseDto>>> createBulkLearners(
            @PathVariable String schemaName,
            @Valid @RequestBody List<LearnerRequestDto> requests) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Learners created", adminLearnerService.createBulkLearners(schemaName, requests)));
    }

    @GetMapping
    @Auditable(action = "ADMIN_LIST_LEARNERS", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<List<LearnerResponseDto>>> getAllLearners(@PathVariable String schemaName) {
        return ResponseEntity.ok(ApiResponse.success(adminLearnerService.getAllLearners(schemaName)));
    }

    @GetMapping("/{id}")
    @Auditable(action = "ADMIN_GET_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> getLearner(
            @PathVariable String schemaName, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminLearnerService.getLearnerById(schemaName, id)));
    }

    @PutMapping("/{id}")
    @Auditable(action = "ADMIN_UPDATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> updateLearner(
            @PathVariable String schemaName,
            @PathVariable Long id,
            @Valid @RequestBody LearnerRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Learner updated",
                adminLearnerService.updateLearner(schemaName, id, request)));
    }

    @DeleteMapping("/{id}")
    @Auditable(action = "ADMIN_DELETE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<Void>> deleteLearner(
            @PathVariable String schemaName, @PathVariable Long id) {
        adminLearnerService.deleteLearner(schemaName, id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

