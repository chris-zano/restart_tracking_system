package com.csniico.restart.instructor.attendance.service;

import com.csniico.restart.instructor.attendance.dto.AttendanceRequestDto;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;

import java.util.List;

public interface AttendanceService {
    AttendanceResponseDto createAttendance(AttendanceRequestDto request);
    List<AttendanceResponseDto> getAllAttendance();
    List<AttendanceResponseDto> getAttendanceByCohort(Long cohortId);
    AttendanceResponseDto getAttendanceById(Long id);
    AttendanceResponseDto updateAttendance(Long id, AttendanceRequestDto request);
    void deleteAttendance(Long id);
}

