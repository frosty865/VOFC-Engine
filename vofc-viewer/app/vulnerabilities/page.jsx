'use client';
import { useEffect, useState } from 'react';

export default function VulnerabilityViewer() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  
  // Filter states
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSubsector, setSelectedSubsector] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  
  // Filter options
  const [sectors, setSectors] = useState([]);
  const [subsectors, setSubsectors] = useState([]);
  const [disciplines, setDisciplines] = useState([]);

  // Load filter options on mount (without filters to get all available options)
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load vulnerabilities when filters change
  useEffect(() => {
    loadVulnerabilities();
  }, [selectedSector, selectedSubsector, selectedDiscipline]);

  // Load filter options on mount (without filters to get all available options)
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    filterVulnerabilities();
  }, [vulnerabilities, searchTerm]);

  // Load filter options separately to ensure dropdowns are always populated
  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/public/vofc-data');
      const data = await response.json();
      
      if (data.success) {
        setSectors(data.filters?.sectors || []);
        setSubsectors(data.filters?.subsectors || []);
        setDisciplines(data.filters?.disciplines || []);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadVulnerabilities = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (selectedSector) params.set('sector', selectedSector);
      if (selectedSubsector) params.set('subsector', selectedSubsector);
      if (selectedDiscipline) params.set('discipline', selectedDiscipline);
      
      const response = await fetch(`/api/public/vofc-data?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setVulnerabilities(data.vulnerabilities || []);
        // Update filter options from response (may have changed)
        if (data.filters) {
          setSectors(data.filters.sectors || []);
          setSubsectors(data.filters.subsectors || []);
          setDisciplines(data.filters.disciplines || []);
        }
      }
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVulnerabilities = () => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(v => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (v.vulnerability_text && v.vulnerability_text.toLowerCase().includes(searchLower)) ||
          (v.question && v.question.toLowerCase().includes(searchLower)) ||
          (v.what && v.what.toLowerCase().includes(searchLower)) ||
          (v.so_what && v.so_what.toLowerCase().includes(searchLower)) ||
          (v.discipline && v.discipline.toLowerCase().includes(searchLower)) ||
          (v.sector && v.sector.toLowerCase().includes(searchLower)) ||
          (v.subsector && v.subsector.toLowerCase().includes(searchLower))
        );
      });
    }

    setFilteredVulnerabilities(filtered);
  };

  const clearFilters = () => {
    setSelectedSector('');
    setSelectedSubsector('');
    setSelectedDiscipline('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading vulnerabilities...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">VOFC Engine Dashboard</h1>
            <p className="text-gray-600 mt-2">Filter and search vulnerabilities by sector, subsector, and discipline</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Vulnerabilities
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by question, description, sector, subsector, or discipline..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Sector Filter */}
          <div>
            <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">
              Sector
            </label>
            <select
              id="sector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sectors</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Subsector Filter */}
          <div>
            <label htmlFor="subsector" className="block text-sm font-medium text-gray-700 mb-2">
              Subsector
            </label>
            <select
              id="subsector"
              value={selectedSubsector}
              onChange={(e) => setSelectedSubsector(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subsectors</option>
              {subsectors.map((subsector) => (
                <option key={subsector} value={subsector}>
                  {subsector}
                </option>
              ))}
            </select>
          </div>

          {/* Discipline Filter */}
          <div>
            <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
              Discipline
            </label>
            <select
              id="discipline"
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Disciplines</option>
              {disciplines.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-4">
          Showing <strong>{filteredVulnerabilities.length}</strong> of <strong>{vulnerabilities.length}</strong> vulnerabilities
          {(selectedSector || selectedSubsector || selectedDiscipline) && (
            <span className="ml-2 text-blue-600">
              (filtered by: {[selectedSector, selectedSubsector, selectedDiscipline].filter(Boolean).join(', ') || 'none'})
            </span>
          )}
        </div>
      </div>

      {/* Vulnerabilities List */}
      <div className="space-y-4">
        {filteredVulnerabilities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No vulnerabilities found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredVulnerabilities.map((vulnerability) => (
            <div key={vulnerability.id} className="bg-white rounded-lg shadow-lg p-6">
              {/* Header with metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                {vulnerability.sector && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Sector: {vulnerability.sector}
                  </span>
                )}
                {vulnerability.subsector && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Subsector: {vulnerability.subsector}
                  </span>
                )}
                {vulnerability.discipline && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    Discipline: {vulnerability.discipline}
                  </span>
                )}
              </div>

              {/* Question */}
              {vulnerability.question && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Question</h3>
                  <p className="text-gray-700">{vulnerability.question}</p>
                </div>
              )}

              {/* What */}
              {vulnerability.what && (
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-1">What</h4>
                  <p className="text-gray-700">{vulnerability.what}</p>
                </div>
              )}

              {/* So What */}
              {vulnerability.so_what && (
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-1">So What</h4>
                  <p className="text-gray-700">{vulnerability.so_what}</p>
                </div>
              )}

              {/* Fallback to vulnerability_text if structured fields not available */}
              {!vulnerability.question && vulnerability.vulnerability_text && (
                <div className="mb-4">
                  <p className="text-gray-700">{vulnerability.vulnerability_text}</p>
                </div>
              )}

              {/* Timestamp */}
              {vulnerability.created_at && (
                <div className="text-xs text-gray-500 mt-4">
                  Created: {new Date(vulnerability.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

