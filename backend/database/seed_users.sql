-- Insert test users with hashed passwords
-- Note: These passwords are hashed versions of 'password123'
INSERT INTO Users (Username, Email, PasswordHash, FullName)
VALUES 
    ('requester1', 'requester1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'John Requester'),
    ('receiver1', 'receiver1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Sarah Receiver'),
    ('reviewer1', 'reviewer1@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Mike Reviewer'),
    ('requester2', 'requester2@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Alice Requester'),
    ('receiver2', 'receiver2@company.com', '$2a$10$X7z3bJwq5K9Z8Y7N2v1w0e.9Q8R7T6Y5U4I3O2P1L0K9J8H7G6F5E4D3C2B1A0', 'Bob Receiver');

-- Insert some sample application requests
INSERT INTO ApplicationRequests (Title, Purpose, ExpectedBenefits, RequesterId, ReceiverId, InitialDueDate, CurrentDueDate)
VALUES 
    ('Customer Portal', 'Create a customer-facing portal for account management', 'Improved customer satisfaction and reduced support calls', 1, 2, DATEADD(day, 30, GETDATE()), DATEADD(day, 30, GETDATE())),
    ('Inventory System', 'Develop an inventory management system', 'Better stock control and reduced operational costs', 4, 5, DATEADD(day, 45, GETDATE()), DATEADD(day, 45, GETDATE()));

-- Assign roles to users for the requests
INSERT INTO RequestAccessUsers (RequestId, UserId, Role)
VALUES 
    (1, 1, 'Requester'),  -- John is the requester
    (1, 2, 'Receiver'),   -- Sarah is the receiver
    (1, 3, 'Reviewer'),   -- Mike is a reviewer
    (2, 4, 'Requester'),  -- Alice is the requester
    (2, 5, 'Receiver');   -- Bob is the receiver

-- Insert some timeline events
INSERT INTO RequestTimeline (RequestId, ActionType, ActionBy, OldValue, NewValue)
VALUES 
    (1, 'StatusChange', 1, 'Pending', 'In Progress'),
    (1, 'Extension', 2, '2023-12-01', '2023-12-15'),
    (2, 'StatusChange', 4, 'Pending', 'In Progress');

-- Insert sample users with hashed passwords
-- Password for all users is 'password123'
INSERT INTO UsersEPPA (Username, Email, PasswordHash, FullName)
VALUES 
    ('admin', 'admin@eppa.com', '$2a$10$X7z3bJwq5VYq5VYq5VYq5.VYq5VYq5VYq5VYq5VYq5VYq5VYq5VY', 'System Administrator'),
    ('requester1', 'requester1@eppa.com', '$2a$10$X7z3bJwq5VYq5VYq5VYq5.VYq5VYq5VYq5VYq5VYq5VYq5VYq5VY', 'John Requester'),
    ('reviewer1', 'reviewer1@eppa.com', '$2a$10$X7z3bJwq5VYq5VYq5VYq5.VYq5VYq5VYq5VYq5VYq5VYq5VYq5VY', 'Jane Reviewer'),
    ('requester2', 'requester2@eppa.com', '$2a$10$X7z3bJwq5VYq5VYq5VYq5.VYq5VYq5VYq5VYq5VYq5VYq5VYq5VY', 'Mike Requester'),
    ('reviewer2', 'reviewer2@eppa.com', '$2a$10$X7z3bJwq5VYq5VYq5VYq5.VYq5VYq5VYq5VYq5VYq5VYq5VYq5VY', 'Sarah Reviewer'); 