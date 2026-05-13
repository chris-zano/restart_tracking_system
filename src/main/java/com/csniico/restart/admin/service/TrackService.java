package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.TrackRequestDto;
import com.csniico.restart.admin.dto.TrackResponseDto;

import java.util.List;

public interface TrackService {
    TrackResponseDto createTrack(TrackRequestDto request);
    List<TrackResponseDto> getAllTracks();
    TrackResponseDto getTrackById(Long id);
    TrackResponseDto updateTrack(Long id, TrackRequestDto request);
    void deleteTrack(Long id);
}

