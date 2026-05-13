package com.csniico.restart.admin.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;
import com.csniico.restart.instructor.learner.entity.Learner;
import com.csniico.restart.instructor.learner.repository.LearnerRepository;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminLearnerServiceImpl implements AdminLearnerService {

    private final LearnerRepository learnerRepository;
    private final TenantRepository tenantRepository;

    public AdminLearnerServiceImpl(LearnerRepository learnerRepository, TenantRepository tenantRepository) {
        this.learnerRepository = learnerRepository;
        this.tenantRepository = tenantRepository;
    }

    @Override
    public LearnerResponseDto createLearner(String schemaName, LearnerRequestDto request) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return toDto(learnerRepository.save(fromDto(request)));
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public List<LearnerResponseDto> createBulkLearners(String schemaName, List<LearnerRequestDto> requests) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            List<Learner> learners = requests.stream().map(this::fromDto).collect(Collectors.toList());
            return learnerRepository.saveAll(learners).stream().map(this::toDto).collect(Collectors.toList());
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public List<LearnerResponseDto> getAllLearners(String schemaName) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return learnerRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public LearnerResponseDto getLearnerById(String schemaName, Long id) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            return learnerRepository.findById(id)
                    .map(this::toDto)
                    .orElseThrow(() -> new ResourceNotFoundException("Learner not found: " + id));
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public LearnerResponseDto updateLearner(String schemaName, Long id, LearnerRequestDto request) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            Learner learner = learnerRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Learner not found: " + id));
            learner.setFullname(request.getFullname());
            learner.setEmail(request.getEmail());
            learner.setPhone(request.getPhone());
            learner.setGender(request.getGender());
            learner.setLocation(request.getLocation());
            learner.setRegion(request.getRegion());
            learner.setInstitution(request.getInstitution());
            learner.setGraduated(request.isGraduated());
            learner.setCohortId(request.getCohortId());
            return toDto(learnerRepository.save(learner));
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public void deleteLearner(String schemaName, Long id) {
        validateTenant(schemaName);
        TenantContext.setTenant(schemaName);
        try {
            if (!learnerRepository.existsById(id)) {
                throw new ResourceNotFoundException("Learner not found: " + id);
            }
            learnerRepository.deleteById(id);
        } finally {
            TenantContext.clearTenant();
        }
    }

    private void validateTenant(String schemaName) {
        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }
    }

    private Learner fromDto(LearnerRequestDto dto) {
        Learner learner = new Learner();
        learner.setFullname(dto.getFullname());
        learner.setEmail(dto.getEmail());
        learner.setPhone(dto.getPhone());
        learner.setGender(dto.getGender());
        learner.setLocation(dto.getLocation());
        learner.setRegion(dto.getRegion());
        learner.setInstitution(dto.getInstitution());
        learner.setGraduated(dto.isGraduated());
        learner.setCohortId(dto.getCohortId());
        return learner;
    }

    private LearnerResponseDto toDto(Learner learner) {
        LearnerResponseDto dto = new LearnerResponseDto();
        dto.setId(learner.getId());
        dto.setFullname(learner.getFullname());
        dto.setEmail(learner.getEmail());
        dto.setPhone(learner.getPhone());
        dto.setGender(learner.getGender());
        dto.setLocation(learner.getLocation());
        dto.setRegion(learner.getRegion());
        dto.setInstitution(learner.getInstitution());
        dto.setGraduated(learner.isGraduated());
        dto.setCohortId(learner.getCohortId());
        dto.setCreatedAt(learner.getCreatedAt());
        return dto;
    }
}

