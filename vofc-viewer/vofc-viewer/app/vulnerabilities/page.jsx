'use client';
import { useEffect, useState } from 'react';
import { fetchVulnerabilities } from '../lib/fetchVOFC';
import DomainFilter from '../components/DomainFilter';

export default function VulnerabilityViewer() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);

  useEffect(() => {
    loadVulnerabilities();
  }, []);

  useEffect(() => {
    filterVulnerabilities();
  }, [vulnerabilities, searchTerm, selectedDomains]);

  const loadVulnerabilities = async () => {
    try {
      const data = await fetchVulnerabilities();
      setVulnerabilities(data);
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVulnerabilities = () => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(v => 
        (v.vulnerability && v.vulnerability.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.discipline && v.discipline.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply domain filtering
    if (selectedDomains.length > 0 && selectedDomains.length < 3) {
      filtered = filtered.filter(v => selectedDomains.includes(v.domain));
    }

    setFilteredVulnerabilities(filtered);
  };

  if (loading) {
    return <div className="text-center py-8">Loading vulnerabilities...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="card mb-6">
        <div className="card-header">
          <h1 className="card-title">Vulnerability Viewer</h1>
        </div>
        
        <div className="row">
          <div className="col-md-3">
            <div className="form-group">
              <label htmlFor="search" className="form-label">
                Search Vulnerabilities
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vulnerability name or description..."
                className="form-input"
              />
            </div>
          </div>
          
        </div>

        {/* Domain Filter */}
        <div className="mt-4">
          <DomainFilter 
            selectedDomains={selectedDomains}
            onDomainChange={setSelectedDomains}
          />
        </div>

        <div className="text-sm text-secondary">
          Showing {filteredVulnerabilities.length} of {vulnerabilities.length} vulnerabilities
        </div>
      </div>

      <div className="space-y-4">
        {filteredVulnerabilities.map((vulnerability) => (
          <div key={vulnerability.id} className="question-item">
            <div className="flex justify-between items-start mb-2">
              <h4>
                {vulnerability.discipline || 'Vulnerability'}
              </h4>
              <span className="badge bg-primary text-white">
                {vulnerability.sector || 'General'}
              </span>
            </div>
            
            <p className="text-secondary mb-2">{vulnerability.vulnerability}</p>
            
            {vulnerability.source && (
              <div className="text-sm text-secondary">
                <strong>Source:</strong> 
                <div dangerouslySetInnerHTML={{ __html: vulnerability.source }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

