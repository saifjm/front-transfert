# Security and Validation Microservice

This microservice handles security-related operations including operation validations and employee agency management.

## Technology Stack
- Spring Boot 3.5.7
- Java 17
- Oracle Database
- Maven

## Configuration
The service runs on port 8082 by default and connects to the SECURITE schema in the Oracle database.

## API Endpoints
All endpoints are prefixed with `/api/securite/`

### Main Entities
- `/api/securite/validations` - Operation validation management
- `/api/securite/employe-agences` - Employee agency management

## Running the Service
```bash
mvn spring-boot:run
```

## Building the Service
```bash
mvn clean package
```
