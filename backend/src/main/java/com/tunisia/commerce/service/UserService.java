package com.tunisia.commerce.service;

import com.tunisia.commerce.dto.user.*;
import com.tunisia.commerce.entity.DeactivationRequest;
import com.tunisia.commerce.entity.User;

import java.util.List;

public interface UserService {
    UserDTO registerExportateur(ExportateurSignupRequest request);
    LoginResponse login(LoginRequest request);
    LoginResponse mobileLogin(MobileLoginRequest request);
    UserDTO getUserByEmail(String email);
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

    TwoFactorSetupResponse setupTwoFactorAuth(String email);
    boolean enableTwoFactorAuth(String email, String code);
    boolean disableTwoFactorAuth(String email, String code);
    boolean verifyTwoFactorCode(String email, String code);
    void resendTwoFactorCode(String email);
    List<UserDTO> getAllUsers();
    UserDTO getUserById(Long id);
    List<DeactivationRequestAdminDTO> getAllDeactivationRequests();
    DeactivationRequestAdminDTO processDeactivationRequest(Long requestId, String action, String adminComment, Long adminId);
    boolean hasPendingDeactivationRequest(String email);

    DeactivationRequestAdminDTO getDeactivationRequestById(Long requestId);
    void updateUserStatus(Long userId, String status);
    void reactivateAccount(Long userId, String adminComment);
    String resetUserPassword(Long userId);
    String generateAndSendPassword(Long userId);
    boolean canHavePassword(User user);

    UserDTO createInstanceValidation(CreateInstanceValidationRequest request);
    List<UserDTO> getAllInstanceValidations();
    UserDTO getInstanceValidationById(Long id);
    UserDTO getInstanceValidationByEmail(String email);
    void updateInstanceValidationStatus(Long id, String status);
    void deleteInstanceValidation(Long id);
    void hardDeleteInstanceValidation(Long id);
    boolean verifyInstanceValidationEmail(String token);


}