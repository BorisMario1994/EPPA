drop table if exists [AnnotationHistory]
drop table if exists [dbo].[AnnotationHistory]
drop table if exists [dbo].[NotificationList]
drop table if exists [dbo].[NotificationRead]
drop table if exists [dbo].[PDFAnnotations]
drop table if exists [dbo].[PDFDocuments]
drop table if exists [dbo].[RequestTimeline]
drop table if exists [dbo].[RequestAccessUsers]
drop table if exists [dbo].[ApplicationRequests]




CREATE TABLE [dbo].[ApplicationRequests](
	[RequestId] [int] IDENTITY(1,1) NOT NULL,
	[RequestNo] [varchar](50) not null,
	[Title] [varchar](max) NOT NULL,
	[Purpose] [nvarchar](max) NOT NULL,
	[ExpectedBenefits] [nvarchar](max) NOT NULL,
	[Status] [nvarchar](50) NULL,
	[RequesterId] [varchar](10) NOT NULL,
	[CreatedAt] [date] NULL,
	[ReceivedDate] [date] NULL,
	[PIC] [varchar](10) NULL,
	[ClosedAt] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[RequestId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[ApplicationRequests] ADD  DEFAULT ('Pending') FOR [Status]
GO

ALTER TABLE [dbo].[ApplicationRequests] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[ApplicationRequests] ADD  DEFAULT (getdate()) FOR [ReceivedDate]
GO



CREATE TABLE [dbo].[PDFAnnotations](
	[AnnotationId] [int] IDENTITY(1,1) NOT NULL,
	[DocumentId] [int] NOT NULL,
	[UserId] [varchar](10) NOT NULL,
	[AnnotationType] [nvarchar](50) NOT NULL,
	[Content] [nvarchar](max) NULL,
	[PageNumber] [int] NOT NULL,
	[XCoordinate] [float] NULL,
	[YCoordinate] [float] NULL,
	[X1] [float] NULL,
	[Y1] [float] NULL,
	[X2] [float] NULL,
	[Y2] [float] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[AnnotationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[PDFAnnotations] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[PDFAnnotations]  WITH CHECK ADD FOREIGN KEY([DocumentId])
REFERENCES [dbo].[PDFDocuments] ([DocumentId])




CREATE TABLE [dbo].[PDFDocuments](
	[DocumentId] [int] IDENTITY(1,1) NOT NULL,
	[RequestId] [int] NOT NULL,
	[FileName] [nvarchar](255) NOT NULL,
	[FilePath] [nvarchar](max) NOT NULL,
	[UploadedBy] [varchar](10) NOT NULL,
	[UploadedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[DocumentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[PDFDocuments] ADD  DEFAULT (getdate()) FOR [UploadedAt]
GO

ALTER TABLE [dbo].[PDFDocuments]  WITH CHECK ADD FOREIGN KEY([RequestId])
REFERENCES [dbo].[ApplicationRequests] ([RequestId])




CREATE TABLE [dbo].[AnnotationHistory](
	[HistoryId] [int] IDENTITY(1,1) NOT NULL,
	[AnnotationId] [int] NOT NULL,
	[UserId] [varchar](10) NOT NULL,
	[Action] [nvarchar](50) NOT NULL,
	[PreviousContent] [nvarchar](max) NULL,
	[NewContent] [nvarchar](max) NULL,
	[ChangedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[HistoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[AnnotationHistory] ADD  DEFAULT (getdate()) FOR [ChangedAt]
GO

ALTER TABLE [dbo].[AnnotationHistory]  WITH CHECK ADD FOREIGN KEY([AnnotationId])
REFERENCES [dbo].[PDFAnnotations] ([AnnotationId])
GO

CREATE TABLE [dbo].[NotificationList](
	[NotificationId] [int] IDENTITY(1,1) NOT NULL,
	[CreatorId] [varchar](10) NOT NULL,
	[RequestId] [int] NOT NULL,
	[Remarks] [varchar](200) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[NotificationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[NotificationList]  WITH CHECK ADD FOREIGN KEY([RequestId])
REFERENCES [dbo].[ApplicationRequests] ([RequestId])



CREATE TABLE [dbo].[NotificationRead](
	[NotificationId] [int] NOT NULL,
	[ContributorId] [varchar](10) NOT NULL,
	[ReadAt] [datetime] NOT NULL
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[NotificationRead]  WITH CHECK ADD FOREIGN KEY([NotificationId])
REFERENCES [dbo].[NotificationList] ([NotificationId])

CREATE TABLE [dbo].[RequestAccessUsers](
	[RequestId] [int] NOT NULL,
	[LineNum] [int] NOT NULL,
	[UserId] [varchar](10) NOT NULL,
	[Role] [nvarchar](50) NOT NULL,
	[CreatedAt] [date] NULL,
	[ApprovedAt] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[RequestId] ASC,
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[RequestAccessUsers] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[RequestAccessUsers]  WITH CHECK ADD FOREIGN KEY([RequestId])
REFERENCES [dbo].[ApplicationRequests] ([RequestId])

CREATE TABLE [dbo].[RequestTimeline](
	[TimelineId] [int] IDENTITY(1,1) NOT NULL,
	[RequestId] [int] NOT NULL,
	[TimeDate] [date] NOT NULL,
	[ActionType] [nvarchar](100) NOT NULL,
	[Remarks] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime] NULL,
	[ActionBy] [varchar](10) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[TimelineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO

ALTER TABLE [dbo].[RequestTimeline] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[RequestTimeline]  WITH CHECK ADD FOREIGN KEY([RequestId])
REFERENCES [dbo].[ApplicationRequests] ([RequestId])


CREATE TABLE [dbo].[HELPDESK_USER](
	[USERNAME] [nchar](10) NULL,
	[PASSWORD] [varbinary](8000) NULL,
	[SUPERIOR] [nvarchar](10) NULL,
	[SALT] [varchar](10) NULL,
	[LVL] [varchar](50) NULL
) ON [PRIMARY]


