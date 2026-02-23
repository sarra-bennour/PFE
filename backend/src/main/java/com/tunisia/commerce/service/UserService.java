package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.DeactivationRequest;

import java.util.List;

public interface UserService {
    UserDTO registerExportateur(ExportateurSignupRequest request);
    LoginResponse login(LoginRequest request);
    LoginResponse mobileLogin(MobileLoginRequest request);
    UserDTO getUserByEmail(String email);
    void enableTwoFactorAuth(String email);
    boolean verifyTwoFactorCode(String email, String code);
    void logout(String token);
    boolean verifyEmail(String token);
    void resendVerificationEmail(String email);
    void changePassword(String email, ChangePasswordRequest request);
    void initiatePasswordReset(String email);
    boolean validateResetToken(String token);
    void resetPassword(String token, String newPassword);
    UserDTO updateProfile(String email, UpdateProfileRequest request);
    void createDeactivationRequest(String email, String reason, boolean isUrgent);
    void cancelDeactivationRequest(String email, Long requestId);
    List<DeactivationRequest> getUserDeactivationRequests(String email);
    boolean canCreateDeactivationRequest(String email);
}