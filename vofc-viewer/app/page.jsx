'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchVulnerabilities, fetchOFCs, fetchVulnerabilityOFCLinks, getOFCsForVulnerability, fetchSectors, fetchSubsectors } from './lib/fetchVOFC';
import { getCurrentUser } from './lib/auth';
import { trackVOFCEvent, trackPageView } from '../components/AnalyticsProvider';
import VulnerabilityCard from './components/VulnerabilityCard';
import OFCCard from './components/OFCCard';
// import SessionTimeoutWarning from '../components/SessionTimeoutWarning';

export default function VOFCViewer() {
  const router = useRouter();
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [ofcs, setOFCs] = useState([]);
  const [vulnerabilityOFCLinks, setVulnerabilityOFCLinks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [subsectors, setSubsectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('discipline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterSubsector, setFilterSubsector] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const itemsPerPage = 1000; // Show all vulnerabilities temporarily

  useEffect(() => {
    checkAuth();
    // Track dashboard page view
    trackPageView('dashboard');
    trackVOFCEvent.viewDashboard();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setAuthenticated(true);
        loadData();
      } else {
        router.push('/splash');
      }
    } catch (error) {
      console.log('Not authenticated, redirecting to splash');
      router.push('/splash');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [vulnerabilitiesData, ofcsData, linksData, sectorsData, subsectorsData] = await Promise.all([
        fetchVulnerabilities(),
        fetchOFCs(),
        fetchVulnerabilityOFCLinks(),
        fetchSectors(),
        fetchSubsectors()
      ]);
      setVulnerabilities(vulnerabilitiesData);
      setOFCs(ofcsData);
      setVulnerabilityOFCLinks(linksData);
      setSectors(sectorsData);
      setSubsectors(subsectorsData);

      console.log('Data loaded:', {
        vulnerabilities: vulnerabilitiesData.length,
        ofcs: ofcsData.length,
        links: linksData.length,
        sectors: sectorsData.length,
        subsectors: subsectorsData.length
      });

      // Debug: Check if we have any links
      if (linksData.length > 0) {
        console.log('Sample links:', linksData.slice(0, 3));
        console.log('First 10 link vulnerability IDs:', linksData.slice(0, 10).map(link => link.vulnerability_id));

        // Check if vuln_0002 exists in the links
        const vuln0002Links = linksData.filter(link => link.vulnerability_id === 'vuln_0002');
        console.log('Links for vuln_0002 in loaded data:', vuln0002Links.length);
        if (vuln0002Links.length > 0) {
          console.log('vuln_0002 links:', vuln0002Links);
        }
      }

      // Debug: Check if we have any OFCs
      if (ofcsData.length > 0) {
        console.log('Sample OFCs:', ofcsData.slice(0, 3));

        // Check if ofc_0322 exists (from the first link)
        const ofc0322 = ofcsData.find(ofc => ofc.id === 'ofc_0322');
        if (ofc0322) {
          console.log('ofc_0322 found:', ofc0322);
        } else {
          console.log('ofc_0322 NOT found in OFCs data');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized filtering to prevent unnecessary re-renders
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    // Filter vulnerabilities with their related OFCs
    let filteredVulnerabilities = vulnerabilities.filter(v => {
      // Search filter
      const matchesSearch = !searchTerm ||
        (v.vulnerability && v.vulnerability.toLowerCase().includes(searchLower)) ||
        (v.discipline && v.discipline.toLowerCase().includes(searchLower)) ||
        (v.sector && v.sector.toLowerCase().includes(searchLower));

      // Discipline filter
      const matchesDiscipline = !filterDiscipline || v.discipline === filterDiscipline;

      // Sector filter
      const matchesSector = !filterSector || v.sector_id === filterSector;

      // Subsector filter
      const matchesSubsector = !filterSubsector || v.subsector_id === filterSubsector;

      return matchesSearch && matchesDiscipline && matchesSector && matchesSubsector;
    });

    // Get OFCs for each vulnerability
    const vulnerabilitiesWithOFCs = filteredVulnerabilities.map(vulnerability => {
      const relatedOFCs = vulnerabilityOFCLinks
        .filter(link => link.vulnerability_id === vulnerability.id)
        .map(link => ofcs.find(ofc => ofc.id === link.ofc_id))
        .filter(Boolean);

      // Debug: Log the vulnerabilities that have links
      if (vulnerability.id === 'vuln_0017' || vulnerability.id === 'vuln_0018') {
        const matchingLinks = vulnerabilityOFCLinks.filter(link => link.vulnerability_id === vulnerability.id);
        console.log(`Debug for ${vulnerability.id}:`, {
          vulnerability: vulnerability.id,
          vulnerabilityType: typeof vulnerability.id,
          links: matchingLinks.length,
          relatedOFCs: relatedOFCs.length,
          ofcIds: matchingLinks.slice(0, 5).map(link => link.ofc_id),
          foundOFCs: relatedOFCs.slice(0, 3).map(ofc => ({ id: ofc.id, text: ofc.option_text?.substring(0, 50) }))
        });
      }

      return {
        ...vulnerability,
        relatedOFCs
      };
    });

    // Sort the results
    vulnerabilitiesWithOFCs.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'discipline':
          aValue = a.discipline || '';
          bValue = b.discipline || '';
          break;
        case 'sector':
          aValue = a.sector || '';
          bValue = b.sector || '';
          break;
        case 'vulnerability':
          aValue = a.vulnerability || '';
          bValue = b.vulnerability || '';
          break;
        case 'ofc_count':
          aValue = a.relatedOFCs ? a.relatedOFCs.length : 0;
          bValue = b.relatedOFCs ? b.relatedOFCs.length : 0;
          break;
        default:
          aValue = a.discipline || '';
          bValue = b.discipline || '';
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return {
      filteredVulnerabilities: vulnerabilitiesWithOFCs
    };
  }, [vulnerabilities, ofcs, vulnerabilityOFCLinks, searchTerm, sortBy, sortOrder, filterDiscipline, filterSector, filterSubsector]);

  // Pagination for performance
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      vulnerabilities: filteredData.filteredVulnerabilities.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredData.filteredVulnerabilities.length / itemsPerPage)
    };
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, filterDiscipline, filterSector, filterSubsector]);

  if (!authenticated) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading VOFC data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* <SessionTimeoutWarning /> */}
      <div className="card mb-6">
        <div className="card-header">
          <h1 className="card-title">VOFC Viewer - Vulnerabilities with Options for Consideration</h1>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="search" className="form-label">
                Search All Content
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vulnerabilities..."
                className="form-input"
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
              >
                <option value="discipline">Discipline</option>
                <option value="sector">Sector</option>
                <option value="vulnerability">Vulnerability</option>
                <option value="ofc_count">OFC Count</option>
              </select>
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group">
              <label className="form-label">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="form-select"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4">
            <div className="form-group">
              <label className="form-label">Filter by Discipline</label>
              <select
                value={filterDiscipline}
                onChange={(e) => setFilterDiscipline(e.target.value)}
                className="form-select"
              >
                <option value="">All Disciplines</option>
                {Array.from(new Set(vulnerabilities.map(v => v.discipline).filter(Boolean))).sort().map(discipline => (
                  <option key={discipline} value={discipline}>{discipline}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group">
              <label className="form-label">Filter by Sector</label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setFilterSubsector(''); // Reset subsector when sector changes
                }}
                className="form-select"
              >
                <option value="">All Sectors</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.sector_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group">
              <label className="form-label">Filter by Subsector</label>
              <select
                value={filterSubsector}
                onChange={(e) => setFilterSubsector(e.target.value)}
                className="form-select"
                disabled={!filterSector}
              >
                <option value="">All Subsectors</option>
                {subsectors
                  .filter(sub => !filterSector || sub.sector_id == filterSector)
                  .map(subsector => (
                    <option key={subsector.id} value={subsector.id}>{subsector.subsector_name}</option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSortBy('discipline');
                  setSortOrder('asc');
                  setFilterDiscipline('');
                  setFilterSector('');
                  setFilterSubsector('');
                }}
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="fas fa-undo mr-1"></i>
                Clear All Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-secondary">
          Showing {filteredData.filteredVulnerabilities.length} vulnerabilities with their related OFCs
          {paginatedData.totalPages > 1 && (
            <span className="ml-4">
              Page {currentPage} of {paginatedData.totalPages}
            </span>
          )}
        </div>
      </div>


      {/* Vulnerabilities with their OFCs */}
      <div className="space-y-6">
        {paginatedData.vulnerabilities.map((vulnerability) => (
          <div key={vulnerability.id} className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="card-title">
                  {vulnerability.discipline || 'Vulnerability'} - {vulnerability.sector || 'General'}
                </h2>
                <button
                  onClick={() => {
                    // Pre-fill the submission form with vulnerability context
                    const submissionUrl = `/submit?type=ofc&vulnerability_id=${vulnerability.id}&discipline=${encodeURIComponent(vulnerability.discipline || '')}&sector=${encodeURIComponent(vulnerability.sector || '')}`;
                    window.open(submissionUrl, '_blank');
                  }}
                  className="btn btn-sm btn-outline-primary"
                  title="Suggest an Option for Consideration for this vulnerability"
                >
                  <i className="fas fa-plus mr-1"></i>
                  Add OFC
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Vulnerability Details */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Vulnerability</h3>
                <p className="text-gray-700 mb-2">{vulnerability.vulnerability}</p>
                {vulnerability.source && (
                  <div className="text-sm text-gray-600">
                    <strong>Source:</strong>
                    <div dangerouslySetInnerHTML={{ __html: vulnerability.source }} />
                  </div>
                )}
              </div>

              {/* Related OFCs */}
              {vulnerability.relatedOFCs && vulnerability.relatedOFCs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Options for Consideration ({vulnerability.relatedOFCs.length})
                  </h3>
                  <div className="space-y-3">
                    {vulnerability.relatedOFCs.map((ofc) => (
                      <OFCCard
                        key={ofc.id}
                        ofc={ofc}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>


      {/* Pagination Controls */}
      {paginatedData.totalPages > 1 && (
        <div className="card">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <div className="text-sm text-secondary">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.filteredVulnerabilities.length)} of {filteredData.filteredVulnerabilities.length} vulnerabilities
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {paginatedData.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                  disabled={currentPage === paginatedData.totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="back-to-top"
          title="Back to top"
        >
          <i className="fas fa-arrow-up"></i>
        </button>
      )}
    </div>
  );
}

