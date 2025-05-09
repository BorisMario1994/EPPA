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
  'knownby'
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

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`http://192.168.100.236:5000/api/notifications/${user.id}`);
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
        const response = await fetch(
          `http://192.168.100.236:5000/api/requests/count/${type}/${user.id}`
        );
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

    if (user?.id) {
      requestTypes.forEach(type => {
        fetchCount(type);
        const intervalId = setInterval(() => fetchCount(type), 10000);
        intervals.push(intervalId);
      });
    }

    return () => intervals.forEach(clearInterval);
  }, [user?.id]);

  // Fetch notifications (list, not just count)
  useEffect(() => {
    let intervalId;
    fetchNotifications();
    if (user?.id) {
      intervalId = setInterval(fetchNotifications, 10000); // 30 seconds
    }
    return () => clearInterval(intervalId);
  }, [user?.id]);

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
      await fetch(`http://192.168.100.236:5000/api/notification/read/${notifId}`, {
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

  const renderContent = () => {
    switch (activeSection) {
      case 'create':
        return <CreateRequestForm user={user} />;
      case 'outgoing':
        return <Requests user={user} type="outgoing" />;
      case 'notyetapproved':
        return <Requests user={user} type="notyetapproved" />;
      case 'assignrequest':
        return <Requests user={user} type="assignrequest" />;
      case 'knownby':
        return <Requests user={user} type="knownby" />;
      case 'todo':
        return <Requests user={user} type="todo" />;
      case 'done':
        return <Requests user={user} type="done" />;
      case 'needtoapprove':
        return <Requests user={user} type="needtoapprove" />;
      default:
        return <div className="content-section">Select a section</div>;
    }
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
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <h3>{user?.fullName || 'User'}</h3>
              <p className="username">@{user.fullName || 'username'}</p>
              <p className="email">{user.email || 'user@example.com'}</p>
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
              Outgoing Requests ({requestCounts.outgoing})
            </button>
            <button 
              className={`nav-item ${activeSection === 'AssignRequest' ? 'active' : ''}`}
              onClick={() => setActiveSection('assignrequest')}
            >
              Assign Requests ({requestCounts.assignrequest})
            </button>
            <button 
              className={`nav-item ${activeSection === 'knownby' ? 'active' : ''}`}
              onClick={() => setActiveSection('knownby')}
            >
              Known By Requests ({requestCounts.knownby})
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