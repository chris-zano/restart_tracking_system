package com.csniico.restart.admin.entity;

import com.csniico.restart.common.enums.WeekNumber;
import com.csniico.restart.common.util.StringListConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "weekly_targets", schema = "public",
        uniqueConstraints = @UniqueConstraint(columnNames = {"track_id", "week_number"}))
public class WeeklyTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "track_id", nullable = false)
    private Long trackId;

    @Enumerated(EnumType.STRING)
    @Column(name = "week_number", nullable = false)
    private WeekNumber weekNumber;

    @Convert(converter = StringListConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private List<String> labs;

    @Convert(converter = StringListConverter.class)
    @Column(name = "knowledge_checks", nullable = false, columnDefinition = "TEXT")
    private List<String> knowledgeChecks;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

