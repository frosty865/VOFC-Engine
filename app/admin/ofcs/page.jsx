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
    effort_level: '',
    effectiveness_level: '',
    discipline: ''
  });
  const [disciplines, setDisciplines] = useState([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadOFCs();
    loadDisciplines();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      console.log('🔐 OFC Management - User role:', user.role);
      console.log('🔐 OFC Management - Full user:', user);
      
      // Check if user has admin access
      if (!['admin', 'spsa', 'psa', 'analyst'].includes(user.role)) {
        console.log('❌ OFC Management - Access denied for role:', user.role);
        router.push('/');
        return;
      }
      
      console.log('✅ OFC Management - Access granted for role:', user.role);
      setCurrentUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const loadOFCs = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading OFCs...');
      
      const response = await fetch('/api/admin/ofcs', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 OFCs loaded:', result);
      
      if (result.success) {
        setOfcs(result.data || []);
      } else {
        console.error('Failed to load OFCs:', result.error);
        // Fallback to direct Supabase call
        const { data, error } = await supabase
          .from('options_for_consideration')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase fallback error:', error);
        } else {
          setOfcs(data || []);
        }
      }
    } catch (error) {
      console.error('Error loading OFCs:', error);
      // Fallback to direct Supabase call
      try {
        const { data, error } = await supabase
          .from('options_for_consideration')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase fallback error:', error);
        } else {
          setOfcs(data || []);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDisciplines = async () => {
    try {
      const { data, error } = await supabase
        .from('disciplines')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading disciplines:', error);
      } else {
        setDisciplines(data || []);
      }
    } catch (error) {
      console.error('Error loading disciplines:', error);
    }
  };

  const handleEditOFC = (ofc) => {
    console.log('✏️ Editing OFC:', ofc);
    setEditingOFC(ofc);
    setEditFormData({
      id: ofc.id,
      option_text: ofc.option_text || '',
      effort_level: ofc.effort_level || '',
      effectiveness_level: ofc.effectiveness_level || '',
      discipline: ofc.discipline || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateOFC = async (e) => {
    e.preventDefault();
    try {
      console.log('💾 Updating OFC:', editFormData);
      
      const response = await fetch('/api/admin/ofcs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editFormData)
      });
      
      const result = await response.json();
      console.log('📝 Update response:', result);
      
      if (result.success) {
        alert('OFC updated successfully!');
        setShowEditForm(false);
        setEditingOFC(null);
        loadOFCs(); // Reload the list
      } else {
        console.error('Update failed:', result.error);
        alert('Failed to update OFC: ' + result.error);
        
        // Fallback to direct Supabase update
        const { error } = await supabase
          .from('options_for_consideration')
          .update({
            option_text: editFormData.option_text,
            effort_level: editFormData.effort_level,
            effectiveness_level: editFormData.effectiveness_level,
            discipline: editFormData.discipline
          })
          .eq('id', editFormData.id);
        
        if (error) {
          console.error('Supabase fallback error:', error);
          alert('Update failed: ' + error.message);
        } else {
          alert('OFC updated successfully (via fallback)!');
          setShowEditForm(false);
          setEditingOFC(null);
          loadOFCs();
        }
      }
    } catch (error) {
      console.error('Error updating OFC:', error);
      alert('Error updating OFC: ' + error.message);
    }
  };

  const handleDeleteOFC = async (id) => {
    if (!confirm('Are you sure you want to delete this OFC?')) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting OFC:', id);
      
      const response = await fetch('/api/admin/ofcs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id })
      });
      
      const result = await response.json();
      console.log('🗑️ Delete response:', result);
      
      if (result.success) {
        alert('OFC deleted successfully!');
        loadOFCs(); // Reload the list
      } else {
        console.error('Delete failed:', result.error);
        alert('Failed to delete OFC: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting OFC:', error);
      alert('Error deleting OFC: ' + error.message);
    }
  };

  const filteredOFCs = options_for_consideration.filter(ofc => {
    const matchesSearch = !searchTerm || 
      ofc.option_text?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiscipline = !filterDiscipline || ofc.discipline === filterDiscipline;
    const matchesEffort = !filterEffort || ofc.effort_level === filterEffort;
    const matchesEffectiveness = !filterEffectiveness || ofc.effectiveness_level === filterEffectiveness;
    
    return matchesSearch && matchesDiscipline && matchesEffort && matchesEffectiveness;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading OFCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">OFC Management</h1>
        <div className="text-sm text-gray-600">
          Logged in as: <span className="font-semibold">{currentUser?.name || 'Unknown'}</span>
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            {currentUser?.role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search OFCs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
            <select
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Disciplines</option>
              {disciplines.map(discipline => (
                <option key={discipline.id} value={discipline.name}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effort Level</label>
            <select
              value={filterEffort}
              onChange={(e) => setFilterEffort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Effort Levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effectiveness</label>
            <select
              value={filterEffectiveness}
              onChange={(e) => setFilterEffectiveness(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Effectiveness Levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setSearchTerm('');
            setFilterDiscipline('');
            setFilterEffort('');
            setFilterEffectiveness('');
          }}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Clear Filters
        </button>
      </div>

      {/* OFCs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            Options for Consideration ({filteredOFCs.length})
          </h2>
        </div>
        
        {filteredOFCs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No OFCs found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOFCs.map((ofc) => (
              <div key={ofc.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-gray-900 mb-2">{ofc.option_text}</p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {ofc.discipline && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {ofc.discipline}
                        </span>
                      )}
                      {ofc.effort_level && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          Effort: {ofc.effort_level}
                        </span>
                      )}
                      {ofc.effectiveness_level && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          Effectiveness: {ofc.effectiveness_level}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEditOFC(ofc)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOFC(ofc.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-semibold mb-4">Edit OFC</h3>
            <form onSubmit={handleUpdateOFC}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Text
                </label>
                <textarea
                  value={editFormData.option_text}
                  onChange={(e) => setEditFormData({...editFormData, option_text: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discipline
                  </label>
                  <select
                    value={editFormData.discipline}
                    onChange={(e) => setEditFormData({...editFormData, discipline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Discipline</option>
                    {disciplines.map(discipline => (
                      <option key={discipline.id} value={discipline.name}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effort Level
                  </label>
                  <select
                    value={editFormData.effort_level}
                    onChange={(e) => setEditFormData({...editFormData, effort_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Effort</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effectiveness Level
                  </label>
                  <select
                    value={editFormData.effectiveness_level}
                    onChange={(e) => setEditFormData({...editFormData, effectiveness_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Effectiveness</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingOFC(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update OFC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}