package com.csniico.restart.admin.service;

import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;

import java.util.List;

public interface AdminAttendanceService {
    List<AttendanceResponseDto> getAllAttendance(String schemaName);
    List<AttendanceResponseDto> getAttendanceByCohort(String schemaName, Long cohortId);
    AttendanceResponseDto getAttendanceById(String schemaName, Long id);
}

