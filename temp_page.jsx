'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from './lib/auth';
import { fetchVulnerabilities, fetchSectors, fetchSubsectorsBySector } from './lib/fetchVOFC';

// ISR: This page can be statically generated with revalidation
// Since it's client-side, we'll add metadata export for static optimization
export const metadata = {
  title: 'VOFC Viewer - Vulnerability Options for Consideration',
  description: 'Browse and search vulnerabilities and their corresponding options for consideration',
};

// Revalidate every hour (3600 seconds)
// Note: Since this is a client component, ISR happens at the API route level
export const revalidate = 3600;

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

  // Load sectors from sectors table via API route (bypasses RLS)
  const loadSectors = useCallback(async () => {
    try {
      console.log('[loadSectors] Starting to load sectors...');
      
      // Try API route first (uses admin client, bypasses RLS)
      // Use cached fetch for better performance
      const response = await fetch('/api/sectors', { 
        next: { revalidate: 3600 } // Cache for 1 hour
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sectors: ${response.statusText}`);
      }
      
      const { sectors: sectorsData } = await response.json();
      console.log(`[loadSectors] Fetched ${sectorsData?.length || 0} sectors from API`);
      
      if (sectorsData && sectorsData.length > 0) {
        setSectors(sectorsData);
        return sectorsData;
      }
      
      // Fallback: try direct Supabase query
      console.log('[loadSectors] API route returned no data, trying direct Supabase query...');
      const { data: directData, error: directError } = await fetchSectors();
      
      if (directError) {
        console.error('[loadSectors] Direct Supabase query failed:', directError);
        return [];
      }
      
      if (directData && directData.length > 0) {
        setSectors(directData);
        return directData;
      }
      
      console.warn('[loadSectors] No sectors found from either API route or direct query');
      return [];
    } catch (error) {
      console.error('[loadSectors] Error:', error);
      setError(`Failed to load sectors: ${error.message}`);
      return [];
    }
  }, []);

  // ... existing code ...
