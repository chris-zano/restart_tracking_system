package com.csniico.restart.instructor.learner.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "learners")
public class Learner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullname;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, length = 10)
    private String phone;

    @Column
    private String gender;

    @Column
    private String location;

    @Column
    private String region;

    @Column
    private String institution;

    @Column(nullable = false)
    private boolean graduated = false;

    @Column(name = "cohort_id")
    private Long cohortId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

