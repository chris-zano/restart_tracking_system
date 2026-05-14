package com.csniico.restart.instructor.profile.controller;

import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.profile.dto.ChangePasswordRequestDto;
import com.csniico.restart.instructor.profile.dto.ProfileResponseDto;
import com.csniico.restart.instructor.profile.dto.UpdateProfileRequestDto;
import com.csniico.restart.instructor.profile.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController("instructorProfileController")
@RequestMapping("/api/instructor/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponseDto>> getProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved",
                profileService.getProfile(authentication.getName())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileResponseDto>> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequestDto request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated",
                profileService.updateProfile(authentication.getName(), request)));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequestDto request) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }
}
