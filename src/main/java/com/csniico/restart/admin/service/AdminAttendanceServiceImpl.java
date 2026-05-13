package com.csniico.restart.admin.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import com.csniico.restart.instructor.attendance.entity.Attendance;
import com.csniico.restart.instructor.attendance.repository.AttendanceRepository;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAttendanceServiceImpl implements AdminAttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final TenantRepository tenantRepository;

    public AdminAttendanceServiceImpl(AttendanceRepository attendanceRepository,
                                      TenantRepository tenantRepository) {
        this.attendanceRepository = attendanceRepository;
        this.tenantRepository = tenantRepository;
    }

    @Override
    public List<AttendanceResponseDto> getAllAttendance(String schemaName) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return attendanceRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public List<AttendanceResponseDto> getAttendanceByCohort(String schemaName, Long cohortId) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return attendanceRepository.findAllByCohortId(cohortId).stream()
                    .map(this::toDto).collect(Collectors.toList());
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public AttendanceResponseDto getAttendanceById(String schemaName, Long id) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return attendanceRepository.findById(id)
                    .map(this::toDto)
                    .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found: " + id));
        } finally {
            TenantContext.clearTenant();
        }
    }

    private void validateTenant(String schemaName) {
        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }
    }

    private AttendanceResponseDto toDto(Attendance a) {
        AttendanceResponseDto dto = new AttendanceResponseDto();
        dto.setId(a.getId());
        dto.setCohortId(a.getCohortId());
        dto.setSessionDate(a.getSessionDate());
        dto.setDuration(a.getDuration());
        dto.setParticipants(a.getParticipants());
        dto.setCreatedAt(a.getCreatedAt());
        return dto;
    }
}

