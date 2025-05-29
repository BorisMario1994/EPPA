import React, { useState, useEffect, useRef } from 'react';
import './CreateRequestForm.css';

const CreateRequestForm = ({ user }) => {
 //console.log(user);  
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    expectedBenefits: '',
    cc: [],
    attachments: []
  });

  const [users, setUsers] = useState([]);
  const [draggedUser, setDraggedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileError, setFileError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedCCIndex, setDraggedCCIndex] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`);
        if (response.ok) {
          const data = await response.json();
          const filteredUsers = data.filter(u => u.USERNAME !== user.username);
          setUsers(filteredUsers);  

        } else {
          throw new Error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user.username]);

  const filteredUsers = users.filter(u =>
    u.USERNAME.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFileError('');

    // Validate file types
    const invalidFiles = files.filter(file => {
        return file.type !== 'application/pdf';
    });

    if (invalidFiles.length > 0) {
        setFileError('Only PDF files are allowed');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
    }

    // Add files to formData
    setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if "CC" is empty
    if (formData.cc.length === 0) {
      window.alert('Please assign at least one user to "CC".');
      return;
    }

    try {
      // Prepare the CC list to send (dynamic users + fixed users)
      const ccToSend = [
        ...formData.cc.map(u => u.USERNAME),
        'MITC-01',
        'MGMG-01'
      ];
      
      // Check for duplicates
      const uniqueUserIds = new Set(ccToSend);
      if (uniqueUserIds.size !== ccToSend.length) {
        window.alert('Error: A user cannot be in multiple roles (CC)');
        return;
      }

      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('purpose', formData.purpose);
      formDataToSend.append('expectedBenefits', formData.expectedBenefits);
      formDataToSend.append('requesterId', user.username);
      
      // Add arrays
      ccToSend.forEach(userId => {
        formDataToSend.append('cc[]', userId);
      });

      // Add attachments
      console.log('Attachments before sending:', formData.attachments); // Debug log
      formData.attachments.forEach((file, index) => {
          //console.log(`Appending file ${index}:`, file); // Debug log
          formDataToSend.append('attachments', file);
      });

      // Log the entire FormData
      for (let pair of formDataToSend.entries()) {
          console.log(pair[0], pair[1]);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/requests`, {
          method: 'POST',
          body: formDataToSend
      });

      if (response.ok) {
          window.alert('Request added successfully!');
          setFormData({
              title: '',
              purpose: '',
              expectedBenefits: '',
              cc: [],
              attachments: []
          });
      } else {
          const errorData = await response.json();
          window.alert(errorData.error || 'Failed to create request. Please try again.');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      window.alert('Failed to create request. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDragStart = (user) => {
    setDraggedUser(user);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetBox) => {
    e.preventDefault();
    if (!draggedUser) return;

    // Check if user is already in any role
    const isCC = formData.cc.some(u => u.USERNAME === draggedUser.USERNAME);

    if (isCC) {
      window.alert('This user is already assigned');
      return;
    }

    const isUserInBox = formData[targetBox].some(u => u.USERNAME === draggedUser.USERNAME);
    if (!isUserInBox) {
      setFormData(prev => ({
        ...prev,
        [targetBox]: [...prev[targetBox], draggedUser]
      }));
    }
  };

  const removeUser = (userId, targetBox) => {
    // Prevent removal of default users
    if (['MITC-01', 'MGMG-01'].includes(userId)) return;
    setFormData(prev => ({
      ...prev,
      [targetBox]: prev[targetBox].filter(u => u.USERNAME !== userId)
    }));
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="create-request-form">
      <h2>Create New Request</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter request title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="purpose">Purpose</label>
          <textarea
            id="purpose"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            required
            placeholder="Describe the purpose of this request"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="expectedBenefits">Expected Benefits</label>
          <textarea
            id="expectedBenefits"
            name="expectedBenefits"
            value={formData.expectedBenefits}
            onChange={handleChange}
            required
            placeholder="Describe the expected benefits"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="attachments">Attachments (PDF only)</label>
          <div className="file-upload-container">
            <input
              type="file"
              id="attachments"
              name="attachments"
              onChange={handleFileChange}
              multiple
              accept="application/pdf"
              className="file-input"
              ref={fileInputRef}
            />
            <label htmlFor="attachments" className="file-label">
              Choose Files
            </label>
          </div>
          {fileError && <div className="file-error">{fileError}</div>}
          <div className="attachments-list">
            {formData.attachments.map((file, index) => (
              <div key={index} className="attachment-item">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="remove-attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="drag-drop-section">
          <div className="users-list">
            <h3>Available Users</h3>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ marginBottom: "10px", width: "100%" }}
            />
            <div className="users-container">
              {filteredUsers.map(u => (
                <div
                  key={u.USERNAME}
                  className="user-item"
                  draggable
                  onDragStart={() => {
                    handleDragStart(u);
                    setDragSource('available');
                  }}
                >
                  {u.USERNAME}
                </div>
              ))}
            </div>
          </div>

          <div className="approval-boxes">
            <div
              className="approval-box"
              onDragOver={handleDragOver}
              onDrop={e => {
                e.preventDefault();
                if (dragSource === 'available' && draggedUser) {
                  // Add user to CC if not already present and not a default
                  const isCC = formData.cc.some(u => u.USERNAME === draggedUser.USERNAME);
                  if (!isCC && !['MITC-01', 'MGMG-01'].includes(draggedUser.USERNAME)) {
                    setFormData(prev => ({
                      ...prev,
                      cc: [draggedUser, ...prev.cc]
                    }));
                  }
                  setDraggedUser(null);
                  setDragSource(null);
                } else if (dragSource === 'cc') {
                  // If dropped outside any specific user, move to top
                  if (draggedCCIndex !== null) {
                    const newCC = [...formData.cc];
                    const [moved] = newCC.splice(draggedCCIndex, 1);
                    newCC.unshift(moved);
                    setFormData(prev => ({
                      ...prev,
                      cc: newCC
                    }));
                    setDraggedCCIndex(null);
                    setDragSource(null);
                  }
                }
              }}
            >
              <h3>CC</h3>
              <div className="selected-users">
                {/* Render dynamic users */}
                {formData.cc.map((u, idx) => (
                  <div
                    key={u.USERNAME}
                    className="selected-user"
                    draggable
                    onDragStart={() => {
                      setDraggedCCIndex(idx);
                      setDragSource('cc');
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      if (dragSource === 'cc') {
                        if (draggedCCIndex === null || draggedCCIndex === idx) return;
                        const newCC = [...formData.cc];
                        const [moved] = newCC.splice(draggedCCIndex, 1);
                        newCC.splice(idx, 0, moved);
                        setFormData(prev => ({
                          ...prev,
                          cc: newCC
                        }));
                        setDraggedCCIndex(null);
                        setDragSource(null);
                      }
                    }}
                  >
                    {u.USERNAME} 
                    <button
                      type="button"
                      onClick={() => removeUser(u.USERNAME, 'cc')}
                      className="remove-user"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* Always show MITC-01 and MGMG-01 at the bottom */}
                <div className="selected-user default-cc" key="MITC-01">
                  MITC-01
              </div>
                <div className="selected-user default-cc" key="MGMG-01">
                  MGMG-01
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Create Request
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequestForm; 