package com.csniico.restart.instructor.attendance.controller;

import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.attendance.dto.AttendanceRequestDto;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import com.csniico.restart.instructor.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping
    @Auditable(action = "CREATE_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<AttendanceResponseDto>> createAttendance(
            @Valid @RequestBody AttendanceRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Attendance recorded", attendanceService.createAttendance(request)));
    }

    @GetMapping
    @Auditable(action = "LIST_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<List<AttendanceResponseDto>>> getAllAttendance() {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAllAttendance()));
    }

    @GetMapping("/cohort/{cohortId}")
    @Auditable(action = "LIST_ATTENDANCE_BY_COHORT", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<List<AttendanceResponseDto>>> getAttendanceByCohort(
            @PathVariable Long cohortId) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAttendanceByCohort(cohortId)));
    }

    @GetMapping("/{id}")
    @Auditable(action = "GET_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<AttendanceResponseDto>> getAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getAttendanceById(id)));
    }

    @PutMapping("/{id}")
    @Auditable(action = "UPDATE_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<AttendanceResponseDto>> updateAttendance(
            @PathVariable Long id, @Valid @RequestBody AttendanceRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Attendance updated",
                attendanceService.updateAttendance(id, request)));
    }

    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE_ATTENDANCE", resourceType = "ATTENDANCE")
    public ResponseEntity<ApiResponse<Void>> deleteAttendance(@PathVariable Long id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

