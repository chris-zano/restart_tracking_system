package com.csniico.restart.instructor.attendance.converter;

import com.csniico.restart.instructor.attendance.dto.ParticipantEntry;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Collections;
import java.util.List;

@Converter
public class ParticipantListConverter implements AttributeConverter<List<ParticipantEntry>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<ParticipantEntry> participants) {
        if (participants == null) return "[]";
        try {
            return MAPPER.writeValueAsString(participants);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize participants to JSON", e);
        }
    }

    @Override
    public List<ParticipantEntry> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return MAPPER.readValue(json, new TypeReference<List<ParticipantEntry>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize participants from JSON", e);
        }
    }
}

