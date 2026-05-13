package com.csniico.restart.portal;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import com.csniico.restart.instructor.attendance.entity.Attendance;
import com.csniico.restart.instructor.attendance.repository.AttendanceRepository;
import com.csniico.restart.instructor.cohort.entity.Cohort;
import com.csniico.restart.instructor.cohort.repository.CohortRepository;
import com.csniico.restart.instructor.learner.entity.Learner;
import com.csniico.restart.instructor.learner.repository.LearnerRepository;
import com.csniico.restart.instructor.progress.dto.ProgressReportResponseDto;
import com.csniico.restart.instructor.progress.service.ProgressService;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/{schemaName}/cohorts/{cohortId}")
public class PublicDashboardController {

    private final TenantRepository     tenantRepository;
    private final CohortRepository     cohortRepository;
    private final LearnerRepository    learnerRepository;
    private final AttendanceRepository attendanceRepository;
    private final ProgressService      progressService;

    public PublicDashboardController(
            TenantRepository tenantRepository,
            CohortRepository cohortRepository,
            LearnerRepository learnerRepository,
            AttendanceRepository attendanceRepository,
            ProgressService progressService) {
        this.tenantRepository     = tenantRepository;
        this.cohortRepository     = cohortRepository;
        this.learnerRepository    = learnerRepository;
        this.attendanceRepository = attendanceRepository;
        this.progressService      = progressService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<PublicDashboardDto>> getDashboard(
            @PathVariable String schemaName,
            @PathVariable Long cohortId) {

        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }

        TenantContext.setTenant(schemaName);
        try {
            Cohort cohort = cohortRepository.findById(cohortId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cohort not found: " + cohortId));

            List<PublicDashboardDto.PublicLearnerDto> learners =
                    learnerRepository.findAllByCohortId(cohortId).stream()
                            .map(this::toLearnerDto)
                            .toList();

            List<AttendanceResponseDto> attendance =
                    attendanceRepository.findAllByCohortId(cohortId).stream()
                            .map(this::toAttendanceDto)
                            .toList();

            ProgressReportResponseDto progress = null;
            try {
                progress = progressService.getSavedReport(cohortId);
            } catch (ResourceNotFoundException ignored) {
                // no gradebook uploaded yet — that's fine
            }

            PublicDashboardDto dto = new PublicDashboardDto();
            dto.setCohortName(cohort.getName());
            dto.setLearners(learners);
            dto.setAttendance(attendance);
            dto.setProgressReport(progress);

            return ResponseEntity.ok(ApiResponse.success(dto));
        } finally {
            TenantContext.clearTenant();
        }
    }

    private PublicDashboardDto.PublicLearnerDto toLearnerDto(Learner l) {
        PublicDashboardDto.PublicLearnerDto d = new PublicDashboardDto.PublicLearnerDto();
        d.setId(l.getId());
        d.setFullname(l.getFullname());
        return d;
    }

    private AttendanceResponseDto toAttendanceDto(Attendance a) {
        AttendanceResponseDto d = new AttendanceResponseDto();
        d.setId(a.getId());
        d.setCohortId(a.getCohortId());
        d.setSessionDate(a.getSessionDate());
        d.setDuration(a.getDuration());
        d.setParticipants(a.getParticipants());
        d.setCreatedAt(a.getCreatedAt());
        return d;
    }
}
