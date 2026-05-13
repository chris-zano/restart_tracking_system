package com.csniico.restart.admin.repository;

import com.csniico.restart.admin.entity.WeeklyTarget;
import com.csniico.restart.common.enums.WeekNumber;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeeklyTargetRepository extends JpaRepository<WeeklyTarget, Long> {
    List<WeeklyTarget> findByTrackId(Long trackId);
    Optional<WeeklyTarget> findByTrackIdAndWeekNumber(Long trackId, WeekNumber weekNumber);
    boolean existsByTrackIdAndWeekNumber(Long trackId, WeekNumber weekNumber);
}

