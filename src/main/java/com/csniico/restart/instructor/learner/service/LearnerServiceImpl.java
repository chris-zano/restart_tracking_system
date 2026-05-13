package com.csniico.restart.instructor.learner.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.learner.dto.LearnerRequestDto;
import com.csniico.restart.instructor.learner.dto.LearnerResponseDto;
import com.csniico.restart.instructor.learner.entity.Learner;
import com.csniico.restart.instructor.learner.repository.LearnerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LearnerServiceImpl implements LearnerService {

    private final LearnerRepository learnerRepository;

    public LearnerServiceImpl(LearnerRepository learnerRepository) {
        this.learnerRepository = learnerRepository;
    }

    @Override
    @Transactional
    public LearnerResponseDto createLearner(LearnerRequestDto request) {
        Learner learner = fromDto(request);
        return toDto(learnerRepository.save(learner));
    }

    @Override
    @Transactional
    public List<LearnerResponseDto> createBulkLearners(List<LearnerRequestDto> requests) {
        List<Learner> learners = requests.stream().map(this::fromDto).collect(Collectors.toList());
        return learnerRepository.saveAll(learners).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public List<LearnerResponseDto> getAllLearners() {
        return learnerRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public LearnerResponseDto getLearnerById(Long id) {
        return learnerRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Learner not found: " + id));
    }

    @Override
    @Transactional
    public LearnerResponseDto updateLearner(Long id, LearnerRequestDto request) {
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
    }

    @Override
    @Transactional
    public void deleteLearner(Long id) {
        if (!learnerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Learner not found: " + id);
        }
        learnerRepository.deleteById(id);
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

