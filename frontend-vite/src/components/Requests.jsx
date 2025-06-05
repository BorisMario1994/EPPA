import React, { useState, useEffect, useRef } from 'react';
import './Requests.css';
import PDFViewer from './PDFViewer';

const ITEMS_PER_PAGE = 10;

const Requests = ({ user, type }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [attachments, setAttachments] = useState({});
  const [outgoingCount, setOutgoingCount] = useState(0);
  const [assignRequestCount, setAssignRequestCount] = useState(0);
  const [notYetApprovedCount, setNotYetApprovedCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [needToApproveCount, setNeedToApproveCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [dragTarget, setDragTarget] = useState(null);
  const [draggedUser, setDraggedUser] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState({ open: false, requestId: null, role: null });
  const [modalAvailableUsers, setModalAvailableUsers] = useState([]);
  const [modalSelectedUsers, setModalSelectedUsers] = useState([]);
  const [originalSelectedUsers, setOriginalSelectedUsers] = useState([]);
  const [draggedSelectedUser, setDraggedSelectedUser] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [picDropdown, setPicDropdown] = useState({ open: false, requestId: null });
  const [timelineModal, setTimelineModal] = useState({ open: false, requestId: null });
  const [timelineDate, setTimelineDate] = useState('');
  const [timelineRemarks, setTimelineRemarks] = useState('');
  const [timelineHistory, setTimelineHistory] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [timelineActionType, setTimelineActionType] = useState('');
  const [searchField, setSearchField] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSidebar, setSelectedSidebar] = useState(null);
  const [picSearchTerm, setPicSearchTerm] = useState('');
  const [hasCloseRequest, setHasCloseRequest] = useState({});

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchRequests = async () => {
      const url = `${import.meta.env.VITE_API_URL}/api/requests/${type}/${user.username}`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setRequests(data);
        } else {
          setRequests([]);
          throw new Error('Failed to fetch requests');
        }
      } catch (error) {
        setError('Failed to load requests. Please try again later.');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user.username, type]);

  useEffect(() => {
    let intervals = [];

    if (user?.username) {
      fetchCount('outgoing', user.username, setOutgoingCount);
      fetchCount('assignrequest', user.username, setAssignRequestCount);
      fetchCount('notyetapproved', user.username, setNotYetApprovedCount);
      fetchCount('done', user.username, setDoneCount);
      fetchCount('needtoapprove', user.username, setNeedToApproveCount);
      fetchCount('todo', user.username, setTodoCount);

      intervals = [
        setInterval(() => fetchCount('outgoing', user.username, setOutgoingCount), 30000),
        setInterval(() => fetchCount('assignrequest', user.username, setAssignRequestCount), 30000),
        setInterval(() => fetchCount('notyetapproved', user.username, setNotYetApprovedCount), 30000),
        setInterval(() => fetchCount('done', user.username, setDoneCount), 30000),
        setInterval(() => fetchCount('needtoapprove', user.username, setNeedToApproveCount), 30000),
        setInterval(() => fetchCount('todo', user.username, setTodoCount), 30000),
      ];
    }

    return () => intervals.forEach(clearInterval);
  }, [user?.username]);

  const fetchAttachments = async (requestId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/attachments/${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => ({
          ...prev,
          [requestId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const toggleExpand = async (requestId) => {
    if (expandedRequest !== requestId) {
      await fetchAttachments(requestId);
    }
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  const getTitle = () => {
    switch (type) {
      case 'outgoing': return 'Outgoing Requests';
      case 'assignrequest': return 'Assign Requests';
      case 'notyetapproved': return 'Not Yet Approved Requests';
      case 'needtoapprove': return 'Need to Approve Requests';
      case 'TodoRequest': return 'To Do Requests';
      case 'done': return 'Done Requests';
      default: return 'Requests';
    }
  };

  const fetchCount = async (type, userId, setter) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/requests/count/${type}/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setter(data.count);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} request count:`, error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setModalAvailableUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const openUserPicker = async (requestId, role) => {
    setShowUserPicker({ open: true, requestId, role });
    setModalSelectedUsers([]);
    setOriginalSelectedUsers([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${requestId}/approveduser`);
     // console.log(response)
      if(response.ok){
        const existingApproved = await response.json();
        console.log(existingApproved)
        setModalSelectedUsers(existingApproved);
        setOriginalSelectedUsers(existingApproved);
      } else {  
        console.error('Failed to fetch existing approved users');
        setModalSelectedUsers([]);
        setOriginalSelectedUsers([]);
      }
    } catch (error) {
      console.error('Error fetching existing approved users:', error);
      setModalSelectedUsers([]);
      setOriginalSelectedUsers([]);
    }

    fetchAllUsers();
  };

  const handleModalDragStart = (user) => {
    setDraggedUser(user);
  };

  const handleSelectedUserDragStart = (e, user) => {
    e.stopPropagation();
    setDraggedSelectedUser(user);
  };

  const handleModalDrop = (e) => {
    e.preventDefault();
    if (draggedUser) {
      const isAlreadySelected = modalSelectedUsers.some(u => u.USERNAME === draggedUser.USERNAME);
      if (!isAlreadySelected) {
        setModalSelectedUsers(prev => [draggedUser, ...prev]);
      }
      setDraggedUser(null);
    }
  };

  const handleSelectedUserDrop = (e, targetUser) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSelectedUser || draggedSelectedUser.USERNAME === targetUser.USERNAME) {
      setDraggedSelectedUser(null);
      return;
    }

    const draggedIndex = modalSelectedUsers.findIndex(u => u.USERNAME === draggedSelectedUser.USERNAME);
    const targetIndex = modalSelectedUsers.findIndex(u => u.USERNAME === targetUser.USERNAME);

    if (targetIndex >= modalSelectedUsers.length - 2) {
      setDraggedSelectedUser(null);
      return;
    }

    const newSelectedUsers = [...modalSelectedUsers];
    const [removed] = newSelectedUsers.splice(draggedIndex, 1);
    newSelectedUsers.splice(targetIndex, 0, removed);

    setModalSelectedUsers(newSelectedUsers);
    setDraggedSelectedUser(null);
  };

  const handleModalRemoveUser = (userId) => {
    if (!originalSelectedUsers.some(u => u.USERNAME === userId)) {
      setModalSelectedUsers(prev => prev.filter(u => u.USERNAME !== userId));
    }
  };

  const handleConfirmAddUsers = async () => {
    if (!showUserPicker.requestId || !showUserPicker.role || modalSelectedUsers.length === 0) {
      window.alert("Please select at least one user.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create arrays of usernames for both original and new order
      const originalOrder = originalSelectedUsers.map(u => u.USERNAME);
      const newOrder = modalSelectedUsers.map(u => u.USERNAME);

      // Send both orders to the backend
      await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${showUserPicker.requestId}/updateUsersRole`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: showUserPicker.role,
          userIds: newOrder,
          originalOrder: originalOrder // Add the original order
        }),
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${type}/${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
      setShowUserPicker({ open: false, requestId: null, role: null });
      setModalAvailableUsers([]);
      setModalSelectedUsers([]);
      setOriginalSelectedUsers([]);
      setModalSearchTerm('');
      setDraggedUser(null);
      setDraggedSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user(s):', error);
      setError(`Failed to update user(s) for role ${showUserPicker.role}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.username }) 
      });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${type}/${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      setError('Failed to approve request.');
    }
  };

  const handleAssignPIC = async (requestId, userId) => {
    try {
      console.log(userId)
      await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${requestId}/assignpic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId,creator : user.username }),
      });
      setPicDropdown({ open: false, requestId: null });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${type}/${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      setError('Failed to assign PIC.');
    }
  };

  const openTimelineModal = async (requestId) => {
    setTimelineModal({ open: true, requestId });
    setTimelineDate('');
    setTimelineRemarks('');
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineActionType('');

    try {
      // Check if request has a close request action
      if (type === 'outgoing') {
        const closeCheckResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${requestId}/hasCloseRequest`);
        if (closeCheckResponse.ok) {
          const { hasCloseRequest: hasClose } = await closeCheckResponse.json();
          setHasCloseRequest(prev => ({ ...prev, [requestId]: hasClose }));
        }
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/timeline/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        setTimelineHistory(data.sort((a, b) => b.TimelineId - a.TimelineId));
      } else {
        setTimelineHistory([]);
        setTimelineError('Failed to load timeline history.');
      }
    } catch {
      setTimelineHistory([]);
      setTimelineError('Failed to load timeline history.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleAddTimeline = async () => {
    if (!timelineDate || !timelineRemarks || !timelineActionType) return;
    setTimelineLoading(true);
    setTimelineError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/timeline/${timelineModal.requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeDate: timelineDate,
          remarks: timelineRemarks,
          actionType: timelineActionType,
          userId: user.username
        })
      });
      if (res.ok) {
        openTimelineModal(timelineModal.requestId);
        setTimelineRemarks('');
        setTimelineDate('');
        setTimelineActionType('');
      } else {
        setTimelineError('Failed to add timeline entry.');
      }
    } catch {
      setTimelineError('Failed to add timeline entry.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!searchField || !searchValue && searchField !== 'CreatedDate') return true;
    if (searchField === 'RequestId') {
      return request.RequestId?.toString().includes(searchValue);
    }
    if (searchField === 'Requester') {
      return request.requesterName?.toLowerCase().includes(searchValue.toLowerCase());
    }
    if (searchField === 'Title') {
      return request.Title?.toLowerCase().includes(searchValue.toLowerCase());
    }
   
    if (searchField === 'Status') {
      return request.Status?.toLowerCase().includes(searchValue.toLowerCase());
    }
    if (searchField === 'CreatedDate') {
      const created = new Date(request.CreatedAt);
      const from = searchDateFrom ? new Date(searchDateFrom) : null;
      const to = searchDateTo ? new Date(searchDateTo) : null;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchField, searchValue, searchDateFrom, searchDateTo, requests]);

  const filteredModalAvailableUsers = modalAvailableUsers.filter(u =>
    u.USERNAME.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const handleAddAttachment = async (e, requestId) => {
    console.log("tes")
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed!');
      return;
    }
    const formData = new FormData();
    formData.append('attachment', file);
    formData.append('userId', user.username);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/${requestId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Upload failed: ' + (err.error || res.statusText));
        return;
      }
      alert('Attachment uploaded!');
      fetchAttachments(requestId);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading requests...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="outgoing-requests">
      <h2>{getTitle()}</h2>
      <div className="requests-search-bar" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label className="requests-search-label">Search By:</label>
        <select
          value={searchField}
          onChange={e => {
            setSearchField(e.target.value);
            setSearchValue('');
            setSearchDateFrom('');
            setSearchDateTo('');
          }}
          style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #90caf9', color: '#1a237e', background: '#fff', marginRight: 8 }}
        >
          <option value="">-- Select --</option>
          <option value="RequestId">RequestId</option>
          <option value="Requester">Requester</option>
          <option value="Title">Title</option>
          <option value="Status">Status</option>
          <option value="CreatedDate">Created Date</option>
        </select>
        {searchField && searchField !== 'CreatedDate' && (
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder={`Search ${searchField}`}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #90caf9', color: '#1a237e', background: '#fff', minWidth: 180 }}
          />
        )}
        {searchField === 'CreatedDate' && (
          <>
            <label
              style={{
                marginLeft: 8,
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#1976d2',
                letterSpacing: '0.5px'
              }}
            >
              From:
            </label>
            <input
              type="date"
              value={searchDateFrom}
              onChange={e => setSearchDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #90caf9', color: '#1a237e', background: '#fff' }}
            />
            <label
              style={{
                marginLeft: 8,
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#1976d2',
                letterSpacing: '0.5px'
              }}
            >
              To:
            </label>
            <label style={{ marginLeft: 8 }}>To:</label>
            <input
              type="date"
              value={searchDateTo}
              onChange={e => setSearchDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #90caf9', color: '#1a237e', background: '#fff' }}
            />
          </>
        )}
      </div>
      {requests.length === 0 ? (
        <p className="no-requests">No {getTitle().toLowerCase()} found.</p>
      ) : (
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>RequestNo</th>
                <th>Requester</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Action</th>
                {(type === 'outgoing' || type === 'todo' || type === 'done' || type === 'assignrequest' || type === 'all' || type === 'closed') && <th>Timeline</th>}
                {type === 'needtoapprove' && <th></th>}
                {type === 'assignrequest' && <th>PIC</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map(request => (
                <React.Fragment key={request.RequestId}>
                  <tr className="request-row" onClick={() => toggleExpand(request.RequestId)}>
                    <td>{request.RequestNo  }</td>
                    <td>{request.requesterName}</td>
                    <td>{request.Title}</td>
                    <td>
                      <span className={`status ${request.Status.toLowerCase()}`}>
                        {request.Status}
                      </span>
                    </td>
                    <td>{request.CreatedAt
                  ? new Date(request.CreatedAt).toISOString().slice(0, 10).replace('T', ' ')
                  : 'N/A'}</td>
     
                    <td>
                      <button className="view-details-btn">
                        {expandedRequest === request.RequestId ? 'Hide Details' : 'View Details'}
                      </button>
                      {type === 'needtoapprove' && (
                        <button
                          className="approve-btn"
                          style={{ marginLeft: 8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request.RequestId);
                          }}
                        >
                          Approved
                        </button>
                      )}
                    </td>
                    {(type === 'outgoing' || type === 'todo' || type === 'done' || type === 'assignrequest' || type === 'all' || type === 'closed') && (
                      <td>
                        <button
                          className="view-details-btn"
                          style={{ marginLeft: 8 }}
                          onClick={e => {
                            e.stopPropagation();
                            openTimelineModal(request.RequestId);
                          }}
                        >
                          Timeline
                        </button>
                      </td>
                    )}
                    {type === 'assignrequest' && (
                      <td>
                        <button
                          className="pic-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (picDropdown.open === request.RequestId) {
                              setPicDropdown({ open: false, requestId: null });
                            } else {
                              setPicDropdown({ open: request.RequestId, requestId: request.RequestId });
                              setPicSearchTerm('');
                              fetchAllUsers();
                            }
                          }}
                        >
                          Set PIC
                        </button>
                        {picDropdown.open === request.RequestId && (
                          <div className="pic-dropdown">
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={picSearchTerm}
                              onChange={e => setPicSearchTerm(e.target.value)}
                              style={{ marginBottom: "10px", width: "100%" }}
                            />
                            <div className="scrollable-users-list">
                              {(modalAvailableUsers || []).filter(u =>
                                u.USERNAME.toLowerCase().includes(picSearchTerm.toLowerCase())
                              ).map(u => (
                                <div
                                  key={u.USERNAME}
                                  className="user-item"
                                  onClick={() => handleAssignPIC(request.RequestId, u.USERNAME)}
                                >
                                  {u.USERNAME}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                  {expandedRequest === request.RequestId && (
                    <tr className="details-row">
                      <td colSpan="100">
                        <div className="request-details">
                          <div className="details-main">
                            <div className="detail-section">
                              <h4>Purpose</h4>
                              <p>{request.Purpose}</p>
                            </div>
                            <div className="detail-section">
                              <h4>Expected Benefits</h4>
                              <p>{request.ExpectedBenefits}</p>
                            </div>
                            <div className="detail-section approved-by">
                              <h4>
                                CC
                                {type !== 'done' && !request.PICName && (
                                  <button
                                    className="mini-add-btn"
                                    title="Add CC"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUserPicker(request.RequestId, 'CC');
                                    }}
                                    style={{ marginLeft: 6, fontSize: '1em', padding: '0 6px', cursor: 'pointer' }}
                                  >+</button>
                                )}
                              </h4>
                              <p>{request.approvedByNames || 'None'}</p>
                            </div>
                            
                            <div className="detail-section pic-section">
                              <h4>PIC</h4>
                              <p>{request.PICName || 'None'}</p>
                            </div>
                          </div>
                          <div className="attachments-section">
                            <h4>Attachments</h4>
                            {(type === 'outgoing' || type === 'notyetapproved') && (
                              <div style={{ marginBottom: 12, textAlign: 'left' }}>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  style={{ display: 'none' }}
                                  id={`add-attachment-input-${request.RequestId}`}
                                  onChange={e => handleAddAttachment(e, request.RequestId)}
                                  onClick={(event)=> { event.target.value = null }}
                                />
                                <label
                                  htmlFor={`add-attachment-input-${request.RequestId}`}
                                  className="view-details-btn"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: 180,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title="Add PDF Attachment"
                                >
                                  Add Attachment
                                </label>
                              </div>
                            )}
                            {attachments[request.RequestId]?.length > 0 ? (
                              <div className="attachments-list">
                                {attachments[request.RequestId].map((file, index) => {
                                  return (
                                    <div key={file.DocumentId || index} className="attachment-item">
                                      <PDFViewer
                                        documentId={file.DocumentId}
                                        filePath={file.FilePath}
                                        userId={user.username}
                                        requestId={request.RequestId}
                                        type={type}
                                        requestNo={request.RequestNo}
                                      />
                                      <span className="upload-info">
                                        Uploaded by {file.UploadedByName || file.UploadedBy} on {file.UploadedAt ? new Date(file.UploadedAt).toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p>No attachments</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 8 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #90caf9', background: currentPage === 1 ? '#e3f2fd' : '#2196F3', color: currentPage === 1 ? '#aaa' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <span style={{ fontWeight: 500, color: '#1976d2' }}>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #90caf9', background: currentPage === totalPages ? '#e3f2fd' : '#2196F3', color: currentPage === totalPages ? '#aaa' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {showUserPicker.open && (
        <div className="user-picker-modal">
          <div className="user-picker-content">
            <h3>Select Users to Add as CC</h3>

            <div
              className="drag-drop-user-picker"
              style={{ display: 'flex', gap: '20px' }}
            >
                <div className="available-users-list">
                    <h4>Available Users</h4>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={modalSearchTerm}
                        onChange={e => setModalSearchTerm(e.target.value)}
                        style={{ marginBottom: "10px", width: "100%" }}
                    />
                    <div className="users-container" style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                        {filteredModalAvailableUsers.map(user => (
                            <div
                                key={user.USERNAME}
                                className="user-item"
                                draggable
                                onDragStart={() => handleModalDragStart(user)}
                            >
                                {user.USERNAME}
                            </div>
                        ))}
                    </div>
                </div>

                <div
                  className="selected-users-drop-area"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleModalDrop}
                  style={{ minHeight: 100, border: '2px dashed #ccc', borderRadius: 8, padding: 12, flex: 1 }}
                >
                  <h4>Selected Users</h4>
                  <div
                    className="selected-users-container"
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                    onDragOver={e => e.preventDefault()}
                  >
                    {modalSelectedUsers.map((user, index) => (
                      <div
                        key={user.USERNAME}
                        className="selected-user-item"
                        style={{
                          background: '#e3f2fd',
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #bbdefb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'grab',
                          opacity: draggedSelectedUser?.USERNAME === user.USERNAME ? 0.5 : 1,
                        }}
                        draggable={index < modalSelectedUsers.length - 2}
                        onDragStart={(e) => handleSelectedUserDragStart(e, user)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleSelectedUserDrop(e, user)}
                      >
                        {user.USERNAME}
                        {!originalSelectedUsers.some(u => u.USERNAME === user.USERNAME) && (
                          <button
                              type="button"
                              className="remove-user"
                              onClick={(e) => { e.stopPropagation(); handleModalRemoveUser(user.USERNAME); }}
                              style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', padding: 0, fontSize: '0.9em' }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {modalSelectedUsers.length === 0 && (
                        <p style={{ color: '#888', fontSize: '0.9em' }}>Drag users here</p>
                    )}
                  </div>
                </div>
            </div>

            <div className="user-picker-actions" style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={handleConfirmAddUsers} disabled={modalSelectedUsers.length === 0 || loading}>
                Confirm Add ({modalSelectedUsers.length})
              </button>
              <button onClick={() => {
                setShowUserPicker({ open: false, requestId: null, role: null });
                setModalAvailableUsers([]);
                setModalSelectedUsers([]);
                setOriginalSelectedUsers([]);
                setModalSearchTerm('');
                setDraggedUser(null);
                setDraggedSelectedUser(null);
              }} style={{ marginLeft: 12 }}>
                Cancel
              </button>
            </div>

          </div>
          <div className="user-picker-modal-backdrop" onClick={() => {
             setShowUserPicker({ open: false, requestId: null, role: null });
             setModalAvailableUsers([]);
             setModalSelectedUsers([]);
             setOriginalSelectedUsers([]);
             setModalSearchTerm('');
             setDraggedUser(null);
             setDraggedSelectedUser(null);
          }} />
        </div>
      )}
      {timelineModal.open && (
        <div className="timeline-modal">
          <div className="timeline-modal-content">
            <h3>Request Timeline</h3>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label>
                Action Type:{' '}
                <select
                  value={timelineActionType}
                  onChange={e => setTimelineActionType(e.target.value)}
                  style={{ width: 180, marginRight: 8, padding: '6px 10px', borderRadius: 4, border: '1px solid #90caf9', color: '#1a237e', background: '#fff' }}
                  disabled={type === 'done'}
                >
                  <option value="">Select Action</option>
                  <option value="Target Selesai">Target Selesai</option>
                  <option value="Perpanjangan TS">Perpanjangan TS</option>
                  <option value="Tanggal Selesai Dikerjakan">Tanggal Selesai Dikerjakan</option>
                  <option value="Target Pengecekan">Target Pengecekan</option>
                  <option value="Perpanjangan Tgl Pengecekan">Perpanjangan Tgl Pengecekan</option>
                  {type === 'outgoing' && !hasCloseRequest[timelineModal.requestId] && (
                    <option value="Close Request">Close Request</option>
                  )}
                </select>
              </label>
              <div className="timeline-date-wrapper" style={{ display: 'inline-block', position: 'relative', marginRight: 8 }}>
                <label>Date:</label>
                <input
                  type="date"
                  value={timelineDate}
                  onChange={e => setTimelineDate(e.target.value)}
                  style={{ width: 160 }}
                  disabled={type === 'done'}
                />
                <span className="calendar-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" fill="#fff" stroke="#1976d2" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4" stroke="#1976d2" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="3" y="8" width="18" height="2" fill="#1976d2"/>
                    <rect x="7" y="12" width="2" height="2" rx="1" fill="#1976d2"/>
                    <rect x="11" y="12" width="2" height="2" rx="1" fill="#1976d2"/>
                    <rect x="15" y="12" width="2" height="2" rx="1" fill="#1976d2"/>
                  </svg>
                </span>
              </div>
              <label>
                Remarks:{' '}
                <input
                  type="text"
                  value={timelineRemarks}
                  onChange={e => setTimelineRemarks(e.target.value)}
                  style={{ width: 200, marginRight: 8 }}
                  disabled={type === 'done'}
                />
              </label>
              {type !== 'done' && (
                <button
                  onClick={handleAddTimeline}
                  disabled={!timelineDate || !timelineRemarks || !timelineActionType || timelineLoading}
                >
                  Add
                </button>
              )}
            </div>
            {timelineError && <div className="error">{timelineError}</div>}
             <div
              className="timeline-history"
              style={{
                maxHeight: 250,
                overflowY: 'auto',
                border: '1.5px solid #90caf9',
                padding: 10,
                background: '#e3f2fd',
                borderRadius: 6,
                marginTop: 10,
              }}
            >
              {timelineLoading ? (
                <div style={{ padding: 8 }}>Loading...</div>
              ) : timelineHistory.length === 0 ? (
                <div style={{ padding: 8 }}>No timeline history.</div>
              ) : (
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.97em' }}>
                  <thead>
                    <tr style={{ background: '#bbdefb', color: '#1a237e' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>#</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>Action Type</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>Date</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>Remarks</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>By</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #90caf9' }}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineHistory.map((item, idx) => (
                      <tr key={item.TimelineId} style={{ background: idx % 2 === 0 ? '#fff' : '#f1f8ff' }}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd', textAlign: 'center' }}>{item.TimelineId}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd' }}>{item.ActionType}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd' }}>{item.TimeDate ? new Date(item.TimeDate).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd' }}>{item.Remarks}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd' }}>{item.UserName || item.ActionBy}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #e3f2fd', fontSize: '0.92em', color: '#888' }}>
                        {item.CreatedAt
                      ? new Date(item.CreatedAt).toISOString().slice(0, 19).replace('T', ' ')
                      : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button
              style={{ marginTop: 16 }}
              onClick={() => setTimelineModal({ open: false, requestId: null })}
            >
              Close
            </button>
          </div>
          <div className="timeline-modal-backdrop" onClick={() => setTimelineModal({ open: false, requestId: null })}></div>
        </div>
      )}
    </div>
  );
};

export default Requests;
