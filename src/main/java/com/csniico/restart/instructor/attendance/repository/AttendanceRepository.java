package com.csniico.restart.instructor.attendance.repository;

import com.csniico.restart.instructor.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findAllByCohortId(Long cohortId);
}

