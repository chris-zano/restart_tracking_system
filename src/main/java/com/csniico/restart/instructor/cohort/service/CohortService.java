package com.csniico.restart.instructor.cohort.service;

import com.csniico.restart.instructor.cohort.dto.CohortRequestDto;
import com.csniico.restart.instructor.cohort.dto.CohortResponseDto;

import java.util.List;

public interface CohortService {
    CohortResponseDto createCohort(CohortRequestDto request);
    List<CohortResponseDto> getAllCohorts();
    CohortResponseDto getCohortById(Long id);
    CohortResponseDto updateCohort(Long id, CohortRequestDto request);
    void deleteCohort(Long id);
}

