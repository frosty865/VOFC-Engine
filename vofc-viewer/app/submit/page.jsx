'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUser, getUserProfile, canSubmitVOFC } from '../lib/auth';
import { fetchSectors, fetchSubsectors } from '../lib/fetchVOFC';
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning';

export default function VOFCSubmission() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState('vulnerability');
  const [sectors, setSectors] = useState([]);
  const [subsectors, setSubsectors] = useState([]);
  const [filteredSubsectors, setFilteredSubsectors] = useState([]);
  const [formData, setFormData] = useState({
    vulnerability: '',
    option_text: '',
    discipline: '',
    source: '',
    sector_id: '',
    subsector_id: '',
    submitter_email: ''
  });
  const [ofcs, setOfcs] = useState([]);
  const [currentOfc, setCurrentOfc] = useState('');

  // Predefined discipline options
  const disciplineOptions = [
    'Physical Security',
    'Cybersecurity', 
    'Personnel Security',
    'Operational Security',
    'Information Security',
    'Facility Information',
    'Emergency Management',
    'Risk Management',
    'Compliance',
    'Training and Awareness'
  ];
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadSectorsAndSubsectors();
    handleUrlParams();
  }, []);

  const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const vulnerabilityId = urlParams.get('vulnerability_id');
    const discipline = urlParams.get('discipline');
    const sector = urlParams.get('sector');
    
    if (type) {
      setSubmissionType(type);
    }
    
    if (discipline) {
      setFormData(prev => ({ ...prev, discipline: decodeURIComponent(discipline) }));
    }
    
    // Find sector ID by name if provided
    if (sector && sectors.length > 0) {
      const foundSector = sectors.find(s => s.sector_name === decodeURIComponent(sector));
      if (foundSector) {
        setFormData(prev => ({ ...prev, sector_id: foundSector.id }));
      }
    }
  };

  useEffect(() => {
    // Filter subsectors when sector changes
    if (formData.sector_id && subsectors.length > 0) {
      const filtered = subsectors.filter(sub => {
        return sub.sector_id === parseInt(formData.sector_id) || 
               sub.sector_id === formData.sector_id ||
               sub.sector_id.toString() === formData.sector_id.toString();
      });
      setFilteredSubsectors(filtered);
    } else {
      setFilteredSubsectors([]);
    }
  }, [formData.sector_id, subsectors]);

  useEffect(() => {
    // Handle URL params after sectors are loaded
    if (sectors.length > 0) {
      handleUrlParams();
    }
  }, [sectors]);

  const loadSectorsAndSubsectors = async () => {
    try {
      const [sectorsData, subsectorsData] = await Promise.all([
        fetchSectors(),
        fetchSubsectors()
      ]);
      setSectors(sectorsData);
      setSubsectors(subsectorsData);
    } catch (error) {
      console.error('Error loading sectors and subsectors:', error);
    }
  };

  const addOfc = () => {
    if (currentOfc.trim()) {
      setOfcs([...ofcs, currentOfc.trim()]);
      setCurrentOfc('');
    }
  };

  const removeOfc = (index) => {
    setOfcs(ofcs.filter((_, i) => i !== index));
  };

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/splash');
        return;
      }

      const profile = await getUserProfile(user.id);
      setCurrentUser(user);
      setUserRole(profile.role);

      if (!canSubmitVOFC(profile.role)) {
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/splash');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (submissionType === 'vulnerability' && ofcs.length > 0) {
        // Submit vulnerability with associated OFCs
        const submissionData = {
          type: 'vulnerability',
          data: {
            vulnerability: formData.vulnerability,
            discipline: formData.discipline,
            source: formData.source,
            sector_id: formData.sector_id || null,
            subsector_id: formData.subsector_id || null,
            has_associated_ofcs: true,
            ofc_count: ofcs.length,
            associated_ofcs: ofcs
          },
          submitterEmail: formData.submitter_email,
          submitted_by: currentUser.id,
          status: 'pending'
        };

        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit');
        }

        const result = await response.json();
        alert(`Vulnerability with ${ofcs.length} associated OFCs submitted successfully! Submission ID: ${result.id}`);
      } else {
        // Submit single vulnerability or OFC
        const submissionData = {
          type: submissionType,
          data: submissionType === 'vulnerability' 
            ? {
                vulnerability: formData.vulnerability,
                discipline: formData.discipline,
                source: formData.source,
                sector_id: formData.sector_id || null,
                subsector_id: formData.subsector_id || null
              }
            : {
                option_text: formData.option_text,
                discipline: formData.discipline,
                source: formData.source,
                sector_id: formData.sector_id || null,
                subsector_id: formData.subsector_id || null
              },
          submitterEmail: formData.submitter_email,
          submitted_by: currentUser.id,
          status: 'pending'
        };

        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit');
        }

        const result = await response.json();
        console.log('Submission response:', result);
        alert(`${submissionType === 'vulnerability' ? 'Vulnerability' : 'Option for Consideration'} submitted successfully! Submission ID: ${result.submission_id}`);
      }

      // Reset form
      setFormData({
        vulnerability: '',
        option_text: '',
        discipline: '',
        source: '',
        sector_id: '',
        subsector_id: ''
      });
      setOfcs([]);
      setCurrentOfc('');
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error submitting: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SessionTimeoutWarning />
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Submit VOFC</h1>
          <p className="text-secondary">Contribute vulnerabilities and options for consideration</p>
        </div>

        <div className="card-body">
          <div className="mb-4">
            <label className="form-label">Submission Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="submissionType"
                  value="vulnerability"
                  checked={submissionType === 'vulnerability'}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="mr-2"
                />
                Vulnerability
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="submissionType"
                  value="ofc"
                  checked={submissionType === 'ofc'}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="mr-2"
                />
                Option for Consideration (OFC)
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">
                {submissionType === 'vulnerability' ? 'Vulnerability Description' : 'Option Text'} *
              </label>
              <textarea
                required
                value={submissionType === 'vulnerability' ? formData.vulnerability : formData.option_text}
                onChange={(e) => setFormData({...formData, 
                  [submissionType === 'vulnerability' ? 'vulnerability' : 'option_text']: e.target.value
                })}
                className="form-textarea"
                rows="4"
                placeholder={submissionType === 'vulnerability' 
                  ? 'Describe the vulnerability...' 
                  : 'Describe the option for consideration...'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discipline *</label>
              <select
                required
                value={formData.discipline}
                onChange={(e) => setFormData({...formData, discipline: e.target.value})}
                className="form-select"
              >
                <option value="">Select a discipline...</option>
                {disciplineOptions.map(discipline => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Sector *</label>
                  <select
                    required
                    value={formData.sector_id}
                    onChange={(e) => setFormData({...formData, sector_id: e.target.value, subsector_id: ''})}
                    className="form-select"
                  >
                    <option value="">Select a sector...</option>
                    {sectors.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.sector_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Subsector</label>
                  <select
                    value={formData.subsector_id}
                    onChange={(e) => setFormData({...formData, subsector_id: e.target.value})}
                    className="form-select"
                    disabled={!formData.sector_id}
                  >
                    <option value="">Select a subsector...</option>
                    {filteredSubsectors.map(subsector => (
                      <option key={subsector.id} value={subsector.id}>
                        {subsector.subsector_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                className="form-input"
                placeholder="e.g., VOFC Library, NIST Guidelines, DHS Resources"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Email Address *</label>
              <input
                type="email"
                required
                value={formData.submitter_email}
                onChange={(e) => setFormData({...formData, submitter_email: e.target.value})}
                className="form-input"
                placeholder="your.email@example.com"
              />
              <small className="text-secondary">We'll use this to notify you about your submission status</small>
            </div>

            {submissionType === 'vulnerability' && (
              <div className="form-group">
                <label className="form-label">Associated Options for Consideration</label>
                <div className="mb-3">
                  <div className="flex gap-2">
                    <textarea
                      value={currentOfc}
                      onChange={(e) => setCurrentOfc(e.target.value)}
                      className="form-textarea flex-1"
                      rows="2"
                      placeholder="Add an option for consideration..."
                    />
                    <button
                      type="button"
                      onClick={addOfc}
                      disabled={!currentOfc.trim()}
                      className="btn btn-outline-primary"
                    >
                      <i className="fas fa-plus mr-1"></i>
                      Add OFC
                    </button>
                  </div>
                </div>
                
                {ofcs.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold">Added OFCs ({ofcs.length}):</h5>
                    {ofcs.map((ofc, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-light border rounded">
                        <div className="flex-1 text-sm">{ofc}</div>
                        <button
                          type="button"
                          onClick={() => removeOfc(index)}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    vulnerability: '',
                    option_text: '',
                    discipline: '',
                    source: '',
                    sector_id: '',
                    subsector_id: ''
                  });
                  setOfcs([]);
                  setCurrentOfc('');
                }}
                className="btn btn-secondary"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}