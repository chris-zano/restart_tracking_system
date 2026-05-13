package com.csniico.restart.instructor.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "gradebook_reports")
public class GradebookReport {

    @Id
    @Column(name = "cohort_id")
    private Long cohortId;

    @Column(name = "report_json", columnDefinition = "TEXT", nullable = false)
    private String reportJson;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    public GradebookReport() {}

    public GradebookReport(Long cohortId, String reportJson, Instant uploadedAt) {
        this.cohortId = cohortId;
        this.reportJson = reportJson;
        this.uploadedAt = uploadedAt;
    }

    public Long getCohortId()          { return cohortId; }
    public String getReportJson()      { return reportJson; }
    public Instant getUploadedAt()     { return uploadedAt; }

    public void setReportJson(String reportJson)   { this.reportJson = reportJson; }
    public void setUploadedAt(Instant uploadedAt)  { this.uploadedAt = uploadedAt; }
}
