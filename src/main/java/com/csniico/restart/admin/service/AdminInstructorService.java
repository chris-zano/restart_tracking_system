package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.InstructorProvisionRequestDto;
import com.csniico.restart.admin.dto.InstructorResponseDto;

import java.util.List;

public interface AdminInstructorService {
    InstructorResponseDto createInstructor(InstructorProvisionRequestDto request);
    List<InstructorResponseDto> getInstructorsBySchema(String schemaName);
    void deleteInstructor(String schemaName, String username);
}

