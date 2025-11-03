'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from './lib/auth';
import { fetchVulnerabilities, fetchSectors, fetchSubsectorsBySector } from './lib/fetchVOFC';

export default function VOFCViewer() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [subsectors, setSubsectors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        setAuthenticated(true);
        setCurrentUser(user);
      } else {
        router.push('/splash');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/splash');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    
    try {
      setDataLoading(true);
      setError('');
      
      // Fetch vulnerabilities with their OFCs and sources
      const vulnsData = await fetchVulnerabilities();
      
      setVulnerabilities(vulnsData || []);
      setFilteredVulnerabilities(vulnsData || []);
      
      // Extract unique disciplines
      const uniqueDisciplines = [...new Set(vulnsData?.map(v => v.discipline).filter(Boolean) || [])];
      setDisciplines(uniqueDisciplines.sort());
      
      // Load sectors and subsectors from tables
      await loadSectors();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load vulnerability data. Please try again.');
      setVulnerabilities([]);
      setFilteredVulnerabilities([]);
    } finally {
      setDataLoading(false);
    }
  }, [authenticated]);

  const getUniqueDisciplines = useCallback(() => {
    const disciplines = vulnerabilities.map(v => v.discipline).filter(Boolean);
    return [...new Set(disciplines)].sort();
  }, [vulnerabilities]);

  // Load sectors from sectors table
  const loadSectors = useCallback(async () => {
    try {
      const sectorsData = await fetchSectors();
      setSectors(sectorsData || []);
    } catch (error) {
      console.error('Error loading sectors:', error);
      setSectors([]);
    }
  }, []);

  // Load subsectors based on selected sector
  const loadSubsectors = useCallback(async (sectorId) => {
    try {
      if (sectorId) {
        const subsectorsData = await fetchSubsectorsBySector(sectorId);
        setSubsectors(subsectorsData || []);
      } else {
        setSubsectors([]);
      }
    } catch (error) {
      console.error('Error loading subsectors:', error);
      setSubsectors([]);
    }
  }, []);

  // Load subsectors when sector changes
  useEffect(() => {
    if (selectedSector && sectors.length > 0) {
      // Find sector ID from sectors array - check both name and ID matching
      const sector = sectors.find(s => 
        s.name === selectedSector || 
        String(s.id) === String(selectedSector) ||
        s.id === selectedSector
      );
      if (sector && sector.id) {
        loadSubsectors(sector.id);
      } else {
        // If no match found, clear subsectors
        setSubsectors([]);
        setSelectedSubsector('');
      }
    } else {
      setSubsectors([]);
      setSelectedSubsector('');
    }
  }, [selectedSector, sectors, loadSubsectors]);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, loadData]);

  useEffect(() => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.vulnerability?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.discipline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.subsector?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDiscipline) {
      filtered = filtered.filter(v => v.discipline === selectedDiscipline);
    }

    if (selectedSector) {
      // Find the selected sector object
      const sector = sectors.find(s => s.name === selectedSector || String(s.id) === String(selectedSector));
      if (sector) {
        // Filter by sector name, sector_id, or ID matching
        filtered = filtered.filter(v => {
          // Check multiple possible field formats
          return v.sector === sector.name || 
                 v.sector === String(sector.id) || 
                 v.sector_id === sector.id ||
                 String(v.sector_id) === String(sector.id);
        });
      }
    }

    if (selectedSubsector) {
      // Find the selected subsector object
      const subsector = subsectors.find(s => s.name === selectedSubsector || String(s.id) === String(selectedSubsector));
      if (subsector) {
        // Filter by subsector name, subsector_id, or ID matching
        filtered = filtered.filter(v => {
          // Check multiple possible field formats
          return v.subsector === subsector.name || 
                 v.subsector === String(subsector.id) || 
                 v.subsector_id === subsector.id ||
                 String(v.subsector_id) === String(subsector.id);
        });
      }
    }

    setFilteredVulnerabilities(filtered);
  }, [vulnerabilities, searchTerm, selectedDiscipline, selectedSector, selectedSubsector, sectors, subsectors]);


  if (!mounted) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="text-center py-8">
            <div className="loading"></div>
            <p className="text-secondary mt-3">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="text-center py-8">
            <div className="loading"></div>
            <p className="text-secondary mt-3">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="error-message">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="card-title">
                VOFC Engine Dashboard
              </h1>
              <p className="card-subtitle">
                Showing {filteredVulnerabilities.length} of {vulnerabilities.length} vulnerabilities
              </p>
            </div>
            <div className="flex gap-3">
              <a href="/submit" className="btn btn-primary">
                📝 Submit New Vulnerability
              </a>
              <a href="/submit-psa" className="btn btn-secondary">
                📤 Submit Documents
              </a>
              <a href="/profile" className="btn btn-secondary">
                👤 Profile
              </a>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="form-group">
              <label className="form-label" htmlFor="search-input">
                Search
              </label>
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vulnerabilities..."
                className="form-input"
              />
            </div>

            {/* Discipline */}
            <div className="form-group">
              <label className="form-label" htmlFor="discipline-select">
                Discipline
              </label>
              <select
                id="discipline-select"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="form-select"
              >
                <option value="">All Disciplines</option>
                {getUniqueDisciplines().map(discipline => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector */}
            <div className="form-group">
              <label className="form-label" htmlFor="sector-select">
                Sector
              </label>
              <select
                id="sector-select"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="form-select"
              >
                <option value="">All Sectors</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.name || sector.id}>
                    {sector.name || `Sector ${sector.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Subsector */}
            <div className="form-group">
              <label className="form-label" htmlFor="subsector-select">
                Subsector
              </label>
              <select
                id="subsector-select"
                value={selectedSubsector}
                onChange={(e) => setSelectedSubsector(e.target.value)}
                className="form-select"
                disabled={!selectedSector}
              >
                <option value="">All Subsectors</option>
                {subsectors.map(subsector => (
                  <option key={subsector.id} value={subsector.name || subsector.id}>
                    {subsector.name || `Subsector ${subsector.id}`}
                  </option>
                ))}
              </select>
              {selectedSector && subsectors.length === 0 && (
                <small className="text-gray-500 text-xs mt-1 block">
                  No subsectors available for this sector
                </small>
              )}
            </div>

            {/* Clear Filters */}
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDiscipline('');
                  setSelectedSector('');
                  setSelectedSubsector('');
                }}
                className="btn btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Data Loading State */}
        {dataLoading && (
          <div className="card text-center">
            <div className="loading"></div>
            <p className="text-secondary mt-3">Loading vulnerability data...</p>
          </div>
        )}

        {/* Vulnerabilities List */}
        <div className="space-y-4">
          {filteredVulnerabilities.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-secondary text-lg">
                {vulnerabilities.length === 0 
                  ? "No vulnerabilities found in database. Check database schema and data."
                  : "No vulnerabilities found matching your filters"
                }
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVulnerabilities.map((vulnerability) => {
                return (
                  <VulnerabilityCard
                    key={vulnerability.id}
                    vulnerability={vulnerability}
                    currentUser={currentUser}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Vulnerability Card Component
function VulnerabilityCard({ vulnerability, currentUser }) {
  const ofcs = vulnerability.ofcs || [];
  const [showAddOFC, setShowAddOFC] = useState(false);
  const [ofcText, setOfcText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleAddOFC = async () => {
    if (!ofcText.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/submissions/ofc-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vulnerability_id: vulnerability.id,
          ofc_text: ofcText.trim(),
          submitter: currentUser?.email || 'unknown@vofc.gov',
          vulnerability_text: vulnerability.vulnerability,
          discipline: vulnerability.discipline
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert('OFC request submitted for supervisor review!');
        setOfcText('');
        setShowAddOFC(false);
      } else {
        alert(`Failed to submit OFC request: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting OFC request:', error);
      alert('Error submitting OFC request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="card">
      {/* Vulnerability Header */}
      <div className="card-header">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="card-title">
              {vulnerability.vulnerability || `Vulnerability ${vulnerability.id}`}
            </h3>
            {vulnerability.discipline && (
              <span className="status-badge status-processing">
                {vulnerability.discipline}
              </span>
            )}
          </div>
          <div className="ml-4">
            <button
              onClick={() => setShowAddOFC(!showAddOFC)}
              className="btn btn-primary btn-sm"
            >
              <i className="fas fa-plus mr-1"></i>
              Add OFC
            </button>
          </div>
        </div>
      </div>

      {/* Add OFC Form */}
      {showAddOFC && (
        <div className="card-body border-t border-gray-200 bg-blue-50">
          <h4 className="font-semibold text-blue-900 mb-3">Add Option for Consideration</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">
                OFC Text:
              </label>
              <textarea
                value={ofcText}
                onChange={(e) => setOfcText(e.target.value)}
                placeholder="Enter the option for consideration..."
                className="w-full p-2 border border-blue-300 rounded-md text-sm"
                rows="3"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddOFC}
                disabled={!ofcText.trim() || submitting}
                className="btn btn-success btn-sm"
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
              <button
                onClick={() => {
                  setShowAddOFC(false);
                  setOfcText('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFCs Section */}
      <div>
        {ofcs.length === 0 ? (
          <div className="card bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-800">
              No Options for Consideration available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ofcs.map((ofc) => (
              <OFCCard key={ofc.id} ofc={ofc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// OFC Card Component
function OFCCard({ ofc }) {
  return (
    <div className="card">
      <div>
        <h5 className="font-semibold mb-2">
          Option for Consideration
        </h5>
        <p className="text-secondary mb-3" style={{
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {ofc.option_text}
        </p>

        {/* Sources */}
        {ofc.sources && ofc.sources.length > 0 && (
          <div className="mt-4">
            <h6 className="font-semibold mb-2">Sources:</h6>
            {ofc.sources.map((source, index) => (
              <div key={index} className="card p-3 mb-2">
                <p className="text-sm text-secondary" style={{
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  {source.source_text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}