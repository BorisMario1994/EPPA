import React, { useState, useEffect, useRef } from 'react';
import './CreateRequestForm.css';

const CreateRequestForm = ({ user }) => {
 console.log(user);  
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    expectedBenefits: '',
    receiverId: '',
    approvedBy: [],
    knownBy: [],
    attachments: []
  });

  const [users, setUsers] = useState([]);
  const [draggedUser, setDraggedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileError, setFileError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://192.168.52.27:5000/api/users');
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

    // Check if "Approved By" is empty
    if (formData.approvedBy.length === 0) {
      window.alert('Please assign at least one user to "Approved By".');
      return;
    }

    try {
      // Check for duplicates
      const allUserIds = [
        formData.receiverId,
        ...formData.approvedBy.map(u => u.USERNAME),
        ...formData.knownBy.map(u => u.USERNAME)
      ];
      
      const uniqueUserIds = new Set(allUserIds);
      if (uniqueUserIds.size !== allUserIds.length) {
        window.alert('Error: A user cannot be in multiple roles (Receiver, Approved By, or Known By)');
        return;
      }

      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('purpose', formData.purpose);
      formDataToSend.append('expectedBenefits', formData.expectedBenefits);
      formDataToSend.append('requesterId', user.username);
      formDataToSend.append('receiverId', formData.receiverId);
      
      // Add arrays
      formData.approvedBy.forEach(user => {
          formDataToSend.append('approvedBy[]', user.USERNAME);
      });
      
      formData.knownBy.forEach(user => {
          formDataToSend.append('knownBy[]', user.USERNAME);
      });

      // Add attachments
      console.log('Attachments before sending:', formData.attachments); // Debug log
      formData.attachments.forEach((file, index) => {
          console.log(`Appending file ${index}:`, file); // Debug log
          formDataToSend.append('attachments', file);
      });

      // Log the entire FormData
      for (let pair of formDataToSend.entries()) {
          console.log(pair[0], pair[1]);
      }

      const response = await fetch('http://192.168.52.27:5000/api/requests', {
          method: 'POST',
          body: formDataToSend
      });

      if (response.ok) {
          window.alert('Request added successfully!');
          setFormData({
              title: '',
              purpose: '',
              expectedBenefits: '',
              receiverId: '',
              approvedBy: [],
              knownBy: [],
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
    
    if (name === 'receiverId') {
      const selectedUserId = parseInt(value);
      // Check if selected user is already in approvedBy or knownBy
      const isApprovedBy = formData.approvedBy.some(u => u.USERNAME === selectedUserId);
      const isKnownBy = formData.knownBy.some(u => u.USERNAME === selectedUserId);
      
      if (isApprovedBy || isKnownBy) {
        window.alert('This user is already assigned to another role');
        return;
      }
    }
    
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
    const isReceiver = parseInt(formData.receiverId) === draggedUser.USERNAME;
    const isApprovedBy = formData.approvedBy.some(u => u.USERNAME === draggedUser.USERNAME);
    const isKnownBy = formData.knownBy.some(u => u.USERNAME === draggedUser.USERNAME);

    if (isReceiver || isApprovedBy || isKnownBy) {
      window.alert('This user is already assigned to another role');
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
          <label htmlFor="receiverId">Receiver</label>
          <select
            id="receiverId"
            name="receiverId"
            value={formData.receiverId}
            onChange={handleChange}
            required
          >
            <option value="">Select a receiver</option>
            {users.map(u => (
              <option key={u.USERNAME} value={u.USERNAME}>
                {u.USERNAME} 
              </option>
            ))}
          </select>
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
              accept=".pdf"
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
                  onDragStart={() => handleDragStart(u)}
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
              onDrop={(e) => handleDrop(e, 'approvedBy')}
            >
              <h3>Approved By</h3>
              <div className="selected-users">
                {formData.approvedBy.map(u => (
                  <div key={u.USERNAME} className="selected-user">
                    {u.USERNAME} 
                    <button
                      type="button"
                      onClick={() => removeUser(u.USERNAME, 'approvedBy')}
                      className="remove-user"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="approval-box"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'knownBy')}
            >
              <h3>Known By</h3>
              <div className="selected-users">
                {formData.knownBy.map(u => (
                    <div key={u.USERNAME} className="selected-user">
                    {u.USERNAME} 
                    <button
                      type="button"
                      onClick={() => removeUser(u.USERNAME, 'knownBy')}
                      className="remove-user"
                    >
                      ×
                    </button>
                  </div>
                ))}
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