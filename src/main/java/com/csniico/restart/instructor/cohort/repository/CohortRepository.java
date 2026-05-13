package com.csniico.restart.instructor.cohort.repository;

import com.csniico.restart.instructor.cohort.entity.Cohort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CohortRepository extends JpaRepository<Cohort, Long> {
}

