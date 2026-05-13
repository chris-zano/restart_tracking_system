package com.csniico.restart.portal;

import com.csniico.restart.instructor.attendance.dto.AttendanceResponseDto;
import com.csniico.restart.instructor.progress.dto.ProgressReportResponseDto;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PublicDashboardDto {

    private String cohortName;
    private List<PublicLearnerDto> learners;
    private List<AttendanceResponseDto> attendance;
    /** null when no gradebook has been uploaded yet. */
    private ProgressReportResponseDto progressReport;

    @Getter
    @Setter
    public static class PublicLearnerDto {
        private Long id;
        private String fullname;
    }
}
