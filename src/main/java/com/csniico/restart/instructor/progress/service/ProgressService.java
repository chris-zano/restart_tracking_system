package com.csniico.restart.instructor.progress.service;

import com.csniico.restart.instructor.progress.dto.ProgressReportResponseDto;
import com.csniico.restart.instructor.progress.dto.ProgressUploadRequestDto;

public interface ProgressService {
    ProgressReportResponseDto generateReport(ProgressUploadRequestDto request);
    ProgressReportResponseDto getSavedReport(Long cohortId);
}

