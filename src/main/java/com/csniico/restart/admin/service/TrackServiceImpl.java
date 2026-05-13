package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.TrackRequestDto;
import com.csniico.restart.admin.dto.TrackResponseDto;
import com.csniico.restart.admin.entity.Track;
import com.csniico.restart.admin.repository.TrackRepository;
import com.csniico.restart.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TrackServiceImpl implements TrackService {

    private final TrackRepository trackRepository;

    public TrackServiceImpl(TrackRepository trackRepository) {
        this.trackRepository = trackRepository;
    }

    @Override
    @Transactional
    public TrackResponseDto createTrack(TrackRequestDto request) {
        Track track = new Track();
        track.setName(request.getName());
        track.setDescription(request.getDescription());
        return toDto(trackRepository.save(track));
    }

    @Override
    public List<TrackResponseDto> getAllTracks() {
        return trackRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public TrackResponseDto getTrackById(Long id) {
        return trackRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + id));
    }

    @Override
    @Transactional
    public TrackResponseDto updateTrack(Long id, TrackRequestDto request) {
        Track track = trackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Track not found: " + id));
        track.setName(request.getName());
        track.setDescription(request.getDescription());
        return toDto(trackRepository.save(track));
    }

    @Override
    @Transactional
    public void deleteTrack(Long id) {
        if (!trackRepository.existsById(id)) {
            throw new ResourceNotFoundException("Track not found: " + id);
        }
        trackRepository.deleteById(id);
    }

    private TrackResponseDto toDto(Track track) {
        TrackResponseDto dto = new TrackResponseDto();
        dto.setId(track.getId());
        dto.setName(track.getName());
        dto.setDescription(track.getDescription());
        dto.setCreatedAt(track.getCreatedAt());
        return dto;
    }
}

