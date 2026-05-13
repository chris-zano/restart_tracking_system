package com.csniico.restart.instructor.cohort.controller;

import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.cohort.dto.CohortRequestDto;
import com.csniico.restart.instructor.cohort.dto.CohortResponseDto;
import com.csniico.restart.instructor.cohort.service.CohortService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/cohorts")
public class CohortController {

    private final CohortService cohortService;

    public CohortController(CohortService cohortService) {
        this.cohortService = cohortService;
    }

    @PostMapping
    @Auditable(action = "CREATE_COHORT", resourceType = "COHORT")
    public ResponseEntity<ApiResponse<CohortResponseDto>> createCohort(
            @Valid @RequestBody CohortRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cohort created", cohortService.createCohort(request)));
    }

    @GetMapping
    @Auditable(action = "LIST_COHORTS", resourceType = "COHORT")
    public ResponseEntity<ApiResponse<List<CohortResponseDto>>> getAllCohorts() {
        return ResponseEntity.ok(ApiResponse.success(cohortService.getAllCohorts()));
    }

    @GetMapping("/{id}")
    @Auditable(action = "GET_COHORT", resourceType = "COHORT")
    public ResponseEntity<ApiResponse<CohortResponseDto>> getCohort(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cohortService.getCohortById(id)));
    }

    @PutMapping("/{id}")
    @Auditable(action = "UPDATE_COHORT", resourceType = "COHORT")
    public ResponseEntity<ApiResponse<CohortResponseDto>> updateCohort(
            @PathVariable Long id, @Valid @RequestBody CohortRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Cohort updated",
                cohortService.updateCohort(id, request)));
    }

    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE_COHORT", resourceType = "COHORT")
    public ResponseEntity<ApiResponse<Void>> deleteCohort(@PathVariable Long id) {
        cohortService.deleteCohort(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

