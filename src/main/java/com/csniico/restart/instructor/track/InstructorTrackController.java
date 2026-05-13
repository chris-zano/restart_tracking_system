package com.csniico.restart.instructor.track;

import com.csniico.restart.admin.dto.TrackResponseDto;
import com.csniico.restart.admin.service.TrackService;
import com.csniico.restart.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/instructor/tracks")
public class InstructorTrackController {

    private final TrackService trackService;

    public InstructorTrackController(TrackService trackService) {
        this.trackService = trackService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TrackResponseDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(trackService.getAllTracks()));
    }
}
