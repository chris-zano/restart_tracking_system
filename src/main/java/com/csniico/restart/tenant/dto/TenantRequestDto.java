// TenantRequestDto.java
package com.csniico.restart.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class TenantRequestDto {

    @NotBlank(message = "Instructor name must not be blank")
    private String instructorName;

}