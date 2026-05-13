package com.csniico.restart.instructor.learner.service;

import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;

import java.util.List;

public interface LearnerService {
    LearnerResponseDto createLearner(LearnerRequestDto request);
    List<LearnerResponseDto> createBulkLearners(List<LearnerRequestDto> requests);
    List<LearnerResponseDto> getAllLearners();
    LearnerResponseDto getLearnerById(Long id);
    LearnerResponseDto updateLearner(Long id, LearnerRequestDto request);
    void deleteLearner(Long id);
}

