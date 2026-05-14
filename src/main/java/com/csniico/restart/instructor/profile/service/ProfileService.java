package com.csniico.restart.instructor.profile.service;

import com.csniico.restart.instructor.profile.dto.ChangePasswordRequestDto;
import com.csniico.restart.instructor.profile.dto.ProfileResponseDto;
import com.csniico.restart.instructor.profile.dto.UpdateProfileRequestDto;

public interface ProfileService {
    ProfileResponseDto getProfile(String username);
    ProfileResponseDto updateProfile(String username, UpdateProfileRequestDto request);
    void changePassword(String username, ChangePasswordRequestDto request);
}
