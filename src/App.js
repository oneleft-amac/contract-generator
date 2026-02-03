import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, FolderOpen, LogOut, AlertCircle, CheckCircle } from 'lucide-react';

const ContractGeneratorApp = () => {
  const [authState, setAuthState] = useState('idle');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState(null);
  const [contracts, setContracts] = useState([]);

  const initClient = useCallback(() => {
    if (!window.gapi) return;
    
    window.gapi.client.init({
      apiKey: process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY',
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID',
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    }).then(() => {
      const auth2 = window.gapi.auth2.getAuthInstance();
      auth2.isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(auth2.isSignedIn.get());
    }).catch(error => {
      console.error('Auth error:', error);
      showMessage(`Authentication error: ${error.error?.error || 'Unknown error'}`, 'error');
    });
  }, []);

  const initializeGoogleAPI = useCallback(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/client.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initClient();
    };
    document.head.appendChild(script);
  }, [initClient]);

useEffect(() => {
  initializeGoogleAPI();
}, []); // eslint-disable-next-line react-hooks/exhaustive-deps


  const updateSigninStatus = (isSignedIn) => {
    if (isSignedIn) {
      const auth2 = window.gapi.auth2.getAuthInstance();
      const profile = auth2.currentUser.get().getBasicProfile();
      const email = profile.getEmail();

      if (!email.endsWith('@oneleft.co')) {
        handleSignout();
        showMessage('Access denied: Only @oneleft.co email addresses are permitted.', 'error');
        return;
      }

      setUser({
        name: profile.getName(),
        email: email,
        image: profile.getImageUrl()
      });
      setAuthState('authenticated');
      loadContractsFromDrive();
    } else {
      setAuthState('idle');
      setUser(null);
    }
  };

  const handleSignin = () => {
    setAuthState('authenticating');
    const auth2 = window.gapi.auth2.getAuthInstance();
    auth2.signIn();
  };

  const handleSignout = () => {
    const auth2 = window.gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      setUser(null);
      setAuthState('idle');
      setCurrentView('dashboard');
    });
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadContractsFromDrive = async () => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: "name contains 'Generated Contracts' and mimeType='application/vnd.google-apps.folder'",
        spaces: 'drive',
        pageSize: 1,
        fields: 'files(id, name)'
      });

      if (response.result.files && response.result.files.length > 0) {
        const folderId = response.result.files[0].id;
        loadFilesFromFolder(folderId);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const loadFilesFromFolder = async (folderId) => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents`,
        spaces: 'drive',
        pageSize: 50,
        fields: 'files(id, name, createdTime, webViewLink)'
      });

      setContracts(response.result.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const templates = {
    csa: {
      name: 'Client Service Agreement',
      fields: [
        { key: 'clientName', label: 'Client Name', type: 'text', required: true },
        { key: 'clientAddress', label: 'Client Address', type: 'text', required: true },
        { key: 'serviceName', label: 'Service Description', type: 'textarea', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date', required: true },
        { key: 'endDate', label: 'End Date', type: 'date', required: true },
        { key: 'totalFee', label: 'Total Fee', type: 'text', required: true },
        { key: 'paymentTerms', label: 'Payment Terms', type: 'text', required: true },
      ]
    },
    nda: {
      name: 'Non-Disclosure Agreement',
      fields: [
        { key: 'disclosingParty', label: 'Disclosing Party', type: 'text', required: true },
        { key: 'receivingParty', label: 'Receiving Party', type: 'text', required: true },
        { key: 'confidentialInfo', label: 'Confidential Information Description', type: 'textarea', required: true },
        { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
        { key: 'termLength', label: 'Term (in years)', type: 'text', required: true },
      ]
    },
    retainer: {
      name: 'Retainer Agreement',
      fields: [
        { key: 'clientName', label: 'Client Name', type: 'text', required: true },
        { key: 'monthlyFee', label: 'Monthly Retainer Fee', type: 'text', required: true },
        { key: 'hoursIncluded', label: 'Hours Included per Month', type: 'text', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date', required: true },
        { key: 'scopeOfWork', label: 'Scope of Work', type: 'textarea', required: true },
        { key: 'deliverables', label: 'Deliverables', type: 'textarea', required: true },
      ]
    },
    sow: {
      name: 'Statement of Work',
      fields: [
        { key: 'clientName', label: 'Client Name', type: 'text', required: true },
        { key: 'projectTitle', label: 'Project Title', type: 'text', required: true },
        { key: 'projectDescription', label: 'Project Description', type: 'textarea', required: true },
        { key: 'deliverables', label: 'Deliverables', type: 'textarea', required: true },
        { key: 'timeline', label: 'Timeline/Milestones', type: 'textarea', required: true },
        { key: 'budget', label: 'Project Budget', type: 'text', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date', required: true },
        { key: 'endDate', label: 'End Date', type: 'date', required: true },
      ]
    },
    affiliate: {
      name: 'Affiliate Referral Agreement',
      fields: [
        { key: 'affiliateName', label: 'Affiliate Name', type: 'text', required: true },
        { key: 'commissionRate', label: 'Commission Rate (%)', type: 'text', required: true },
        { key: 'paymentFrequency', label: 'Payment Frequency', type: 'text', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date', required: true },
        { key: 'programDescription', label: 'Program Description', type: 'textarea', required: true },
        { key: 'trackingMethod', label: 'Tracking Method', type: 'text', required: true },
      ]
    }
  };

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    setFormData({});
    setCurrentView('editor');
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generatePDF = async () => {
    if (!selectedTemplate) return;

    const template = templates[selectedTemplate];
    const missingFields = template.fields
      .filter(f => f.required && !formData[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      showMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    try {
      const pdfContent = generatePDFContent(template, formData);
      await savePDFToDrive(template.name, formData.clientName || formData.affiliateName, pdfContent);
      
      showMessage(`${template.name} generated and saved successfully!`, 'success');
      setCurrentView('dashboard');
      loadContractsFromDrive();
    } catch (error) {
      showMessage('Error generating PDF', 'error');
      console.error(error);
    }
  };

  const generatePDFContent = (template, data) => {
    let content = `${template.name}\n\n`;
    template.fields.forEach(field => {
      content += `${field.label}: ${data[field.key] || ''}\n`;
    });
    return content;
  };

  const savePDFToDrive = async (templateName, clientName, content) => {
    try {
      const fileName = `${clientName || 'Contract'}_${templateName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const file = new Blob([content], { type: 'text/plain' });
      
      const metadata = {
        name: fileName,
        mimeType: 'application/pdf'
      };

      await window.gapi.client.drive.files.create({
        resource: metadata,
        media: {
          mimeType: 'application/pdf',
          body: file
        },
        fields: 'id, webViewLink'
      });
    } catch (error) {
      console.error('Error saving to Drive:', error);
      throw error;
    }
  };

  if (authState !== 'authenticated') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '60px 40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <FileText size={64} style={{ color: '#667eea', marginBottom: '20px' }} />
          <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>Contract Generator</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>For oneleft.co team members</p>
          <button
            onClick={handleSignin}
            disabled={authState === 'authenticating'}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#5568d3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
          >
            {authState === 'authenticating' ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'editor' && selectedTemplate) {
    const template = templates[selectedTemplate];
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', padding: '40px 20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              marginBottom: '20px',
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Dashboard
          </button>

          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333', marginBottom: '30px' }}>{template.name}</h2>

            <div style={{ display: 'grid', gap: '20px' }}>
              {template.fields.map(field => (
                <div key={field.key}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        minHeight: '120px',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={generatePDF}
              style={{
                marginTop: '40px',
                width: '100%',
                padding: '14px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Generate PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={28} color="#667eea" />
          <h1 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Contract Generator</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px 0', color: '#333', fontWeight: '500' }}>{user?.name}</p>
            <p style={{ margin: 0, color: '#999', fontSize: '12px' }}>{user?.email}</p>
          </div>
          <button
            onClick={handleSignout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '16px 40px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          borderBottom: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: message.type === 'success' ? '#155724' : '#721c24'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div style={{ padding: '40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>Create New Contract</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => handleTemplateSelect(key)}
                  style={{
                    padding: '24px',
                    backgroundColor: 'white',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.backgroundColor = '#f8f9ff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <Plus size={24} color="#667eea" />
                  <span style={{ fontWeight: '600', color: '#333' }}>{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <FolderOpen size={20} color="#667eea" />
              <h2 style={{ color: '#333', margin: 0 }}>Recent Contracts ({contracts.length})</h2>
            </div>
            {contracts.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {contracts.map(contract => (
                  
                    <a key={contract.id}
                    href={contract.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FileText size={20} color="#667eea" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333' }}>{contract.name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                          {new Date(contract.createdTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#999'
              }}>
                No contracts yet. Create your first contract above!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractGeneratorApp;