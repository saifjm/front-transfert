# Requirements Document: AVA Suspension Workflow Integration

## Introduction

This document specifies the requirements for migrating the AVA suspension system from direct backend service calls (AVA1) to a centralized workflow engine (MS-WF). The integration implements a two-step workflow with separation of duties between Agent and Superviseur roles, task assignment, claiming, and workflow state management.

The current system allows agents to directly suspend or lift suspension on AVA dossiers through simple API calls. The new system introduces a validation workflow where agents submit suspension requests that must be approved by supervisors before taking effect.

## Glossary

- **AVA_System**: The existing AVA (Avance sur Vente à l'Étranger) dossier management system
- **MS_WF**: The centralized workflow engine that manages multi-step business processes
- **Agent**: User with AGENT_SAISIE role who initiates suspension requests
- **Superviseur**: User with SUPERVISEUR role who validates suspension requests
- **Workflow_Task**: A unit of work in MS-WF requiring user action
- **Business_Key**: The unique identifier for a workflow instance (numDossier)
- **Operation_Key**: The workflow type identifier (AVA_SUSPENSION)
- **Task_Claim**: The action of assigning a workflow task to a specific user
- **Saisie_Step**: The initial workflow step where Agent submits suspension request
- **Validation_Step**: The second workflow step where Superviseur approves or rejects
- **Draft_Suspension**: A suspension created with finalize=false, pending validation
- **Finalized_Suspension**: A suspension created with finalize=true, active in system
- **AVA1_Service**: The backend service that executes suspension operations
- **Dossier_State**: The status of an AVA dossier (A=Active, B=Suspended, C=Closed)
- **User_Context_Headers**: HTTP headers containing user identity and role information
- **Authenticated_Fetch**: The existing authentication mechanism for API calls
- **Demo_Mode**: A testing mode that simulates API responses without backend calls

## Requirements

### Requirement 1: Agent Suspension Request Submission

**User Story:** As an Agent, I want to submit a suspension request for an AVA dossier, so that the request can be reviewed and validated by a Superviseur.

#### Acceptance Criteria

1. WHEN an Agent selects a dossier and submits a suspension request, THE AVA_System SHALL call MS_WF endpoint POST /api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/SOUMETTRE
2. WHEN submitting a suspension request, THE AVA_System SHALL include User_Context_Headers (X-User-Id, X-Role-Code, X-Org-Node-Id) in the request
3. WHEN MS_WF receives a SOUMETTRE decision, THE MS_WF SHALL create a Draft_Suspension in AVA1_Service with finalize=false
4. WHEN a Draft_Suspension is created successfully, THE MS_WF SHALL transition the workflow to Validation_Step
5. WHEN the workflow transitions to Validation_Step, THE AVA_System SHALL display a success message indicating the request is pending validation
6. IF the suspension request submission fails, THEN THE AVA_System SHALL display an error message with details from MS_WF response
7. WHEN an Agent submits a suspension request, THE AVA_System SHALL include motifSuspension and dateSuspension in the request payload

### Requirement 2: Superviseur Task Dashboard

**User Story:** As a Superviseur, I want to view all pending suspension validation tasks, so that I can review and process them.

#### Acceptance Criteria

1. WHEN a Superviseur accesses the suspension validation dashboard, THE AVA_System SHALL call MS_WF endpoint GET /api/wf/tasks?operationKey=AVA_SUSPENSION
2. WHEN retrieving tasks, THE AVA_System SHALL include User_Context_Headers with SUPERVISEUR role in the request
3. WHEN MS_WF returns tasks, THE AVA_System SHALL display a list containing taskId, businessKey (numDossier), assignee, and creation date
4. WHEN displaying tasks, THE AVA_System SHALL show task status (UNCLAIMED, CLAIMED, COMPLETED)
5. WHEN a task is unclaimed, THE AVA_System SHALL display a "Claim" action button
6. WHEN a task is claimed by the current user, THE AVA_System SHALL display "Approve" and "Reject" action buttons
7. WHEN a task is claimed by another user, THE AVA_System SHALL display the assignee name and disable action buttons
8. WHEN the task list is empty, THE AVA_System SHALL display a message indicating no pending tasks
9. THE AVA_System SHALL refresh the task list automatically every 30 seconds

### Requirement 3: Task Claiming

**User Story:** As a Superviseur, I want to claim a suspension validation task, so that I can take ownership and prevent duplicate processing.

#### Acceptance Criteria

1. WHEN a Superviseur clicks the "Claim" button on an unclaimed task, THE AVA_System SHALL call MS_WF endpoint POST /api/wf/tasks/{taskId}/claim
2. WHEN claiming a task, THE AVA_System SHALL include User_Context_Headers with the Superviseur's user ID
3. WHEN MS_WF successfully assigns the task, THE AVA_System SHALL update the task display to show "Claimed by you"
4. WHEN MS_WF successfully assigns the task, THE AVA_System SHALL enable the "Approve" and "Reject" action buttons
5. IF the task claim fails because another user claimed it first, THEN THE AVA_System SHALL display an error message and refresh the task list
6. IF the task claim fails for other reasons, THEN THE AVA_System SHALL display the error message from MS_WF response

### Requirement 4: Suspension Approval

**User Story:** As a Superviseur, I want to approve a suspension request, so that the dossier becomes suspended in the system.

#### Acceptance Criteria

1. WHEN a Superviseur clicks "Approve" on a claimed task, THE AVA_System SHALL call MS_WF endpoint POST /api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/APPROUVER
2. WHEN approving a suspension, THE AVA_System SHALL include User_Context_Headers with SUPERVISEUR role
3. WHEN MS_WF receives an APPROUVER decision, THE MS_WF SHALL finalize the suspension in AVA1_Service with finalize=true
4. WHEN AVA1_Service finalizes the suspension, THE AVA1_Service SHALL update the Dossier_State to 'B' (Suspended)
5. WHEN the suspension is finalized successfully, THE MS_WF SHALL mark the Workflow_Task as completed
6. WHEN the workflow completes successfully, THE AVA_System SHALL display a success message indicating the dossier is now suspended
7. WHEN the workflow completes successfully, THE AVA_System SHALL remove the task from the pending tasks list
8. IF the approval fails, THEN THE AVA_System SHALL display an error message with details from MS_WF response

### Requirement 5: Suspension Rejection

**User Story:** As a Superviseur, I want to reject a suspension request, so that the request is cancelled and the Agent can resubmit if needed.

#### Acceptance Criteria

1. WHEN a Superviseur clicks "Reject" on a claimed task, THE AVA_System SHALL call MS_WF endpoint POST /api/wf/operations/AVA_SUSPENSION/{numDossier}/decide/REJETER
2. WHEN rejecting a suspension, THE AVA_System SHALL include User_Context_Headers with SUPERVISEUR role
3. WHEN MS_WF receives a REJETER decision, THE MS_WF SHALL transition the workflow back to Saisie_Step
4. WHEN the workflow returns to Saisie_Step, THE MS_WF SHALL delete the Draft_Suspension from AVA1_Service
5. WHEN the rejection is processed successfully, THE AVA_System SHALL display a message indicating the request was rejected
6. WHEN the rejection is processed successfully, THE AVA_System SHALL remove the task from the Superviseur's task list
7. WHEN the workflow returns to Saisie_Step, THE AVA_System SHALL notify the original Agent that their request was rejected
8. IF the rejection fails, THEN THE AVA_System SHALL display an error message with details from MS_WF response

### Requirement 6: User Context Headers Management

**User Story:** As a developer, I want all MS-WF API calls to include proper user context headers, so that the workflow engine can enforce role-based access control and audit trails.

#### Acceptance Criteria

1. WHEN making any MS_WF API call, THE AVA_System SHALL include X-User-Id header with the current user's identifier
2. WHEN making any MS_WF API call, THE AVA_System SHALL include X-Role-Code header with the current user's role (AGENT_SAISIE or SUPERVISEUR)
3. WHERE the user's organization node is available, THE AVA_System SHALL include X-Org-Node-Id header with the agency identifier
4. WHEN User_Context_Headers are missing or invalid, THE MS_WF SHALL return a 400 Bad Request error
5. WHEN the user's role is insufficient for the requested operation, THE MS_WF SHALL return a 403 Forbidden error
6. THE AVA_System SHALL retrieve user context from the existing Authenticated_Fetch mechanism
7. THE AVA_System SHALL validate that required headers are present before making MS_WF API calls

### Requirement 7: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when workflow operations fail, so that I can understand what went wrong and take corrective action.

#### Acceptance Criteria

1. WHEN an MS_WF API call returns a 400 error, THE AVA_System SHALL display the validation error message from the response body
2. WHEN an MS_WF API call returns a 403 error, THE AVA_System SHALL display a message indicating insufficient permissions
3. WHEN an MS_WF API call returns a 404 error, THE AVA_System SHALL display a message indicating the workflow or task was not found
4. WHEN an MS_WF API call returns a 409 error, THE AVA_System SHALL display a message indicating a conflict (e.g., task already claimed)
5. WHEN an MS_WF API call returns a 500 error, THE AVA_System SHALL display a generic error message and log the full error details
6. WHEN a network error occurs, THE AVA_System SHALL display a message indicating connection failure and suggest retry
7. WHEN an operation succeeds, THE AVA_System SHALL display a success toast notification with operation details
8. THE AVA_System SHALL log all MS_WF API errors to the browser console for debugging

### Requirement 8: Demo Mode Support

**User Story:** As a developer, I want the workflow integration to work in demo mode, so that I can test the UI without a live MS-WF backend.

#### Acceptance Criteria

1. WHERE Demo_Mode is enabled, THE AVA_System SHALL simulate MS_WF API responses without making actual HTTP calls
2. WHERE Demo_Mode is enabled and an Agent submits a suspension, THE AVA_System SHALL return a simulated success response after 500ms delay
3. WHERE Demo_Mode is enabled and a Superviseur requests tasks, THE AVA_System SHALL return a simulated list of 2-3 pending tasks
4. WHERE Demo_Mode is enabled and a Superviseur claims a task, THE AVA_System SHALL return a simulated success response
5. WHERE Demo_Mode is enabled and a Superviseur approves a suspension, THE AVA_System SHALL return a simulated success response
6. WHERE Demo_Mode is enabled and a Superviseur rejects a suspension, THE AVA_System SHALL return a simulated success response
7. THE AVA_System SHALL determine Demo_Mode status from environment configuration or feature flag
8. WHERE Demo_Mode is enabled, THE AVA_System SHALL display a visual indicator (badge or banner) showing demo mode is active

### Requirement 9: Backward Compatibility with Existing UI

**User Story:** As a user, I want the new workflow integration to maintain the existing UI/UX patterns, so that I don't need to learn a completely new interface.

#### Acceptance Criteria

1. THE AVA_System SHALL reuse the existing AVATableauRecherche component for dossier selection
2. THE AVA_System SHALL maintain the existing card-based layout for suspension forms
3. THE AVA_System SHALL use the existing shadcn/ui component library for all new UI elements
4. THE AVA_System SHALL follow the existing color scheme and styling patterns
5. THE AVA_System SHALL maintain the existing toast notification system for user feedback
6. THE AVA_System SHALL preserve the existing navigation structure and menu items
7. WHEN an Agent views the suspension interface, THE AVA_System SHALL display a form similar to the existing AVASuspension component
8. WHEN a Superviseur views the validation dashboard, THE AVA_System SHALL use a table layout similar to AVATableauRecherche

### Requirement 10: Workflow State Visibility

**User Story:** As a user, I want to see the current state of suspension workflows, so that I can track the progress of my requests.

#### Acceptance Criteria

1. WHEN an Agent views a dossier with a pending suspension request, THE AVA_System SHALL display a badge indicating "Pending Validation"
2. WHEN an Agent views a dossier with an approved suspension, THE AVA_System SHALL display a badge indicating "Suspended"
3. WHEN an Agent views a dossier with a rejected suspension request, THE AVA_System SHALL display a badge indicating "Rejected" with rejection timestamp
4. WHEN a Superviseur views the task dashboard, THE AVA_System SHALL display the workflow creation date for each task
5. WHEN a Superviseur views the task dashboard, THE AVA_System SHALL display the Agent who submitted each request
6. WHEN displaying workflow state, THE AVA_System SHALL use color-coded badges (yellow for pending, red for suspended, gray for rejected)
7. THE AVA_System SHALL refresh workflow state when the user navigates back to the dossier list
8. WHEN a workflow state changes, THE AVA_System SHALL update the display without requiring a full page reload

### Requirement 11: Suspension Request Payload Construction

**User Story:** As a developer, I want the system to construct proper suspension request payloads, so that MS-WF and AVA1 receive all required data.

#### Acceptance Criteria

1. WHEN submitting a suspension request, THE AVA_System SHALL include numeroDossier in the request payload
2. WHEN submitting a suspension request, THE AVA_System SHALL include motifSuspension from user input in the request payload
3. WHEN submitting a suspension request, THE AVA_System SHALL include dateSuspension in ISO 8601 format in the request payload
4. WHERE the user provides observations, THE AVA_System SHALL include observations in the request payload
5. WHERE the suspension has a codeEtat, THE AVA_System SHALL include codeEtat in the request payload
6. WHEN approving a suspension, THE AVA_System SHALL include the same payload structure as the initial submission
7. THE AVA_System SHALL validate that required fields (numeroDossier, motifSuspension, dateSuspension) are present before submission
8. IF required fields are missing, THEN THE AVA_System SHALL display validation errors and prevent submission

### Requirement 12: Task List Filtering and Sorting

**User Story:** As a Superviseur, I want to filter and sort pending suspension tasks, so that I can prioritize my work efficiently.

#### Acceptance Criteria

1. WHEN viewing the task dashboard, THE AVA_System SHALL provide a filter input for dossier number (businessKey)
2. WHEN viewing the task dashboard, THE AVA_System SHALL provide a filter dropdown for task status (UNCLAIMED, CLAIMED, ALL)
3. WHEN viewing the task dashboard, THE AVA_System SHALL provide a date range filter for task creation date
4. WHEN a Superviseur applies filters, THE AVA_System SHALL update the task list to show only matching tasks
5. WHEN viewing the task dashboard, THE AVA_System SHALL provide sort options for creation date (newest first, oldest first)
6. WHEN viewing the task dashboard, THE AVA_System SHALL provide sort options for dossier number (ascending, descending)
7. THE AVA_System SHALL persist filter and sort preferences in browser session storage
8. WHEN a Superviseur returns to the task dashboard, THE AVA_System SHALL restore the previous filter and sort settings

### Requirement 13: Concurrent Task Handling

**User Story:** As a Superviseur, I want the system to handle concurrent task operations gracefully, so that conflicts are resolved without data loss.

#### Acceptance Criteria

1. WHEN two Superviseurs attempt to claim the same task simultaneously, THE MS_WF SHALL assign the task to only one user
2. WHEN a task claim fails due to concurrent assignment, THE AVA_System SHALL display a message indicating the task was claimed by another user
3. WHEN a task claim fails due to concurrent assignment, THE AVA_System SHALL refresh the task list to show updated task status
4. WHEN a Superviseur attempts to approve a task that was unclaimed by another user, THE MS_WF SHALL return a 409 Conflict error
5. IF a concurrent operation conflict occurs, THEN THE AVA_System SHALL display the conflict message and prevent the operation
6. WHEN the task list is refreshed, THE AVA_System SHALL update task assignee information to reflect current state
7. THE AVA_System SHALL implement optimistic UI updates with rollback on conflict errors

### Requirement 14: Audit Trail and Logging

**User Story:** As a system administrator, I want all workflow operations to be logged, so that I can audit suspension activities and troubleshoot issues.

#### Acceptance Criteria

1. WHEN an Agent submits a suspension request, THE AVA_System SHALL log the operation with user ID, dossier number, and timestamp
2. WHEN a Superviseur claims a task, THE AVA_System SHALL log the operation with user ID, task ID, and timestamp
3. WHEN a Superviseur approves a suspension, THE AVA_System SHALL log the operation with user ID, dossier number, and timestamp
4. WHEN a Superviseur rejects a suspension, THE AVA_System SHALL log the operation with user ID, dossier number, and timestamp
5. WHEN an MS_WF API call fails, THE AVA_System SHALL log the error with request details, response status, and error message
6. THE AVA_System SHALL log all workflow operations to the browser console in development mode
7. WHERE a logging service is configured, THE AVA_System SHALL send workflow operation logs to the remote logging service
8. THE AVA_System SHALL include correlation IDs in logs to trace related operations across the workflow lifecycle

### Requirement 15: Suspension Lift Workflow Integration

**User Story:** As an Agent, I want to lift suspensions through the workflow engine, so that suspension lifts follow the same validation process as suspensions.

#### Acceptance Criteria

1. WHEN an Agent submits a suspension lift request, THE AVA_System SHALL call MS_WF endpoint POST /api/wf/operations/AVA_LEVEE_SUSPENSION/{numDossier}/decide/SOUMETTRE
2. WHEN submitting a suspension lift request, THE AVA_System SHALL include motifLevee and dateLevee in the request payload
3. WHERE the lift is based on a BCT authorization, THE AVA_System SHALL include numBct and dateBct in the request payload
4. WHEN MS_WF receives a suspension lift SOUMETTRE decision, THE MS_WF SHALL create a draft lift operation in AVA1_Service
5. WHEN a Superviseur approves a suspension lift, THE MS_WF SHALL finalize the lift and update Dossier_State to 'A' (Active)
6. WHEN a Superviseur rejects a suspension lift, THE MS_WF SHALL delete the draft lift operation
7. THE AVA_System SHALL display suspension lift tasks in the same dashboard as suspension tasks with a distinguishing badge
8. THE AVA_System SHALL use the same task claiming and approval workflow for suspension lifts as for suspensions

