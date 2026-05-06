# Implementation Plan: AVA Suspension Workflow Integration

## Overview

This implementation plan migrates the AVA suspension system from direct backend service calls (AVA1) to a centralized workflow engine (MS-WF). The integration implements a two-step workflow with separation of duties between Agent and Superviseur roles, enabling proper validation, audit trails, and task management for suspension operations.

**Key Components:**
- Workflow service layer for MS-WF API integration
- Modified AVASuspension component for Agent submission workflow
- New SuperviseurTaskDashboard component for task management
- Modified AVALeveeSuspension component for suspension lift workflow
- User context and demo mode services
- Comprehensive error handling and user feedback

**Technology Stack:** React 18+ with TypeScript, shadcn/ui components, Sonner toast notifications

## Tasks

### Phase 1: Foundation - Service Layer Infrastructure

- [ ] 1. Set up TypeScript interfaces and types
  - Create `types/workflow.ts` with all workflow-related interfaces
  - Define `WorkflowTask`, `TaskStatus`, `SuspensionRequestPayload`, `LeveeSuspensionRequestPayload` interfaces
  - Define `UserContext`, `WorkflowResponse`, `WorkflowStateInfo` interfaces
  - Export all types for use across the application
  - _Requirements: 6.1, 6.2, 6.3, 11.1, 11.2, 11.3_

- [ ] 2. Implement User Context Service
  - [ ] 2.1 Create `services/userContextService.ts`
    - Implement `getUserContext()` function to retrieve user context from session storage or JWT token
    - Implement `setUserContext()` function to store user context in session storage
    - Implement `clearUserContext()` function to remove user context on logout
    - Implement `getCurrentUserId()` and `getCurrentUserRole()` helper functions
    - Implement `hasRole()` function for role checking
    - Add JWT decoding utility for extracting user claims from access token
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  
  - [ ]* 2.2 Write unit tests for User Context Service
    - Test `getUserContext()` retrieves from session storage correctly
    - Test `getUserContext()` falls back to JWT token decoding
    - Test `getUserContext()` returns demo user in demo mode
    - Test `setUserContext()` stores context in session storage
    - Test `clearUserContext()` removes context from session storage
    - Test `hasRole()` correctly validates user roles
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 3. Implement Demo Mode Service
  - [ ] 3.1 Create `services/demoModeService.ts`
    - Implement `isDemoMode()` function to check if demo mode is enabled
    - Implement `enableDemoMode()` and `disableDemoMode()` functions
    - Implement `getDemoResponse()` function with 500ms simulated delay
    - Implement `generateDemoResponse()` function for all workflow operations
    - Implement `generateMockTasks()` function returning 2-3 sample tasks
    - Include mock data for both AVA_SUSPENSION and AVA_LEVEE_SUSPENSION operations
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ]* 3.2 Write unit tests for Demo Mode Service
    - Test `isDemoMode()` reads from environment and session storage
    - Test `getDemoResponse()` returns mock data with 500ms delay
    - Test `generateMockTasks()` returns valid task structures
    - Test all operation types return appropriate mock responses
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 4. Implement Workflow Service - Core API Client
  - [ ] 4.1 Create `services/workflowService.ts` with base structure
    - Set up MS-WF base URL configuration from environment
    - Implement `handleWorkflowError()` function to parse and map HTTP errors
    - Implement `handleNetworkError()` function for connection failures
    - Implement `logWorkflowOperation()` function for audit trail logging
    - Implement `generateCorrelationId()` function for request tracing
    - Add error message mapping for status codes 400, 401, 403, 404, 409, 500
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.8_
  
  - [ ] 4.2 Implement suspension submission endpoint
    - Implement `submitSuspension()` function
    - Call POST `/api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/SOUMETTRE`
    - Include user context headers (X-User-Id, X-Role-Code, X-Org-Node-Id)
    - Handle demo mode simulation
    - Validate user context exists before making request
    - Log operation for audit trail
    - Return standardized `WorkflowResponse` structure
    - _Requirements: 1.1, 1.2, 1.6, 6.1, 6.2, 6.3, 6.7, 11.1, 11.2, 11.3, 11.7_
  
  - [ ] 4.3 Implement task retrieval endpoint
    - Implement `getTasks()` function with optional filters
    - Call GET `/api/wf/tasks?operationKey={key}&status={status}`
    - Include user context headers with SUPERVISEUR role
    - Handle demo mode simulation
    - Parse and return task list from response
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.7_
  
  - [ ] 4.4 Implement task claiming endpoint
    - Implement `claimTask()` function
    - Call POST `/api/wf/tasks/{taskId}/claim`
    - Include user context headers
    - Handle 409 Conflict error for concurrent claims
    - Log operation for audit trail
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 13.1, 13.2, 13.3, 14.2_
  
  - [ ] 4.5 Implement approval and rejection endpoints
    - Implement `approveSuspension()` function calling POST `/api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/APPROUVER`
    - Implement `rejectSuspension()` function calling POST `/api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/REJETER`
    - Include user context headers with SUPERVISEUR role
    - Handle demo mode simulation for both operations
    - Log operations for audit trail
    - _Requirements: 4.1, 4.2, 4.6, 4.8, 5.1, 5.2, 5.5, 5.8, 14.3, 14.4_
  
  - [ ]* 4.6 Write unit tests for Workflow Service
    - Test user context headers are included in all requests
    - Test error handling for 400, 401, 403, 404, 409, 500 status codes
    - Test network error handling
    - Test demo mode returns mock responses
    - Test correlation IDs are generated and logged
    - Test audit logging for all operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 14.5, 14.6, 14.8_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Agent UI Integration - AVASuspension Component

- [ ] 6. Modify AVASuspension component for workflow integration
  - [ ] 6.1 Add workflow state management to AVASuspension
    - Import workflow service and types
    - Add `workflowState` state variable with `SuspensionWorkflowState` type
    - Add state for tracking submission status (idle, submitting, pending_validation, approved, rejected)
    - Initialize workflow state on component mount
    - _Requirements: 1.5, 10.1, 10.2, 10.3_
  
  - [ ] 6.2 Replace direct API call with workflow submission
    - Modify `handleSubmit` function to call `workflowService.submitSuspension()`
    - Validate form data before submission (numeroDossier, motifSuspension, dateSuspension required)
    - Construct `SuspensionRequestPayload` with all required fields
    - Handle success response by updating workflow state to 'pending_validation'
    - Handle error response by displaying error message via toast
    - Update UI to show "Pending Validation" badge on success
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.7, 11.1, 11.2, 11.3, 11.4, 11.7, 11.8_
  
  - [ ] 6.3 Add workflow state display badges
    - Add conditional rendering for workflow state badges
    - Display yellow "En attente de validation" badge when status is 'pending_validation'
    - Display red "Suspendu" badge when status is 'approved'
    - Display gray "Rejeté" badge when status is 'rejected'
    - Include timestamp in badge tooltip
    - Use shadcn/ui Badge component with appropriate variants
    - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.8_
  
  - [ ] 6.4 Implement error handling and user feedback
    - Display validation errors for missing required fields
    - Show toast notification on successful submission
    - Show toast notification with error details on failure
    - Handle 400, 403, 404, 409, 500 error codes with appropriate messages
    - Maintain existing UI patterns and styling
    - _Requirements: 1.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ]* 6.5 Write unit tests for modified AVASuspension component
    - Test workflow state badge displays correctly for each status
    - Test form submission calls workflow service with correct payload
    - Test validation errors prevent submission
    - Test success toast displays on successful submission
    - Test error toast displays on failed submission
    - Test component maintains existing UI structure
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 10.1, 10.2, 10.3, 11.7, 11.8_

- [ ] 7. Add demo mode indicator to UI
  - Create reusable `DemoModeBadge` component
  - Display badge in top-right corner when demo mode is active
  - Use distinctive styling (e.g., orange badge with "MODE DÉMO" text)
  - Add to AVASuspension component header
  - _Requirements: 8.8_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Superviseur Dashboard - Task Management UI

- [ ] 9. Create SuperviseurTaskDashboard component structure
  - [ ] 9.1 Create `components/SuperviseurTaskDashboard.tsx` with base layout
    - Set up component with TypeScript interfaces for props and state
    - Create state variables for tasks, filteredTasks, loading, filters, and sort
    - Define `TaskFilters` interface (businessKey, status, dateFrom, dateTo, operationType)
    - Define `TaskSort` interface (column, direction)
    - Implement card-based layout with header, filters card, and tasks table card
    - Use shadcn/ui Card, CardHeader, CardTitle, CardContent components
    - _Requirements: 2.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 12.1, 12.2, 12.3_
  
  - [ ] 9.2 Implement task fetching and auto-refresh
    - Implement `fetchTasks()` function calling `workflowService.getTasks()`
    - Set up useEffect hook to fetch tasks on component mount
    - Implement 30-second polling interval using setInterval
    - Clean up interval on component unmount
    - Handle loading state during fetch operations
    - Display loading spinner while fetching
    - _Requirements: 2.1, 2.2, 2.9_
  
  - [ ] 9.3 Implement task filtering logic
    - Create useEffect hook to apply filters whenever tasks or filters change
    - Filter by businessKey (dossier number) using string includes
    - Filter by status (UNCLAIMED, CLAIMED, ALL)
    - Filter by operationType (AVA_SUSPENSION, AVA_LEVEE_SUSPENSION, ALL)
    - Filter by date range (dateFrom, dateTo)
    - Update filteredTasks state with filtered results
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 9.4 Implement task sorting logic
    - Add sorting to filter useEffect hook
    - Sort by createdAt (newest first, oldest first)
    - Sort by businessKey (ascending, descending)
    - Apply sort direction (asc, desc)
    - _Requirements: 12.5, 12.6_
  
  - [ ] 9.5 Build filter UI controls
    - Add Input component for dossier number filter
    - Add Select component for status filter (ALL, UNCLAIMED, CLAIMED)
    - Add Select component for operation type filter (ALL, AVA_SUSPENSION, AVA_LEVEE_SUSPENSION)
    - Add date Input components for date range filter
    - Wire up onChange handlers to update filters state
    - Persist filters to session storage on change
    - Restore filters from session storage on mount
    - _Requirements: 12.1, 12.2, 12.3, 12.7, 12.8_

- [ ] 10. Implement task list display and actions
  - [ ] 10.1 Build task table with all columns
    - Create table with columns: Type, N° Dossier, Soumis par, Date de création, Assigné à, Statut, Actions
    - Display operation type badge (Suspension in red, Levée in blue)
    - Display businessKey (dossier number) in bold
    - Display createdBy (submitter user ID)
    - Display createdAt formatted as French locale date/time
    - Display assignee or "-" if unclaimed
    - Display status badge (Non réclamée, Réclamée)
    - _Requirements: 2.3, 2.4, 2.7, 10.4, 10.5, 15.7_
  
  - [ ] 10.2 Implement empty state display
    - Show empty state when filteredTasks array is empty
    - Display FileText icon from lucide-react
    - Display "Aucune tâche en attente" message
    - Center content vertically and horizontally
    - _Requirements: 2.8_
  
  - [ ] 10.3 Implement task claiming functionality
    - Add "Réclamer" button for unclaimed tasks
    - Implement `handleClaimTask()` function calling `workflowService.claimTask()`
    - Show success toast on successful claim
    - Show error toast on claim failure (especially 409 Conflict)
    - Refresh task list after claim attempt
    - Implement optimistic UI update with rollback on error
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 13.1, 13.2, 13.3, 13.5, 13.7_
  
  - [ ] 10.4 Implement approval and rejection actions
    - Add "Approuver" button with CheckCircle2 icon for tasks claimed by current user
    - Add "Rejeter" button with X icon for tasks claimed by current user
    - Implement `handleApproveTask()` function calling `workflowService.approveSuspension()`
    - Implement `handleRejectTask()` function calling `workflowService.rejectSuspension()`
    - Show success toast on successful approval/rejection
    - Show error toast on failure
    - Refresh task list after operation
    - Remove task from list on successful completion
    - _Requirements: 2.6, 4.1, 4.2, 4.6, 4.7, 5.1, 5.2, 5.5, 5.6, 13.4, 13.5, 13.6_
  
  - [ ] 10.5 Handle tasks claimed by other users
    - Display assignee name for tasks claimed by others
    - Disable action buttons for tasks claimed by others
    - Show "Réclamée par {assignee}" text instead of buttons
    - _Requirements: 2.7, 13.6_
  
  - [ ]* 10.6 Write unit tests for SuperviseurTaskDashboard component
    - Test empty state displays when no tasks available
    - Test task list displays correctly with all columns
    - Test "Réclamer" button appears for unclaimed tasks
    - Test "Approuver" and "Rejeter" buttons appear for tasks claimed by current user
    - Test tasks claimed by others show assignee name
    - Test filtering by dossier number
    - Test filtering by status
    - Test filtering by operation type
    - Test date range filtering
    - Test sorting by date and dossier number
    - Test 30-second auto-refresh interval
    - Test filter persistence in session storage
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [ ] 11. Add manual refresh button
  - Add "Actualiser" button with RotateCcw icon in dashboard header
  - Wire up onClick handler to call `fetchTasks()`
  - Disable button while loading
  - _Requirements: 2.9, 10.7_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Approval Workflow - Concurrent Operations & Error Handling

- [ ] 13. Implement concurrent operation handling
  - [ ] 13.1 Add conflict detection for task claims
    - Ensure 409 Conflict errors are properly caught in workflow service
    - Display user-friendly message "Cette tâche a déjà été réclamée par un autre utilisateur"
    - Automatically refresh task list on conflict
    - Update task assignee information to reflect current state
    - _Requirements: 13.1, 13.2, 13.3, 13.6_
  
  - [ ] 13.2 Implement optimistic UI updates with rollback
    - Update task status optimistically when claiming
    - Revert changes if claim fails
    - Show loading state during operation
    - Maintain consistent UI state
    - _Requirements: 13.7_
  
  - [ ]* 13.3 Write integration tests for concurrent operations
    - Test two simultaneous claim attempts result in only one success
    - Test conflict error displays appropriate message
    - Test task list refreshes after conflict
    - Test optimistic UI rollback on error
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7_

- [ ] 14. Enhance error handling across all components
  - [ ] 14.1 Add comprehensive error logging
    - Ensure all workflow operations log to console in development mode
    - Include correlation IDs in all log entries
    - Log request details, response status, and error messages
    - Prepare structure for remote logging service integration
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_
  
  - [ ] 14.2 Implement retry mechanism for network errors
    - Add retry logic with exponential backoff for network failures
    - Suggest manual retry to user on persistent failures
    - Display connection status indicator
    - _Requirements: 7.6_
  
  - [ ]* 14.3 Write integration tests for error scenarios
    - Test 400 Bad Request displays validation errors
    - Test 401 Unauthorized redirects to login
    - Test 403 Forbidden displays permission error
    - Test 404 Not Found displays appropriate message
    - Test 409 Conflict displays conflict message
    - Test 500 Server Error displays generic error
    - Test network error displays connection error
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Suspension Lift Integration - AVALeveeSuspension Component

- [ ] 16. Modify AVALeveeSuspension component for workflow integration
  - [ ] 16.1 Add workflow state management to AVALeveeSuspension
    - Import workflow service and types
    - Add `workflowState` state variable similar to AVASuspension
    - Add state for tracking submission status
    - Initialize workflow state on component mount
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 16.2 Implement suspension lift submission
    - Implement `submitLeveeSuspension()` function in workflow service
    - Call POST `/api/wf/operations/AVA_LEVEE_SUSPENSION/{numDossier}/decide/SOUMETTRE`
    - Include user context headers
    - Handle demo mode simulation
    - Construct `LeveeSuspensionRequestPayload` with motifLevee, dateLevee, numBct, dateBct
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.8_
  
  - [ ] 16.3 Replace direct API call with workflow submission
    - Modify `handleSubmit` function to call `workflowService.submitLeveeSuspension()`
    - Validate form data (numeroDossier, motifLevee, dateLevee required)
    - Include BCT authorization fields when applicable
    - Handle success and error responses
    - Update workflow state on success
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 16.4 Add workflow state display badges
    - Add conditional rendering for workflow state badges
    - Display "En attente de validation" badge for pending lifts
    - Display "Levée approuvée" badge for approved lifts
    - Display "Levée rejetée" badge for rejected lifts
    - Use same badge styling as AVASuspension component
    - _Requirements: 10.1, 10.2, 10.3, 15.7_
  
  - [ ]* 16.5 Write unit tests for modified AVALeveeSuspension component
    - Test workflow state badge displays correctly
    - Test form submission calls workflow service with correct payload
    - Test BCT fields are included when provided
    - Test validation errors prevent submission
    - Test success and error toast notifications
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 17. Update SuperviseurTaskDashboard to handle suspension lift tasks
  - Verify operation type filter includes AVA_LEVEE_SUSPENSION
  - Verify task table displays suspension lift tasks with "Levée" badge
  - Verify approval/rejection works for suspension lift tasks
  - Ensure task list distinguishes between suspension and lift operations
  - _Requirements: 15.7, 15.8_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: Testing, Polish & Integration

- [ ] 19. Add navigation and routing
  - [ ] 19.1 Add SuperviseurTaskDashboard to application routing
    - Add route for `/superviseur/validation-suspensions`
    - Protect route with SUPERVISEUR role check
    - Add navigation menu item for Superviseurs
    - _Requirements: 9.6_
  
  - [ ] 19.2 Update Sidebar component with new menu item
    - Add "Validation des Suspensions" menu item for SUPERVISEUR role
    - Use appropriate icon (e.g., CheckSquare from lucide-react)
    - Link to SuperviseurTaskDashboard route
    - _Requirements: 9.6_

- [ ] 20. Implement workflow state refresh on navigation
  - Add workflow state check when user navigates to dossier list
  - Refresh workflow state without full page reload
  - Update badges dynamically when state changes
  - _Requirements: 10.7, 10.8_

- [ ] 21. Add accessibility improvements
  - [ ] 21.1 Add ARIA labels to all interactive elements
    - Add aria-label to buttons (Réclamer, Approuver, Rejeter)
    - Add aria-label to filter inputs
    - Add aria-label to sort controls
    - Add role attributes to table elements
  
  - [ ] 21.2 Ensure keyboard navigation works correctly
    - Test tab order through all interactive elements
    - Ensure all buttons are keyboard accessible
    - Add keyboard shortcuts for common actions (optional)
  
  - [ ] 21.3 Verify color contrast and visual indicators
    - Ensure badges have sufficient color contrast
    - Use icons alongside color for status indicators
    - Test with screen reader (manual testing)

- [ ] 22. Performance optimization
  - [ ] 22.1 Implement polling optimization
    - Pause polling when browser tab is inactive using Page Visibility API
    - Cancel pending requests on component unmount
    - Implement request debouncing for filter changes
    - _Requirements: Performance considerations from design_
  
  - [ ] 22.2 Optimize state management
    - Use useMemo for filtered and sorted task lists
    - Use useCallback for event handlers
    - Minimize unnecessary re-renders
  
  - [ ] 22.3 Implement lazy loading for dashboard
    - Use React.lazy() to code-split SuperviseurTaskDashboard
    - Add Suspense boundary with loading fallback
    - Reduce initial bundle size

- [ ] 23. Complete integration testing
  - [ ]* 23.1 Write end-to-end workflow tests
    - Test complete Agent submission workflow
    - Test complete Superviseur approval workflow
    - Test complete Superviseur rejection workflow
    - Test concurrent claim scenarios
    - Test error recovery scenarios
  
  - [ ]* 23.2 Write API integration tests
    - Test all MS-WF endpoints with mock server
    - Verify request payloads match API contract
    - Verify response parsing handles all cases
    - Test user context headers in all requests

- [ ] 24. Manual testing and bug fixes
  - [ ] 24.1 Execute manual testing checklist
    - Test Agent workflow: select dossier, fill form, submit, verify badge
    - Test Superviseur workflow: view tasks, filter, sort, claim, approve/reject
    - Test demo mode: enable demo mode, verify all workflows work with mock data
    - Test error scenarios: network errors, validation errors, permission errors
    - Test concurrent operations: multiple users claiming same task
    - Test auto-refresh: verify 30-second polling works correctly
    - Test filter persistence: verify filters restore on page reload
  
  - [ ] 24.2 Fix identified bugs and issues
    - Document all bugs found during manual testing
    - Prioritize bugs by severity
    - Fix critical and high-priority bugs
    - Retest after fixes
  
  - [ ] 24.3 UI polish and refinement
    - Verify consistent styling across all components
    - Ensure responsive layout works on different screen sizes
    - Verify loading states display correctly
    - Ensure toast notifications are clear and helpful
    - Verify demo mode badge is visible and distinctive

- [ ] 25. Documentation and deployment preparation
  - [ ] 25.1 Update component documentation
    - Add JSDoc comments to all public functions
    - Document component props and interfaces
    - Add usage examples for workflow service
    - Document error codes and handling
  
  - [ ] 25.2 Create deployment checklist
    - Verify environment variables are configured
    - Verify MS-WF base URL is correct for each environment
    - Verify demo mode is disabled in production
    - Verify logging configuration is appropriate
    - Document deployment steps
  
  - [ ] 25.3 Create user guide
    - Document Agent workflow with screenshots
    - Document Superviseur workflow with screenshots
    - Document error messages and recovery steps
    - Document demo mode usage for testing

- [ ] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- The implementation follows a 6-phase approach aligned with the design document
- All code examples use TypeScript as specified in the design document
- Property-based testing is NOT included as this feature involves external service integration and UI rendering, which are better tested with example-based unit tests and integration tests
- Demo mode enables offline testing without live MS-WF backend
- User context headers are required for all MS-WF API calls
- Optimistic UI updates improve perceived performance
- 30-second auto-refresh keeps task list current
- Concurrent operation handling prevents conflicts
- Comprehensive error handling provides clear user feedback

## Requirements Coverage

This implementation plan covers all 15 requirements with 87 acceptance criteria:

- **Requirement 1**: Agent Suspension Request Submission (Tasks 6.2, 6.3, 6.4)
- **Requirement 2**: Superviseur Task Dashboard (Tasks 9, 10)
- **Requirement 3**: Task Claiming (Tasks 10.3, 13.1)
- **Requirement 4**: Suspension Approval (Tasks 10.4)
- **Requirement 5**: Suspension Rejection (Tasks 10.4)
- **Requirement 6**: User Context Headers Management (Tasks 2, 4)
- **Requirement 7**: Error Handling and User Feedback (Tasks 4.1, 6.4, 14)
- **Requirement 8**: Demo Mode Support (Tasks 3, 7)
- **Requirement 9**: Backward Compatibility with Existing UI (Tasks 6, 9, 16)
- **Requirement 10**: Workflow State Visibility (Tasks 6.3, 10.1, 20)
- **Requirement 11**: Suspension Request Payload Construction (Tasks 6.2, 16.3)
- **Requirement 12**: Task List Filtering and Sorting (Tasks 9.3, 9.4, 9.5)
- **Requirement 13**: Concurrent Task Handling (Tasks 13)
- **Requirement 14**: Audit Trail and Logging (Tasks 4.1, 14.1)
- **Requirement 15**: Suspension Lift Workflow Integration (Tasks 16, 17)
