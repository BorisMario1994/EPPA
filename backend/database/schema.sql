CREATE TABLE UsersEPPA (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- Application Requests table

CREATE TABLE ApplicationRequests (
    RequestId INT IDENTITY(1,1) PRIMARY KEY,
    Title VARCHAR(max) NOT NULL,
    Purpose NVARCHAR(MAX) NOT NULL,
    ExpectedBenefits NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending',
    RequesterId INT NOT NULL,
    ReceiverId INT NOT NULL,
    CreatedAt DATE DEFAULT GETDATE(),
	ReceivedDate Date DEFAULT GETDATE(),
	PIC INT NULL,
    ClosedAt DATE,
    FOREIGN KEY (RequesterId) REFERENCES UsersEPPA(UserId),
    FOREIGN KEY (ReceiverId) REFERENCES UsersEPPA(UserId)
);


-- Request Access UsersEPPA table (Many-to-Many relationship)
CREATE TABLE RequestAccessUsers (
    RequestId INT NOT NULL,
    UserId INT NOT NULL,
    Role NVARCHAR(50) NOT NULL, -- 'Requester', 'Receiver', 'Reviewer'
    CreatedAt DATE DEFAULT GETDATE(),
    ApprovedAt DATE,
    PRIMARY KEY (RequestId, UserId),
    FOREIGN KEY (RequestId) REFERENCES ApplicationRequests(RequestId),
    FOREIGN KEY (UserId) REFERENCES UsersEPPA(UserId)
);

-- Request Timeline table
CREATE TABLE RequestTimeline (
    TimelineId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT NOT NULL,
    TimeDate Date NOT NULL,
    ActionType NVARCHAR(100) NOT NULL, --'Target Selesai', 'Perpanjangan TS' ,'Tanggal Selesai Dikerjakan', 'Target Pengecekan', 'Perpanjangan Tgl Pengecekan'  ,'Close Request'
    Remarks NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
	ActionBy INT NOT NULL,
    FOREIGN KEY (RequestId) REFERENCES ApplicationRequests(RequestId),
    FOREIGN KEY (ActionBy) REFERENCES UsersEPPA(UserId)
);

-- PDF Documents table
CREATE TABLE PDFDocuments (
    DocumentId INT IDENTITY(1,1) PRIMARY KEY,
    RequestId INT NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    FilePath NVARCHAR(MAX) NOT NULL,
    UploadedBy INT NOT NULL,
    UploadedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RequestId) REFERENCES ApplicationRequests(RequestId),
    FOREIGN KEY (UploadedBy) REFERENCES UsersEPPA(UserId)
);

-- PDF Annotations table
CREATE TABLE PDFAnnotations (
    AnnotationId INT IDENTITY(1,1) PRIMARY KEY,
    DocumentId INT NOT NULL,
    UserId INT NOT NULL,
    AnnotationType NVARCHAR(50) NOT NULL,
    Content NVARCHAR(MAX),
    PageNumber INT NOT NULL,
    XCoordinate FLOAT NOT NULL,
    YCoordinate FLOAT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (DocumentId) REFERENCES PDFDocuments(DocumentId),
    FOREIGN KEY (UserId) REFERENCES UsersEPPA(UserId)
);

-- Annotation History table
CREATE TABLE AnnotationHistory (
    HistoryId INT IDENTITY(1,1) PRIMARY KEY,
    AnnotationId INT NOT NULL,
    UserId INT NOT NULL,
    Action NVARCHAR(50) NOT NULL,
    PreviousContent NVARCHAR(MAX),
    NewContent NVARCHAR(MAX),
    ChangedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (AnnotationId) REFERENCES PDFAnnotations(AnnotationId),
    FOREIGN KEY (UserId) REFERENCES UsersEPPA(UserId)
); 