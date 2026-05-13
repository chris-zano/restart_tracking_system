package com.csniico.restart.admin.controller;

import com.csniico.restart.admin.service.AdminAttendanceService;
import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tenants/{schemaName}/attendance")
public class AdminTenantAttendanceController {

    private final AdminAttendanceService adminAttendanceService;

    public AdminTenantAttendanceController(AdminAttendanceService adminAttendanceService) {
        this.adminAttendanceService = adminAttendanceService;
    }

    @GetMapping
    @Auditable(action = "ADMIN_LIST_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<List<AttendanceResponseDto>>> getAllAttendance(
            @PathVariable String schemaName) {
        return ResponseEntity.ok(ApiResponse.success(adminAttendanceService.getAllAttendance(schemaName)));
    }

    @GetMapping("/cohort/{cohortId}")
    @Auditable(action = "ADMIN_LIST_ATTENDANCE_BY_COHORT", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<List<AttendanceResponseDto>>> getAttendanceByCohort(
            @PathVariable String schemaName, @PathVariable Long cohortId) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAttendanceService.getAttendanceByCohort(schemaName, cohortId)));
    }

    @GetMapping("/{id}")
    @Auditable(action = "ADMIN_GET_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<AttendanceResponseDto>> getAttendanceById(
            @PathVariable String schemaName, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                adminAttendanceService.getAttendanceById(schemaName, id)));
    }
}

