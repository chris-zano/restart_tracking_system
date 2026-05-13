package com.csniico.restart.instructor.attendance.entity;

import com.csniico.restart.instructor.attendance.converter.ParticipantListConverter;
import com.csniico.restart.instructor.attendance.dto.ParticipantEntry;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "attendance")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cohort_id", nullable = false)
    private Long cohortId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private Integer duration;

    @Convert(converter = ParticipantListConverter.class)
    @Column(columnDefinition = "text", nullable = false)
    private List<ParticipantEntry> participants;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}


