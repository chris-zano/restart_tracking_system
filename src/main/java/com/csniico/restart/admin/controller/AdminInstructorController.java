package com.csniico.restart.admin.controller;

import com.csniico.restart.admin.dto.InstructorProvisionRequestDto;
import com.csniico.restart.admin.dto.InstructorResponseDto;
import com.csniico.restart.admin.service.AdminInstructorService;
import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/instructors")
public class AdminInstructorController {

    private final AdminInstructorService adminInstructorService;

    public AdminInstructorController(AdminInstructorService adminInstructorService) {
        this.adminInstructorService = adminInstructorService;
    }

    /**
     * Provision instructor credentials in a tenant schema.
     * POST /api/admin/instructors
     * Body: { "schemaName": "john_doe", "username": "john", "password": "secret123" }
     */
    @PostMapping
    @Auditable(action = "CREATE_INSTRUCTOR", resourceType = "INSTRUCTOR")
    public ResponseEntity<ApiResponse<InstructorResponseDto>> createInstructor(
            @Valid @RequestBody InstructorProvisionRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Instructor created",
                        adminInstructorService.createInstructor(request)));
    }

    /**
     * List all instructor accounts in a tenant schema.
     * GET /api/admin/instructors/{schemaName}
     */
    @GetMapping("/{schemaName}")
    @Auditable(action = "LIST_INSTRUCTORS", resourceType = "INSTRUCTOR")
    public ResponseEntity<ApiResponse<List<InstructorResponseDto>>> getInstructors(
            @PathVariable String schemaName) {
        return ResponseEntity.ok(ApiResponse.success(
                adminInstructorService.getInstructorsBySchema(schemaName)));
    }

    /**
     * Remove an instructor account from a tenant schema.
     * DELETE /api/admin/instructors/{schemaName}/{username}
     */
    @DeleteMapping("/{schemaName}/{username}")
    @Auditable(action = "DELETE_INSTRUCTOR", resourceType = "INSTRUCTOR")
    public ResponseEntity<ApiResponse<Void>> deleteInstructor(
            @PathVariable String schemaName,
            @PathVariable String username) {
        adminInstructorService.deleteInstructor(schemaName, username);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
