package com.csniico.restart.common.response;

import lombok.Getter;

public class ApiResponse<T> {

    @Getter
    private boolean success;
    @Getter
    private String message;
    @Getter
    private T data;

    public ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }

    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(true, "Success", null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }

}
