'use client';
import { useState, useEffect } from 'react';
import { fetchVulnerabilities, fetchVOFC, fetchSectors, fetchSubsectors, fetchSources, discoverDatabaseSchema, getOFCsForVulnerability } from '../lib/fetchVOFC';

export default function VulnerabilityDashboard() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [ofcs, setOfcs] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [subsectors, setSubsectors] = useState([]);
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vulnerabilities, searchTerm, selectedDiscipline, selectedSector, selectedSubsector]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading vulnerability dashboard data...');
      
      // Fetch vulnerabilities with their OFCs and sources
      const vulnsData = await fetchVulnerabilities();
      console.log('📊 Loaded vulnerabilities:', vulnsData?.length);
      
      // Fetch sectors and subsectors for filtering
      let sectorsData = [];
      let subsectorsData = [];
      
      try {
        sectorsData = await fetchSectors();
        subsectorsData = await fetchSubsectors();
      } catch (err) {
        console.warn('⚠️ Could not fetch sectors/subsectors:', err.message);
      }
      
      console.log('📊 Loaded data:', { 
        vulnerabilities: vulnsData?.length, 
        sectors: sectorsData?.length,
        subsectors: subsectorsData?.length
      });
      
      setVulnerabilities(vulnsData || []);
      setSectors(sectorsData || []);
      setSubsectors(subsectorsData || []);
    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load vulnerability data. Please check the database connection.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...vulnerabilities];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vuln =>
        vuln.vulnerability?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Discipline filter
    if (selectedDiscipline) {
      filtered = filtered.filter(vuln => vuln.discipline === selectedDiscipline);
    }

    // Sector filter
    if (selectedSector) {
      filtered = filtered.filter(vuln => vuln.sector_id === selectedSector);
    }

    // Subsector filter
    if (selectedSubsector) {
      filtered = filtered.filter(vuln => vuln.subsector_id === selectedSubsector);
    }

    setFilteredVulnerabilities(filtered);
  };

  // Use the imported getOFCsForVulnerability function from fetchVOFC.js

  const getUniqueDisciplines = () => {
    const disciplines = vulnerabilities.map(v => v.discipline).filter(Boolean);
    return [...new Set(disciplines)].sort();
  };

  const getSubsectorsForSector = (sectorId) => {
    return subsectors.filter(sub => sub.sector_id === sectorId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-600 text-xl mb-2">⏳ Loading...</div>
          <div className="text-gray-600">Loading vulnerability dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <div className="text-red-600 text-xl mb-2">❌ Database Schema Error</div>
          <div className="text-gray-600 mb-4">
            The database schema doesn't match the expected structure. 
            This usually means the database needs to be updated or the schema has changed.
          </div>
          <div className="text-sm text-gray-500 mb-4">
            Check the console for specific column errors and verify your database structure.
          </div>
          <button
            onClick={loadData}
            className="btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vulnerability Dashboard
          </h1>
          <p className="text-gray-600">
            Showing {filteredVulnerabilities.length} of {vulnerabilities.length} vulnerabilities
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6 p-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Filters</h2>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="search-input">
                  Search
                </label>
                <input
                  id="search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vulnerabilities..."
                  className="form-input w-full"
                />
              </div>

              {/* Discipline */}
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="discipline-select">
                  Discipline
                </label>
                <select
                  id="discipline-select"
                  value={selectedDiscipline}
                  onChange={(e) => setSelectedDiscipline(e.target.value)}
                  className="usa-select"
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
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="sector-select">
                  Sector
                </label>
                <select
                  id="sector-select"
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setSelectedSubsector(''); // Reset subsector when sector changes
                  }}
                  className="usa-select"
                >
                  <option value="">All Sectors</option>
                  {sectors.map(sector => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subsector */}
              <div className="usa-form-group">
                <label className="usa-label" htmlFor="subsector-select">
                  Subsector
                </label>
                <select
                  id="subsector-select"
                  value={selectedSubsector}
                  onChange={(e) => setSelectedSubsector(e.target.value)}
                  disabled={!selectedSector}
                  className="usa-select"
                >
                  <option value="">All Subsectors</option>
                  {getSubsectorsForSector(selectedSector).map(subsector => (
                    <option key={subsector.id} value={subsector.id}>
                      {subsector.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="usa-form-group">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDiscipline('');
                    setSelectedSector('');
                    setSelectedSubsector('');
                  }}
                  className="usa-button usa-button--outline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vulnerabilities List */}
        <div className="space-y-6">
          {filteredVulnerabilities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">
                {vulnerabilities.length === 0 
                  ? "No vulnerabilities found in database. Check database schema and data."
                  : "No vulnerabilities found matching your filters"
                }
              </div>
              {vulnerabilities.length === 0 && (
                <div className="text-sm text-gray-400 mt-2">
                  This usually indicates a database schema mismatch or missing data.
                </div>
              )}
            </div>
          ) : (
            filteredVulnerabilities.map((vulnerability) => {
              return (
                <VulnerabilityCard
                  key={vulnerability.id}
                  vulnerability={vulnerability}
                />
              );
            })
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
    <div className="card mb-6 p-4">
      {/* Vulnerability Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          {vulnerability.vulnerability || `Vulnerability ${vulnerability.id}`}
        </h3>
        {vulnerability.discipline && (
          <span className="badge">{vulnerability.discipline}</span>
        )}
      </div>

      {/* OFCs Section */}
      <div>
        {ofcs.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
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
    <div className="card p-4">
      <div>
        <h5 className="font-semibold mb-2">
          Option for Consideration
        </h5>
        <p className="text-gray-700 mb-3">
          {ofc.option_text}
        </p>
        
        {/* Discipline */}
        {ofc.discipline && (
          <span className="badge">{ofc.discipline}</span>
        )}

        {/* Sources */}
        {ofc.sources && ofc.sources.length > 0 && (
          <div className="mt-4">
            <h6 className="font-semibold mb-2">Sources:</h6>
            {ofc.sources.map((source, index) => (
              <div key={index} className="card p-3 mb-2">
                <span className="badge">
                  Ref #{source.reference_number}
                </span>
                <p className="text-sm text-gray-600 mt-2">
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
