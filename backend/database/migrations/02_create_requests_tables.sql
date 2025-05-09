-- Create ApplicationRequests table
CREATE TABLE ApplicationRequests (
    RequestId INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Purpose NVARCHAR(MAX) NOT NULL,
    ExpectedBenefits NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    RequesterId INT NOT NULL,
    ReceiverId INT NOT NULL,
    InitialDueDate DATETIME NOT NULL,
    CurrentDueDate DATETIME NOT NULL,
    ReviewDueDate DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    ClosedAt DATETIME,
    FOREIGN KEY (RequesterId) REFERENCES UsersEPPA(UserId),
    FOREIGN KEY (ReceiverId) REFERENCES UsersEPPA(UserId)
);

-- Create RequestFiles table
CREATE TABLE RequestFiles (
    FileId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    FilePath NVARCHAR(MAX) NOT NULL,
    UploadedBy INT NOT NULL,
    UploadedAt DATETIME NOT NULL,
    FOREIGN KEY (RequestId) REFERENCES ApplicationRequests(RequestId),
    FOREIGN KEY (UploadedBy) REFERENCES UsersEPPA(UserId)
); 