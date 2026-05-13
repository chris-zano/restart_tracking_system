package com.csniico.restart.admin.repository;

import com.csniico.restart.admin.entity.Track;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackRepository extends JpaRepository<Track, Long> {
}

