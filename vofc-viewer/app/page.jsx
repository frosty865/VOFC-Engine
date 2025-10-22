'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from './lib/auth';
import { fetchVulnerabilities } from './lib/fetchVOFC';
import DomainFilter from './components/DomainFilter';

export default function VOFCViewer() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const checkAuth = async () => {
    try {
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
  };

  const loadData = async () => {
    try {
      setDataLoading(true);
      
      // Fetch vulnerabilities with their OFCs and sources
      const vulnsData = await fetchVulnerabilities();
      
      setVulnerabilities(vulnsData || []);
      setFilteredVulnerabilities(vulnsData || []);
      
      // Extract unique disciplines
      const uniqueDisciplines = [...new Set(vulnsData?.map(v => v.discipline).filter(Boolean) || [])];
      setDisciplines(uniqueDisciplines.sort());
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load vulnerability data. Please try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const getUniqueDisciplines = () => {
    const disciplines = vulnerabilities.map(v => v.discipline).filter(Boolean);
    return [...new Set(disciplines)].sort();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated]);

  useEffect(() => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.vulnerability?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.discipline?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDiscipline) {
      filtered = filtered.filter(v => v.discipline === selectedDiscipline);
    }

    // Apply domain filtering
    if (selectedDomains.length > 0 && selectedDomains.length < 3) {
      filtered = filtered.filter(v => selectedDomains.includes(v.domain));
    }

    setFilteredVulnerabilities(filtered);
  }, [vulnerabilities, searchTerm, selectedDiscipline, selectedDomains]);

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
                📝 Submit VOFC
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
          
          {/* Domain Filter */}
          <div className="mb-4">
            <DomainFilter 
              selectedDomains={selectedDomains}
              onDomainChange={setSelectedDomains}
              userRole={currentUser?.role}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {/* Clear Filters */}
            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDiscipline('');
                  setSelectedDomains([]);
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
function VulnerabilityCard({ vulnerability }) {
  const ofcs = vulnerability.ofcs || [];
  
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
        </div>
      </div>

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
        <p className="text-secondary mb-3">
          {ofc.option_text}
        </p>

        {/* Sources */}
        {ofc.sources && ofc.sources.length > 0 && (
          <div className="mt-4">
            <h6 className="font-semibold mb-2">Sources:</h6>
            {ofc.sources.map((source, index) => (
              <div key={index} className="card p-3 mb-2">
                <p className="text-sm text-secondary">
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