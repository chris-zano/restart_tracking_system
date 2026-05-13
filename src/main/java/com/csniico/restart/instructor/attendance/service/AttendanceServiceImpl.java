package com.csniico.restart.instructor.attendance.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.attendance.dto.AttendanceRequestDto;
import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import com.csniico.restart.instructor.attendance.dto.ParticipantEntry;
import com.csniico.restart.instructor.attendance.entity.Attendance;
import com.csniico.restart.instructor.attendance.repository.AttendanceRepository;
import com.csniico.restart.instructor.cohort.repository.CohortRepository;
import com.csniico.restart.instructor.learner.repository.LearnerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final CohortRepository cohortRepository;
    private final LearnerRepository learnerRepository;

    public AttendanceServiceImpl(AttendanceRepository attendanceRepository,
                                 CohortRepository cohortRepository,
                                 LearnerRepository learnerRepository) {
        this.attendanceRepository = attendanceRepository;
        this.cohortRepository = cohortRepository;
        this.learnerRepository = learnerRepository;
    }

    @Override
    @Transactional
    public AttendanceResponseDto createAttendance(AttendanceRequestDto request) {
        validateCohortExists(request.getCohortId());
        validateLearnerIds(request.getParticipants());
        Attendance attendance = fromDto(request);
        return toDto(attendanceRepository.save(attendance));
    }

    @Override
    public List<AttendanceResponseDto> getAllAttendance() {
        return attendanceRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public List<AttendanceResponseDto> getAttendanceByCohort(Long cohortId) {
        validateCohortExists(cohortId);
        return attendanceRepository.findAllByCohortId(cohortId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public AttendanceResponseDto getAttendanceById(Long id) {
        return attendanceRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found: " + id));
    }

    @Override
    @Transactional
    public AttendanceResponseDto updateAttendance(Long id, AttendanceRequestDto request) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found: " + id));
        validateCohortExists(request.getCohortId());
        validateLearnerIds(request.getParticipants());
        attendance.setCohortId(request.getCohortId());
        attendance.setSessionDate(request.getSessionDate());
        attendance.setDuration(request.getDuration());
        attendance.setParticipants(request.getParticipants());
        return toDto(attendanceRepository.save(attendance));
    }

    @Override
    @Transactional
    public void deleteAttendance(Long id) {
        if (!attendanceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Attendance record not found: " + id);
        }
        attendanceRepository.deleteById(id);
    }

    private void validateCohortExists(Long cohortId) {
        if (!cohortRepository.existsById(cohortId)) {
            throw new ResourceNotFoundException("Cohort not found: " + cohortId);
        }
    }

    private void validateLearnerIds(List<ParticipantEntry> participants) {
        Set<Long> requestedIds = participants.stream()
                .map(ParticipantEntry::getLearnerId)
                .collect(Collectors.toSet());

        Set<Long> foundIds = learnerRepository.findAllById(requestedIds).stream()
                .map(l -> l.getId())
                .collect(Collectors.toSet());

        Set<Long> missing = requestedIds.stream()
                .filter(id -> !foundIds.contains(id))
                .collect(Collectors.toSet());

        if (!missing.isEmpty()) {
            throw new ResourceNotFoundException("Learner IDs not found: " + missing);
        }
    }

    private Attendance fromDto(AttendanceRequestDto dto) {
        Attendance a = new Attendance();
        a.setCohortId(dto.getCohortId());
        a.setSessionDate(dto.getSessionDate());
        a.setDuration(dto.getDuration());
        a.setParticipants(dto.getParticipants());
        return a;
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

