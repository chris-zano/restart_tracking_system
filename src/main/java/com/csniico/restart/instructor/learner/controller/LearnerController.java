package com.csniico.restart.instructor.learner.controller;

import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;
import com.csniico.restart.instructor.learner.service.LearnerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/learners")
public class LearnerController {

    private final LearnerService learnerService;

    public LearnerController(LearnerService learnerService) {
        this.learnerService = learnerService;
    }

    @PostMapping
    @Auditable(action = "CREATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> createLearner(
            @Valid @RequestBody LearnerRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Learner created", learnerService.createLearner(request)));
    }

    @PostMapping("/bulk")
    @Auditable(action = "BULK_CREATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<List<LearnerResponseDto>>> createBulkLearners(
            @Valid @RequestBody List<LearnerRequestDto> requests) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Learners created", learnerService.createBulkLearners(requests)));
    }

    @GetMapping
    @Auditable(action = "LIST_LEARNERS", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<List<LearnerResponseDto>>> getAllLearners() {
        return ResponseEntity.ok(ApiResponse.success(learnerService.getAllLearners()));
    }

    @GetMapping("/{id}")
    @Auditable(action = "GET_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> getLearner(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(learnerService.getLearnerById(id)));
    }

    @PutMapping("/{id}")
    @Auditable(action = "UPDATE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<LearnerResponseDto>> updateLearner(
            @PathVariable Long id, @Valid @RequestBody LearnerRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Learner updated", learnerService.updateLearner(id, request)));
    }

    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE_LEARNER", resourceType = "LEARNER")
    public ResponseEntity<ApiResponse<Void>> deleteLearner(@PathVariable Long id) {
        learnerService.deleteLearner(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

