package com.techview.hrms.controller;

import com.techview.hrms.model.Employee;
import com.techview.hrms.model.EmployeeStatus;
import com.techview.hrms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    /**
     * Create a new employee
     * POST /api/employees
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createEmployee(@Valid @RequestBody Employee employee) {
        Employee createdEmployee = employeeService.createEmployee(employee);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Employee created successfully");
        response.put("data", createdEmployee);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get all employees
     * GET /api/employees
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllEmployees() {
        List<Employee> employees = employeeService.getAllEmployees();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", employees.size());
        response.put("data", employees);

        return ResponseEntity.ok(response);
    }

    /**
     * Get all active employees
     * GET /api/employees/active
     */
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getAllActiveEmployees() {
        List<Employee> employees = employeeService.getAllActiveEmployees();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", employees.size());
        response.put("data", employees);

        return ResponseEntity.ok(response);
    }

    /**
     * Get employees by status
     * GET /api/employees/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<Map<String, Object>> getEmployeesByStatus(@PathVariable EmployeeStatus status) {
        List<Employee> employees = employeeService.getEmployeesByStatus(status);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", employees.size());
        response.put("data", employees);

        return ResponseEntity.ok(response);
    }

    /**
     * Get employee by ID
     * GET /api/employees/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getEmployeeById(@PathVariable Long id) {
        Employee employee = employeeService.getEmployeeById(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", employee);

        return ResponseEntity.ok(response);
    }

    /**
     * Get employee by employee code
     * GET /api/employees/code/{code}
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getEmployeeByCode(@PathVariable String code) {
        Employee employee = employeeService.getEmployeeByCode(code);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", employee);

        return ResponseEntity.ok(response);
    }

    /**
     * Search employees
     * GET /api/employees/search?keyword=xyz
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchEmployees(@RequestParam String keyword) {
        List<Employee> employees = employeeService.searchEmployees(keyword);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", employees.size());
        response.put("data", employees);

        return ResponseEntity.ok(response);
    }

    /**
     * Update employee
     * PUT /api/employees/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody Employee employeeDetails) {

        Employee updatedEmployee = employeeService.updateEmployee(id, employeeDetails);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Employee updated successfully");
        response.put("data", updatedEmployee);

        return ResponseEntity.ok(response);
    }

    /**
     * Soft delete employee (change status to RESIGNED)
     * DELETE /api/employees/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Employee marked as resigned successfully");

        return ResponseEntity.ok(response);
    }

    /**
     * Hard delete employee (permanent deletion)
     * DELETE /api/employees/{id}/permanent
     */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Map<String, Object>> hardDeleteEmployee(@PathVariable Long id) {
        employeeService.hardDeleteEmployee(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Employee deleted permanently");

        return ResponseEntity.ok(response);
    }

    /**
     * Health check endpoint
     * GET /api/employees/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Employee API is running");
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }
}
