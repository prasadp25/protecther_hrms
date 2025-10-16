package com.techview.hrms.repository;

import com.techview.hrms.model.Employee;
import com.techview.hrms.model.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    // Find by unique fields
    Optional<Employee> findByEmployeeCode(String employeeCode);

    Optional<Employee> findByMobileNo(String mobileNo);

    Optional<Employee> findByEmail(String email);

    Optional<Employee> findByAadhaarNo(String aadhaarNo);

    Optional<Employee> findByPanNo(String panNo);

    Optional<Employee> findByAccountNo(String accountNo);

    Optional<Employee> findByUanNo(String uanNo);

    // Check existence for validation
    boolean existsByMobileNo(String mobileNo);

    boolean existsByEmail(String email);

    boolean existsByAadhaarNo(String aadhaarNo);

    boolean existsByPanNo(String panNo);

    boolean existsByAccountNo(String accountNo);

    boolean existsByUanNo(String uanNo);

    // Find by status
    List<Employee> findByStatus(EmployeeStatus status);

    // Find active employees
    @Query("SELECT e FROM Employee e WHERE e.status = 'ACTIVE'")
    List<Employee> findAllActiveEmployees();

    // Search employees by name or employee code
    @Query("SELECT e FROM Employee e WHERE " +
           "LOWER(e.firstName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.lastName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Employee> searchEmployees(String keyword);

    // Get next employee number for auto-generation
    @Query("SELECT MAX(e.employeeId) FROM Employee e")
    Long getMaxEmployeeId();

    // Custom validation methods that exclude specific employee ID (for updates)
    boolean existsByMobileNoAndEmployeeIdNot(String mobileNo, Long employeeId);

    boolean existsByEmailAndEmployeeIdNot(String email, Long employeeId);

    boolean existsByAadhaarNoAndEmployeeIdNot(String aadhaarNo, Long employeeId);

    boolean existsByPanNoAndEmployeeIdNot(String panNo, Long employeeId);

    boolean existsByAccountNoAndEmployeeIdNot(String accountNo, Long employeeId);

    boolean existsByUanNoAndEmployeeIdNot(String uanNo, Long employeeId);
}
