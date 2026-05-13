package com.csniico.restart.admin.service;

import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;

import java.util.List;

public interface AdminLearnerService {
    LearnerResponseDto createLearner(String schemaName, LearnerRequestDto request);
    List<LearnerResponseDto> createBulkLearners(String schemaName, List<LearnerRequestDto> requests);
    List<LearnerResponseDto> getAllLearners(String schemaName);
    LearnerResponseDto getLearnerById(String schemaName, Long id);
    LearnerResponseDto updateLearner(String schemaName, Long id, LearnerRequestDto request);
    void deleteLearner(String schemaName, Long id);
}

