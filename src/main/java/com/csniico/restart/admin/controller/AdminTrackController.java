package com.csniico.restart.admin.controller;

import com.csniico.restart.admin.dto.TrackRequestDto;
import com.csniico.restart.admin.dto.TrackResponseDto;
import com.csniico.restart.admin.service.TrackService;
import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tracks")
public class AdminTrackController {

    private final TrackService trackService;

    public AdminTrackController(TrackService trackService) {
        this.trackService = trackService;
    }

    /** POST /api/admin/tracks */
    @PostMapping
    @Auditable(action = "CREATE_TRACK", resourceType = "TRACK")
    public ResponseEntity<ApiResponse<TrackResponseDto>> create(
            @Valid @RequestBody TrackRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Track created", trackService.createTrack(request)));
    }

    /** GET /api/admin/tracks */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TrackResponseDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(trackService.getAllTracks()));
    }

    /** GET /api/admin/tracks/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TrackResponseDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(trackService.getTrackById(id)));
    }

    /** PUT /api/admin/tracks/{id} */
    @PutMapping("/{id}")
    @Auditable(action = "UPDATE_TRACK", resourceType = "TRACK")
    public ResponseEntity<ApiResponse<TrackResponseDto>> update(
            @PathVariable Long id, @Valid @RequestBody TrackRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Track updated",
                trackService.updateTrack(id, request)));
    }

    /** DELETE /api/admin/tracks/{id} */
    @DeleteMapping("/{id}")
    @Auditable(action = "DELETE_TRACK", resourceType = "TRACK")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        trackService.deleteTrack(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

