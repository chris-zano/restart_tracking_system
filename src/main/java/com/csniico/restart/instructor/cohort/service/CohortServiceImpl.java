package com.csniico.restart.instructor.cohort.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.cohort.dto.CohortRequestDto;
import com.csniico.restart.instructor.cohort.dto.CohortResponseDto;
import com.csniico.restart.instructor.cohort.entity.Cohort;
import com.csniico.restart.instructor.cohort.repository.CohortRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CohortServiceImpl implements CohortService {

    private final CohortRepository cohortRepository;

    public CohortServiceImpl(CohortRepository cohortRepository) {
        this.cohortRepository = cohortRepository;
    }

    @Override
    @Transactional
    public CohortResponseDto createCohort(CohortRequestDto request) {
        Cohort cohort = new Cohort();
        cohort.setName(request.getName());
        cohort.setDescription(request.getDescription());
        cohort.setTrackId(request.getTrackId());
        return toDto(cohortRepository.save(cohort));
    }

    @Override
    public List<CohortResponseDto> getAllCohorts() {
        return cohortRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public CohortResponseDto getCohortById(Long id) {
        return cohortRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort not found: " + id));
    }

    @Override
    @Transactional
    public CohortResponseDto updateCohort(Long id, CohortRequestDto request) {
        Cohort cohort = cohortRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cohort not found: " + id));
        cohort.setName(request.getName());
        cohort.setDescription(request.getDescription());
        cohort.setTrackId(request.getTrackId());
        return toDto(cohortRepository.save(cohort));
    }

    @Override
    @Transactional
    public void deleteCohort(Long id) {
        if (!cohortRepository.existsById(id)) {
            throw new ResourceNotFoundException("Cohort not found: " + id);
        }
        cohortRepository.deleteById(id);
    }

    private CohortResponseDto toDto(Cohort cohort) {
        CohortResponseDto dto = new CohortResponseDto();
        dto.setId(cohort.getId());
        dto.setName(cohort.getName());
        dto.setDescription(cohort.getDescription());
        dto.setTrackId(cohort.getTrackId());
        dto.setActive(cohort.isActive());
        dto.setCreatedAt(cohort.getCreatedAt());
        return dto;
    }
}

