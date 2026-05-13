package com.csniico.restart.instructor.learner.repository;

import com.csniico.restart.instructor.learner.entity.Learner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LearnerRepository extends JpaRepository<Learner, Long> {
    List<Learner> findAllByCohortId(Long cohortId);
    boolean existsByEmail(String email);
}

