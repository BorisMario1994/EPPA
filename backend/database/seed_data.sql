-- Insert test users
INSERT INTO Users (Username, Email, PasswordHash, FullName)
VALUES 
    ('requester1', 'requester1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'John Requester'),
    ('receiver1', 'receiver1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Sarah Receiver'),
    ('reviewer1', 'reviewer1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Mike Reviewer'),
    ('requester2', 'requester2@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Alice Requester'),
    ('receiver2', 'receiver2@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Bob Receiver');

-- Insert sample application requests
INSERT INTO ApplicationRequests (
    Title, 
    Purpose, 
    ExpectedBenefits, 
    Status, 
    RequesterId, 
    ReceiverId, 
    InitialDueDate, 
    CurrentDueDate, 
    ReviewDueDate
)
VALUES 
    ('New Feature Request', 
    'Implement user authentication system', 
    'Enhanced security and user management', 
    'Pending', 
    2, -- requester1
    3, -- reviewer1
    '2024-03-01',
    '2024-03-01',
    '2024-03-15'
    ),
    ('System Update', 
    'Update database schema', 
    'Improved data structure and performance', 
    'In Progress', 
    4, -- requester2
    5, -- reviewer2
    '2024-03-05',
    '2024-03-05',
    '2024-03-20'
    );

-- Insert request access users
INSERT INTO RequestAccessUsers (RequestId, UserId, Role)
VALUES 
    (1, 2, 'Requester'),
    (1, 3, 'Reviewer'),
    (2, 4, 'Requester'),
    (2, 5, 'Reviewer');

-- Insert request timeline entries
INSERT INTO RequestTimeline (RequestId, ActionType, ActionBy, OldValue, NewValue)
VALUES 
    (1, 'StatusChange', 2, NULL, 'Pending'),
    (2, 'StatusChange', 4, NULL, 'In Progress');

-- Insert PDF documents
INSERT INTO PDFDocuments (RequestId, FileName, FilePath, UploadedBy)
VALUES 
    (1, 'customer_portal_specs.pdf', '/uploads/customer_portal_specs.pdf', 1),
    (1, 'customer_portal_mockups.pdf', '/uploads/customer_portal_mockups.pdf', 1),
    (2, 'inventory_system_requirements.pdf', '/uploads/inventory_system_requirements.pdf', 4),
    (3, 'hr_platform_workflow.pdf', '/uploads/hr_platform_workflow.pdf', 1);

-- Insert PDF annotations
INSERT INTO PDFAnnotations (DocumentId, UserId, AnnotationType, Content, PageNumber, XCoordinate, YCoordinate)
VALUES 
    (1, 1, 'Text', 'Need to add user profile section', 1, 100.5, 200.5),
    (1, 2, 'Highlight', 'Important security requirement', 2, 150.5, 300.5),
    (1, 3, 'Comment', 'Consider adding mobile responsiveness', 1, 200.5, 250.5),
    (2, 1, 'Drawing', 'Suggested UI layout', 1, 300.5, 400.5),
    (3, 4, 'Text', 'Add export functionality', 1, 250.5, 350.5);

-- Insert annotation history
INSERT INTO AnnotationHistory (AnnotationId, UserId, Action, PreviousContent, NewContent)
VALUES 
    (1, 1, 'Create', NULL, 'Need to add user profile section'),
    (1, 2, 'Edit', 'Need to add user profile section', 'Need to add user profile section with photo upload'),
    (2, 2, 'Create', NULL, 'Important security requirement'),
    (3, 3, 'Create', NULL, 'Consider adding mobile responsiveness'),
    (4, 1, 'Create', NULL, 'Suggested UI layout'); 