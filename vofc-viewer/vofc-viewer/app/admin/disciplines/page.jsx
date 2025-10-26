'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';

export default function DisciplineManagement() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    is_active: true
  });
  const router = useRouter();

  const categories = ['Physical', 'Cyber', 'Converged', 'General'];

  useEffect(() => {
    checkAuth();
    loadDisciplines();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/splash');
        return;
      }

      setCurrentUser(user);

      // Allow admin and spsa to manage disciplines
      if (!['admin', 'spsa'].includes(user.role)) {
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/splash');
    }
  };

  const loadDisciplines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/disciplines');
      const result = await response.json();
      
      if (result.success) {
        setDisciplines(result.disciplines);
      } else {
        console.error('Error loading disciplines:', result.error);
      }
    } catch (error) {
      console.error('Error loading disciplines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingDiscipline 
        ? `/api/disciplines/${editingDiscipline.id}`
        : '/api/disciplines';
      
      const method = editingDiscipline ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowAddForm(false);
        setEditingDiscipline(null);
        setFormData({ name: '', description: '', category: 'General', is_active: true });
        loadDisciplines();
      } else {
        console.error('Error saving discipline:', result.error);
        alert('Error saving discipline: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving discipline:', error);
      alert('Error saving discipline');
    }
  };

  const handleEdit = (discipline) => {
    setEditingDiscipline(discipline);
    setFormData({
      name: discipline.name,
      description: discipline.description || '',
      category: discipline.category,
      is_active: discipline.is_active
    });
    setShowAddForm(true);
  };

  const handleDelete = async (disciplineId) => {
    if (!confirm('Are you sure you want to delete this discipline?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/disciplines/${disciplineId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadDisciplines();
      } else {
        console.error('Error deleting discipline:', result.error);
        alert('Error deleting discipline: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting discipline:', error);
      alert('Error deleting discipline');
    }
  };

  const filteredDisciplines = disciplines.filter(discipline => {
    const matchesSearch = discipline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (discipline.description && discipline.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !filterCategory || discipline.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="text-center py-8">Loading disciplines...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Discipline Management</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              Add Discipline
            </button>
          </div>
          
          <div className="card-body">
            {/* Filters */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Search Disciplines</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or description..."
                    className="form-input"
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Filter by Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Disciplines Table */}
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisciplines.map((discipline) => (
                    <tr key={discipline.id}>
                      <td>
                        <strong>{discipline.name}</strong>
                      </td>
                      <td>{discipline.description || 'No description'}</td>
                      <td>
                        <span className={`badge ${
                          discipline.category === 'Physical' ? 'bg-blue-100 text-blue-800' :
                          discipline.category === 'Cyber' ? 'bg-green-100 text-green-800' :
                          discipline.category === 'Converged' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {discipline.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          discipline.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {discipline.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleEdit(discipline)}
                          className="btn btn-sm btn-secondary mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(discipline.id)}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDisciplines.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No disciplines found matching your criteria.
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>{editingDiscipline ? 'Edit Discipline' : 'Add New Discipline'}</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDiscipline(null);
                    setFormData({ name: '', description: '', category: 'General', is_active: true });
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="form-select"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
                
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingDiscipline(null);
                      setFormData({ name: '', description: '', category: 'General', is_active: true });
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingDiscipline ? 'Update' : 'Add'} Discipline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
