package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.WeeklyTargetRequestDto;
import com.csniico.restart.admin.dto.WeeklyTargetResponseDto;
import com.csniico.restart.admin.entity.WeeklyTarget;
import com.csniico.restart.admin.repository.TrackRepository;
import com.csniico.restart.admin.repository.WeeklyTargetRepository;
import com.csniico.restart.common.enums.WeekNumber;
import com.csniico.restart.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WeeklyTargetServiceImpl implements WeeklyTargetService {

    private final WeeklyTargetRepository weeklyTargetRepository;
    private final TrackRepository trackRepository;

    public WeeklyTargetServiceImpl(WeeklyTargetRepository weeklyTargetRepository,
                                   TrackRepository trackRepository) {
        this.weeklyTargetRepository = weeklyTargetRepository;
        this.trackRepository = trackRepository;
    }

    @Override
    @Transactional
    public WeeklyTargetResponseDto createWeeklyTarget(WeeklyTargetRequestDto request) {
        if (!trackRepository.existsById(request.getTrackId())) {
            throw new ResourceNotFoundException("Track not found: " + request.getTrackId());
        }
        if (weeklyTargetRepository.existsByTrackIdAndWeekNumber(request.getTrackId(), request.getWeekNumber())) {
            throw new IllegalArgumentException(
                    "Weekly target already exists for track " + request.getTrackId()
                    + " and week " + request.getWeekNumber());
        }
        WeeklyTarget target = new WeeklyTarget();
        target.setTrackId(request.getTrackId());
        target.setWeekNumber(request.getWeekNumber());
        target.setLabs(request.getLabs() != null ? request.getLabs() : new ArrayList<>());
        target.setKnowledgeChecks(request.getKnowledgeChecks() != null ? request.getKnowledgeChecks() : new ArrayList<>());
        return toDto(weeklyTargetRepository.save(target));
    }

    @Override
    @Transactional
    public WeeklyTargetResponseDto updateWeeklyTarget(Long id, WeeklyTargetRequestDto request) {
        WeeklyTarget target = weeklyTargetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Weekly target not found: " + id));

        if (!trackRepository.existsById(request.getTrackId())) {
            throw new ResourceNotFoundException("Track not found: " + request.getTrackId());
        }

        // Check uniqueness only if track or week changed
        if (!target.getTrackId().equals(request.getTrackId())
                || !target.getWeekNumber().equals(request.getWeekNumber())) {
            if (weeklyTargetRepository.existsByTrackIdAndWeekNumber(request.getTrackId(), request.getWeekNumber())) {
                throw new IllegalArgumentException(
                        "Weekly target already exists for track " + request.getTrackId()
                        + " and week " + request.getWeekNumber());
            }
        }

        target.setTrackId(request.getTrackId());
        target.setWeekNumber(request.getWeekNumber());
        target.setLabs(request.getLabs() != null ? request.getLabs() : new ArrayList<>());
        target.setKnowledgeChecks(request.getKnowledgeChecks() != null ? request.getKnowledgeChecks() : new ArrayList<>());
        return toDto(weeklyTargetRepository.save(target));
    }

    @Override
    public WeeklyTargetResponseDto getWeeklyTargetById(Long id) {
        return weeklyTargetRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Weekly target not found: " + id));
    }

    @Override
    public List<WeeklyTargetResponseDto> getWeeklyTargetsByTrack(Long trackId) {
        if (!trackRepository.existsById(trackId)) {
            throw new ResourceNotFoundException("Track not found: " + trackId);
        }
        return weeklyTargetRepository.findByTrackId(trackId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public WeeklyTargetResponseDto getWeeklyTargetByTrackAndWeek(Long trackId, WeekNumber weekNumber) {
        return weeklyTargetRepository.findByTrackIdAndWeekNumber(trackId, weekNumber)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Weekly target not found for track " + trackId + " week " + weekNumber));
    }

    @Override
    @Transactional
    public void deleteWeeklyTarget(Long id) {
        if (!weeklyTargetRepository.existsById(id)) {
            throw new ResourceNotFoundException("Weekly target not found: " + id);
        }
        weeklyTargetRepository.deleteById(id);
    }

    private WeeklyTargetResponseDto toDto(WeeklyTarget target) {
        WeeklyTargetResponseDto dto = new WeeklyTargetResponseDto();
        dto.setId(target.getId());
        dto.setTrackId(target.getTrackId());
        dto.setWeekNumber(target.getWeekNumber());
        dto.setLabs(target.getLabs());
        dto.setKnowledgeChecks(target.getKnowledgeChecks());
        dto.setCreatedAt(target.getCreatedAt());
        return dto;
    }
}

