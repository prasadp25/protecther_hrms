package com.techview.hrms.service;

import com.techview.hrms.exception.DuplicateResourceException;
import com.techview.hrms.exception.ResourceNotFoundException;
import com.techview.hrms.model.Employee;
import com.techview.hrms.model.EmployeeStatus;
import com.techview.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    /**
     * Create a new employee with auto-generated employee code
     */
    public Employee createEmployee(Employee employee) {
        // Validate unique fields
        validateUniqueFields(employee, null);

        // Auto-generate employee code
        employee.setEmployeeCode(generateEmployeeCode());

        // Set default status if not provided
        if (employee.getStatus() == null) {
            employee.setStatus(EmployeeStatus.ACTIVE);
        }

        return employeeRepository.save(employee);
    }

    /**
     * Update an existing employee
     */
    public Employee updateEmployee(Long employeeId, Employee employeeDetails) {
        Employee existingEmployee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        // Validate unique fields (excluding current employee)
        validateUniqueFields(employeeDetails, employeeId);

        // Update fields
        existingEmployee.setFirstName(employeeDetails.getFirstName());
        existingEmployee.setLastName(employeeDetails.getLastName());
        existingEmployee.setMobileNo(employeeDetails.getMobileNo());
        existingEmployee.setEmail(employeeDetails.getEmail());
        existingEmployee.setAadhaarNo(employeeDetails.getAadhaarNo());
        existingEmployee.setPanNo(employeeDetails.getPanNo());
        existingEmployee.setAccountNo(employeeDetails.getAccountNo());
        existingEmployee.setIfscCode(employeeDetails.getIfscCode());
        existingEmployee.setBankName(employeeDetails.getBankName());
        existingEmployee.setUanNo(employeeDetails.getUanNo());
        existingEmployee.setPfNo(employeeDetails.getPfNo());
        existingEmployee.setQualification(employeeDetails.getQualification());
        existingEmployee.setDob(employeeDetails.getDob());
        existingEmployee.setAddress(employeeDetails.getAddress());
        existingEmployee.setStatus(employeeDetails.getStatus());
        existingEmployee.setDateOfJoining(employeeDetails.getDateOfJoining());
        existingEmployee.setDateOfLeaving(employeeDetails.getDateOfLeaving());

        // Auto-update status to RESIGNED if date of leaving is set
        if (employeeDetails.getDateOfLeaving() != null &&
            !employeeDetails.getDateOfLeaving().isAfter(LocalDate.now())) {
            existingEmployee.setStatus(EmployeeStatus.RESIGNED);
        }

        return employeeRepository.save(existingEmployee);
    }

    /**
     * Get employee by ID
     */
    @Transactional(readOnly = true)
    public Employee getEmployeeById(Long employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));
    }

    /**
     * Get employee by employee code
     */
    @Transactional(readOnly = true)
    public Employee getEmployeeByCode(String employeeCode) {
        return employeeRepository.findByEmployeeCode(employeeCode)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with code: " + employeeCode));
    }

    /**
     * Get all employees
     */
    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    /**
     * Get all active employees
     */
    @Transactional(readOnly = true)
    public List<Employee> getAllActiveEmployees() {
        return employeeRepository.findAllActiveEmployees();
    }

    /**
     * Get employees by status
     */
    @Transactional(readOnly = true)
    public List<Employee> getEmployeesByStatus(EmployeeStatus status) {
        return employeeRepository.findByStatus(status);
    }

    /**
     * Search employees by keyword
     */
    @Transactional(readOnly = true)
    public List<Employee> searchEmployees(String keyword) {
        return employeeRepository.searchEmployees(keyword);
    }

    /**
     * Delete employee (soft delete by changing status)
     */
    public void deleteEmployee(Long employeeId) {
        Employee employee = getEmployeeById(employeeId);
        employee.setStatus(EmployeeStatus.RESIGNED);
        employee.setDateOfLeaving(LocalDate.now());
        employeeRepository.save(employee);
    }

    /**
     * Hard delete employee (permanent deletion)
     */
    public void hardDeleteEmployee(Long employeeId) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new ResourceNotFoundException("Employee not found with id: " + employeeId);
        }
        employeeRepository.deleteById(employeeId);
    }

    /**
     * Update employee documents
     */
    public Employee updateEmployeeDocuments(Long employeeId, String aadhaarDoc, String panDoc,
                                           String photo, String otherDocs) {
        Employee employee = getEmployeeById(employeeId);

        if (aadhaarDoc != null) employee.setAadhaarDocument(aadhaarDoc);
        if (panDoc != null) employee.setPanDocument(panDoc);
        if (photo != null) employee.setPhoto(photo);
        if (otherDocs != null) employee.setOtherDocuments(otherDocs);

        return employeeRepository.save(employee);
    }

    /**
     * Validate unique fields before creating or updating
     */
    private void validateUniqueFields(Employee employee, Long excludeEmployeeId) {
        if (excludeEmployeeId == null) {
            // For new employee creation
            if (employeeRepository.existsByMobileNo(employee.getMobileNo())) {
                throw new DuplicateResourceException("Mobile number already exists: " + employee.getMobileNo());
            }
            if (employee.getEmail() != null && employeeRepository.existsByEmail(employee.getEmail())) {
                throw new DuplicateResourceException("Email already exists: " + employee.getEmail());
            }
            if (employeeRepository.existsByAadhaarNo(employee.getAadhaarNo())) {
                throw new DuplicateResourceException("Aadhaar number already exists: " + employee.getAadhaarNo());
            }
            if (employeeRepository.existsByPanNo(employee.getPanNo())) {
                throw new DuplicateResourceException("PAN number already exists: " + employee.getPanNo());
            }
            if (employeeRepository.existsByAccountNo(employee.getAccountNo())) {
                throw new DuplicateResourceException("Account number already exists: " + employee.getAccountNo());
            }
            if (employee.getUanNo() != null && employeeRepository.existsByUanNo(employee.getUanNo())) {
                throw new DuplicateResourceException("UAN number already exists: " + employee.getUanNo());
            }
        } else {
            // For employee update
            if (employeeRepository.existsByMobileNoAndEmployeeIdNot(employee.getMobileNo(), excludeEmployeeId)) {
                throw new DuplicateResourceException("Mobile number already exists: " + employee.getMobileNo());
            }
            if (employee.getEmail() != null && employeeRepository.existsByEmailAndEmployeeIdNot(employee.getEmail(), excludeEmployeeId)) {
                throw new DuplicateResourceException("Email already exists: " + employee.getEmail());
            }
            if (employeeRepository.existsByAadhaarNoAndEmployeeIdNot(employee.getAadhaarNo(), excludeEmployeeId)) {
                throw new DuplicateResourceException("Aadhaar number already exists: " + employee.getAadhaarNo());
            }
            if (employeeRepository.existsByPanNoAndEmployeeIdNot(employee.getPanNo(), excludeEmployeeId)) {
                throw new DuplicateResourceException("PAN number already exists: " + employee.getPanNo());
            }
            if (employeeRepository.existsByAccountNoAndEmployeeIdNot(employee.getAccountNo(), excludeEmployeeId)) {
                throw new DuplicateResourceException("Account number already exists: " + employee.getAccountNo());
            }
            if (employee.getUanNo() != null && employeeRepository.existsByUanNoAndEmployeeIdNot(employee.getUanNo(), excludeEmployeeId)) {
                throw new DuplicateResourceException("UAN number already exists: " + employee.getUanNo());
            }
        }
    }

    /**
     * Generate employee code in format EMP0001, EMP0002, etc.
     */
    private String generateEmployeeCode() {
        Long maxId = employeeRepository.getMaxEmployeeId();
        long nextId = (maxId == null) ? 1 : maxId + 1;
        return String.format("EMP%04d", nextId);
    }
}
