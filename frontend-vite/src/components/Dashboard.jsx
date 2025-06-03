import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import CreateRequestForm from './CreateRequestForm';
import Requests from './Requests';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';

const requestTypes = [
  'outgoing',
  'assignrequest',
  'notyetapproved',
  'done',
  'needtoapprove',
  'todo',
];

const Dashboard = ({ user, onLogout }) => {
  //console.log('User in Dashboard:', user);

  const [activeSection, setActiveSection] = useState('create');
  const [requestCounts, setRequestCounts] = useState(
    requestTypes.reduce((acc, type) => ({ ...acc, [type]: 0 }), {})
  );
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationBoxOpen, setNotificationBoxOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    expectedBenefits: '',
    cc: [
      { USERNAME: 'MITC-01' },
      { USERNAME: 'MGMG-01' }
    ],
    attachments: []
  });

  const [inferiors, setInferiors] = useState([]);
  const [showInferiors, setShowInferiors] = useState(false);
  const [inferiorsLoading, setInferiorsLoading] = useState(false);

  const [originalUser, setOriginalUser] = useState(user);
  const [activeUser, setActiveUser] = useState(user);
  const [isSwitched, setIsSwitched] = useState(false);

  const fetchNotifications = async () => {
    if (!activeUser?.username) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${activeUser.username}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
        setNotificationCount(data.length || 0);
      } else {
        setNotifications([]);
        setNotificationCount(0);
      }
    } catch (err) {
      setNotifications([]);
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    let intervals = [];

    const fetchCount = async (type) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests/count/${type}/${activeUser.username}`);
        if (response.ok) {
          const data = await response.json();
          setRequestCounts(prev => ({
            ...prev,
            [type]: data.count
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch ${type} request count:`, error);
      }
    };

    if (activeUser?.username) {
      requestTypes.forEach(type => {
        fetchCount(type);
        const intervalId = setInterval(() => fetchCount(type), 10000);
        intervals.push(intervalId);
      });
    }

    return () => intervals.forEach(clearInterval);
  }, [activeUser?.username]);

  // Fetch notifications (list, not just count)
  useEffect(() => {
    let intervalId;
    fetchNotifications();
    if (activeUser?.username) {
      intervalId = setInterval(fetchNotifications, 10000); // 30 seconds
    }
    return () => clearInterval(intervalId);
  }, [activeUser?.username]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationBoxOpen(false);
      }
    }
    if (notificationBoxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationBoxOpen]);

  // Mark notification as read
  const handleMarkAsRead = async (notifId) => {
    try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/notification/read/${notifId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      await fetchNotifications();
    } catch (err) {
      // Optionally show error
    }
  };

  useEffect(() => {
    const fetchInferiors = async () => {
      if (!originalUser?.username) return;
      
      setInferiorsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/inferiors/${originalUser.username}`);
        if (response.ok) {
          const data = await response.json();
          setInferiors(data);
        }
      } catch (error) {
        console.error('Failed to fetch inferiors:', error);
      } finally {
        setInferiorsLoading(false);
      }
    };

    fetchInferiors();
  }, [originalUser?.username]);

  const renderContent = () => {
    switch (activeSection) {
      case 'create':
        return <CreateRequestForm user={activeUser} />;
      case 'outgoing':
        return <Requests user={activeUser} type="outgoing" />;
      case 'notyetapproved':
        return <Requests user={activeUser} type="notyetapproved" />;
      case 'assignrequest':
        return <Requests user={activeUser} type="assignrequest" />;
      case 'todo':
        return <Requests user={activeUser} type="todo" />;
      case 'done':
        return <Requests user={activeUser} type="done" />;
      case 'needtoapprove':
        return <Requests user={activeUser} type="needtoapprove" />;
      default:
        return <div className="content-section">Select a section</div>;
    }
  };

  const removeUser = (userId, targetBox) => {
    if (['MITC-01', 'MGMG-01'].includes(userId)) return;
    setFormData(prev => ({
      ...prev,
      [targetBox]: prev[targetBox].filter(u => u.USERNAME !== userId)
    }));
  };

  const switchUser = (newUser) => {
    console.log('newUser', newUser);
    if (newUser.USERNAME === originalUser.username) {
      // Switch back to original user

      setActiveUser(originalUser);
      setIsSwitched(false);
    } else {
      // Switch to inferior user
      setActiveUser({ username: newUser.USERNAME });
      setIsSwitched(true);
    }
    setShowInferiors(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>EPPA Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', display: 'inline-block' }} ref={notificationRef}>
              <button
                className="notification-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                  marginRight: '0.5rem'
                }}
                title="Notifications"
                onClick={() => setNotificationBoxOpen((open) => !open)}
              >
                <NotificationsIcon style={{ fontSize: 28, color: '#2196F3' }} />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#f44336',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: '0.75rem',
                    padding: '2px 6px',
                    fontWeight: 600,
                    transform: 'translate(50%,-50%)',
                    minWidth: 18,
                    textAlign: 'center'
                  }}
                >
                  {notificationCount}
                </span>
              </button>
              {notificationBoxOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div
                      key={notif.NotificationId ? `${notif.NotificationId}-${notif.NotifReceiver}` : idx}
                        className="notification-item"
                        onMouseDown={e => e.preventDefault()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <span style={{ flex: 1, marginRight: 12 }}>{notif.Remarks}</span>
                        <button
                          onClick={() => handleMarkAsRead(`${notif.NotificationId}-${notif.NotifReceiver}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b0b8c1',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: 0,
                            marginLeft: 8,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Mark as read"
                        >
                          <CloseIcon fontSize="small" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={onLogout} className="logout-button">Logout</button>
          </div>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="sidebar">
          <div className="user-profile">
            <div className="user-avatar">
              {activeUser?.username?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              
              <p className="username">@{activeUser.username || 'username'}</p>
              <div className="inferiors-dropdown">
                <button 
                  className="inferiors-toggle"
                  onClick={() => setShowInferiors(!showInferiors)}
                  style={{
                    background: 'none',
                    border: '1px solid #90caf9',
                    borderRadius: 4,
                    padding: '4px 8px',
                    color: '#1976d2',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {inferiorsLoading ? 'Loading...' : `Inferiors (${inferiors.length})`}
                  <span style={{ fontSize: '1.2em' }}>{showInferiors ? '▲' : '▼'}</span>
                </button>
                {showInferiors && (
                  <div 
                    className="inferiors-list"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      background: '#fff',
                      border: '1px solid #90caf9',
                      borderRadius: 4,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      minWidth: 200,
                      maxHeight: 300,
                      overflowY: 'auto'
                    }}
                  >
                    {inferiorsLoading ? (
                      <div style={{ padding: 8, textAlign: 'center' }}>Loading...</div>
                    ) : inferiors.length === 0 ? (
                      <div style={{ padding: 8, textAlign: 'center', color: '#666' }}>No inferiors found</div>
                    ) : (
                      <>
                        <div 
                          key={originalUser.username}
                          onClick={() => switchUser({ USERNAME: originalUser.username })}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #e3f2fd',
                            cursor: 'pointer',
                            background: activeUser.username === originalUser.username ? '#e3f2fd' : 'transparent',
                            fontWeight: activeUser.username === originalUser.username ? 'bold' : 'normal',
                            ':hover': {
                              background: '#e3f2fd'
                            }
                          }}
                        >
                          {originalUser.username} (You)
                        </div>
                        {inferiors.map(inferior => (
                          <div 
                            key={inferior.USERNAME}
                            onClick={() => switchUser(inferior)}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #e3f2fd',
                              cursor: 'pointer',
                              background: activeUser.username === inferior.USERNAME ? '#e3f2fd' : 'transparent',
                              fontWeight: activeUser.username === inferior.USERNAME ? 'bold' : 'normal',
                              ':hover': {
                                background: '#e3f2fd'
                              }
                            }}
                          >
                            {inferior.USERNAME}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeSection === 'create' ? 'active' : ''}`}
              onClick={() => setActiveSection('create')}
            >
              Create Requests
            </button>
            <button 
              className={`nav-item ${activeSection === 'notyetapproved' ? 'active' : ''}`}
              onClick={() => setActiveSection('notyetapproved')}
            >
              Not yet Approved Request ({requestCounts.notyetapproved})
            </button>
            <button 
              className={`nav-item ${activeSection === 'needtoapprove' ? 'active' : ''}`}
              onClick={() => setActiveSection('needtoapprove')}
            >
              Need to Approve Requests ({requestCounts.needtoapprove})
            </button>
            <button 
              className={`nav-item ${activeSection === 'outgoing' ? 'active' : ''}`}
              onClick={() => setActiveSection('outgoing')}
            >
              On Progress Requests ({requestCounts.outgoing})
            </button>
            <button 
              className={`nav-item ${activeSection === 'AssignRequest' ? 'active' : ''}`}
              onClick={() => setActiveSection('assignrequest')}
            >
              Assign Requests ({requestCounts.assignrequest})
            </button>
            <button 
              className={`nav-item ${activeSection === 'todo' ? 'active' : ''}`}
              onClick={() => setActiveSection('todo')}
            >
              To Do Requests ({requestCounts.todo})
            </button>
            <button 
              className={`nav-item ${activeSection === 'done' ? 'active' : ''}`}
              onClick={() => setActiveSection('done')}
            >
              Done Requests ({requestCounts.done})
            </button>
          </nav>
        </div>
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 