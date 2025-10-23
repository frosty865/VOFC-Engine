'use client';
// Admin OFC Management Page
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { supabase } from '../../lib/supabaseClient';

export default function OFCManagement() {
  const [options_for_consideration, setOfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOFC, setEditingOFC] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterEffort, setFilterEffort] = useState('');
  const [filterEffectiveness, setFilterEffectiveness] = useState('');
  const [editFormData, setEditFormData] = useState({
    id: '',
    option_text: '',
    discipline: '',
    source: '',
    id: '',
    id: ''
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadOFCs();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/splash');
        return;
      }

      setCurrentUser(user);
      console.log('🔐 OFC Management - User role:', user.role);
      console.log('🔐 OFC Management - Full user:', user);

      // Allow admin, spsa, and analyst to manage OFCs (same as main admin page)
      if (!(user.role === 'admin' || user.role === 'spsa' || user.role === 'analyst')) {
        console.log('❌ OFC Management - Access denied for role:', user.role);
        router.push('/');
        return;
      }
      
      console.log('✅ OFC Management - Access granted for role:', user.role);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/splash');
    }
  };

  const loadOFCs = async () => {
    try {
      setLoading(true);
      // Load OFCs with their sources
      const { data, error } = await supabase
        .from('options_for_consideration')
        .select(`
          *,
          ofc_sources (
            sources (
              "reference number",
              authors,
              title,
              publication,
              year,
              formatted_citation,
              short_citation
            )
          )
        `)
        .order('option_text');

      if (error) throw error;
      setOfcs(data || []);
    } catch (error) {
      console.error('Error loading OFCs:', error);
      alert('Error loading OFCs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOFC = (ofc) => {
    setEditingOFC(ofc);
    setEditFormData({
      id: ofc.id,
      option_text: ofc.option_text || '',
      discipline: ofc.discipline || '',
      source: ofc.source || '',
      id: ofc.id || '',
      id: ofc.id || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateOFC = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('options_for_consideration')
        .update({
          option_text: editFormData.option_text,
          discipline: editFormData.discipline,
          source: editFormData.source,
          id: editFormData.id,
          id: editFormData.id
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      alert('OFC updated successfully!');
      setShowEditForm(false);
      setEditingOFC(null);
      loadOFCs();
    } catch (error) {
      console.error('Error updating OFC:', error);
      alert('Error updating OFC: ' + error.message);
    }
  };

  const handleDeleteOFC = async (ofcId) => {
    if (!confirm('Are you sure you want to delete this OFC? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('options_for_consideration')
        .delete()
        .eq('id', ofcId);

      if (error) throw error;

      alert('OFC deleted successfully!');
      loadOFCs();
    } catch (error) {
      console.error('Error deleting OFC:', error);
      alert('Error deleting OFC: ' + error.message);
    }
  };

  const filteredOFCs = options_for_consideration.filter(ofc => {
    const matchesSearch = ofc.option_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ofc.discipline?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiscipline = !filterDiscipline || ofc.discipline === filterDiscipline;
    
    return matchesSearch && matchesDiscipline;
  });

  const getDisciplines = () => {
    const disciplines = [...new Set(options_for_consideration.map(ofc => ofc.discipline).filter(Boolean))];
    return disciplines.sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--cisa-gray-light)' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--cisa-blue)' }}></div>
            <p className="mt-4" style={{ color: 'var(--cisa-gray-dark)' }}>Loading OFCs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cisa-gray-light)' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--cisa-gray-dark)' }}>
                <i className="fas fa-lightbulb mr-3" style={{ color: 'var(--cisa-blue)' }}></i>
                OFC Management
              </h1>
              <p className="text-lg" style={{ color: 'var(--cisa-gray-medium)' }}>
                Manage and edit Options for Consideration
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: 'var(--cisa-gray-medium)' }}>
                {filteredOFCs.length} of {options_for_consideration.length} OFCs
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--cisa-gray-light)' }}>
                Total Records
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card">
            <div className="card-body">
              <h3 className="card-title mb-4">
                <i className="fas fa-search mr-2"></i>
                Search & Filter
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Search OFCs</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by text or discipline..."
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Filter by Discipline</label>
                  <select
                    value={filterDiscipline}
                    onChange={(e) => setFilterDiscipline(e.target.value)}
                    className="form-control"
                  >
                    <option value="">All Disciplines</option>
                    {getDisciplines().map(discipline => (
                      <option key={discipline} value={discipline}>{discipline}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OFCs List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOFCs.map((ofc) => (
            <div key={ofc.id} className="card hover:shadow-lg transition-all duration-300">
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="card-title text-lg mb-3 line-clamp-3" style={{ 
                      color: 'var(--cisa-gray-dark)',
                      lineHeight: '1.4'
                    }}>
                      {ofc.option_text}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ofc.discipline && (
                        <span className="badge badge-primary">
                          <i className="fas fa-tag mr-1"></i>
                          {ofc.discipline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm mb-3">
                  <strong><i className="fas fa-book mr-1"></i>Sources:</strong>
                  {ofc.sources ? (
                    <div className="mt-2 p-2 rounded border-l-2" style={{ 
                      backgroundColor: 'var(--cisa-gray-light)',
                      borderColor: 'var(--cisa-blue)',
                      color: 'var(--cisa-gray-dark)'
                    }}>
                      <div className="font-medium text-blue-800">
                        {ofc.sources.short_citation || ofc.sources.authors || 'Unknown Source'}
                      </div>
                      {ofc.sources.authors && (
                        <div className="text-xs text-gray-600">
                          Author: {ofc.sources.authors}
                        </div>
                      )}
                      {ofc.sources.publication && (
                        <div className="text-xs text-gray-600">
                          Publication: {ofc.sources.publication}
                        </div>
                      )}
                      {ofc.sources.year && (
                        <div className="text-xs text-gray-600">
                          Year: {ofc.sources.year}
                        </div>
                      )}
                      {ofc.sources.formatted_citation && (
                        <div className="text-xs text-gray-700 italic mt-1">
                          {ofc.sources.formatted_citation}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 p-2 rounded" style={{ 
                      backgroundColor: 'var(--cisa-gray-light)',
                      color: 'var(--cisa-gray-medium)',
                      fontStyle: 'italic'
                    }}>
                      No sources specified
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--cisa-gray-light)' }}>
                  <button
                    onClick={() => handleEditOFC(ofc)}
                    className="btn btn-primary flex-1"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteOFC(ofc.id)}
                    className="btn btn-danger"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOFCs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4" style={{ color: 'var(--cisa-gray-light)' }}>
              <i className="fas fa-search"></i>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--cisa-gray-dark)' }}>
              No OFCs found
            </h3>
            <p style={{ color: 'var(--cisa-gray-medium)' }}>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Edit OFC Modal */}
      {showEditForm && editingOFC && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto" style={{ borderLeft: '3px solid var(--cisa-blue)' }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--cisa-gray-light)' }}>
                <h3 className="text-xl font-bold" style={{ color: 'var(--cisa-gray-dark)' }}>
                  <i className="fas fa-edit mr-2" style={{ color: 'var(--cisa-blue)' }}></i>
                  Edit OFC
                </h3>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingOFC(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleUpdateOFC} className="space-y-6">
                {/* Basic Information */}
                <div className="card">
                  <div className="card-body">
                    <h4 className="card-title mb-4">
                      <i className="fas fa-info-circle mr-2" style={{ color: 'var(--cisa-blue)' }}></i>
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      <div className="form-group">
                        <label className="form-label">OFC Text *</label>
                        <textarea
                          value={editFormData.option_text}
                          onChange={(e) => setEditFormData({...editFormData, option_text: e.target.value})}
                          className="form-control"
                          rows="4"
                          required
                          placeholder="Enter the option for consideration text..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label">Discipline</label>
                          <input
                            type="text"
                            value={editFormData.discipline}
                            onChange={(e) => setEditFormData({...editFormData, discipline: e.target.value})}
                            className="form-control"
                            placeholder="e.g., Security Management"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Source</label>
                          <input
                            type="text"
                            value={editFormData.source}
                            onChange={(e) => setEditFormData({...editFormData, source: e.target.value})}
                            className="form-control"
                            placeholder="e.g., CISA Guidelines"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="card">
                  <div className="card-body">
                    <h4 className="card-title mb-4">
                      <i className="fas fa-cogs mr-2" style={{ color: 'var(--cisa-blue)' }}></i>
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">Sector ID</label>
                        <input
                          type="text"
                          value={editFormData.id}
                          onChange={(e) => setEditFormData({...editFormData, id: e.target.value})}
                          className="form-control"
                          placeholder="e.g., 1"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subsector ID</label>
                        <input
                          type="text"
                          value={editFormData.id}
                          onChange={(e) => setEditFormData({...editFormData, id: e.target.value})}
                          className="form-control"
                          placeholder="e.g., 5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t" style={{ borderColor: 'var(--cisa-gray-light)' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary flex-1"
                  >
                    <i className="fas fa-save mr-2"></i>
                    Update OFC
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingOFC(null);
                    }}
                    className="btn btn-secondary"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
