const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Complete DHS Critical Infrastructure Sectors and Subsectors
const dhsSectorsAndSubsectors = {
  "Chemical": [
    "Chemical Manufacturing",
    "Chemical Storage", 
    "Chemical Transportation",
    "Chemical Distribution",
    "Chemical Supply Chain"
  ],
  "Commercial Facilities": [
    "Lodging",
    "Public Assembly",
    "Retail",
    "Gaming and Entertainment",
    "Religious Facilities",
    "Sports Leagues",
    "Real Estate",
    "Outdoor Events"
  ],
  "Communications": [
    "Wireline",
    "Wireless",
    "Satellite",
    "Cable",
    "Broadcasting",
    "Internet Service Providers",
    "Voice over Internet Protocol"
  ],
  "Critical Manufacturing": [
    "Primary Metals Manufacturing",
    "Machinery Manufacturing", 
    "Electrical Equipment Manufacturing",
    "Transportation Equipment Manufacturing",
    "Appliance Manufacturing",
    "Component Manufacturing"
  ],
  "Dams": [
    "Hydroelectric Power Generation",
    "Navigation Locks",
    "Levees",
    "Flood Control Systems",
    "Water Storage",
    "Irrigation Systems"
  ],
  "Defense Industrial Base": [
    "Aerospace",
    "Weapons",
    "Ammunition and Explosives",
    "Military Vehicles",
    "Ships",
    "Radar and Navigation",
    "Military Communications",
    "Missiles and Space Systems",
    "Military Electronics",
    "Military Optics",
    "Military Software",
    "Military Research and Development"
  ],
  "Emergency Services": [
    "Law Enforcement",
    "Fire and Emergency Services",
    "Emergency Medical Services",
    "Emergency Management",
    "Public Works",
    "Search and Rescue"
  ],
  "Energy": [
    "Electric Power",
    "Petroleum",
    "Natural Gas",
    "Nuclear",
    "Renewable Energy",
    "Coal",
    "Energy Storage"
  ],
  "Financial Services": [
    "Banking",
    "Securities and Investments",
    "Insurance",
    "Credit Unions",
    "Savings Associations",
    "Non-Depository Credit Intermediation",
    "Financial Market Utilities"
  ],
  "Food and Agriculture": [
    "Food Production",
    "Food Processing",
    "Food Distribution",
    "Agricultural Production",
    "Agricultural Processing",
    "Agricultural Distribution",
    "Agricultural Inputs"
  ],
  "Government Facilities": [
    "Federal Facilities",
    "State Facilities", 
    "Local Facilities",
    "Tribal Facilities",
    "Educational Facilities",
    "Election Infrastructure",
    "Correctional Facilities"
  ],
  "Healthcare and Public Health": [
    "Hospitals",
    "Ambulatory Care",
    "Home Healthcare",
    "Long-term Care",
    "Medical Devices",
    "Pharmaceuticals",
    "Blood",
    "Laboratories",
    "Medical Research"
  ],
  "Information Technology": [
    "IT Hardware",
    "IT Software",
    "IT Services",
    "Cloud Computing",
    "Data Centers",
    "IT Support Services",
    "IT Training"
  ],
  "Nuclear Reactors, Materials, and Waste": [
    "Nuclear Power Plants",
    "Research Reactors",
    "Nuclear Materials",
    "Nuclear Waste",
    "Nuclear Fuel Cycle",
    "Nuclear Security"
  ],
  "Transportation Systems": [
    "Aviation",
    "Highway Infrastructure",
    "Maritime Transportation",
    "Mass Transit",
    "Pipeline Systems",
    "Rail Transportation",
    "Freight Rail",
    "Postal and Shipping"
  ],
  "Water and Wastewater Systems": [
    "Drinking Water",
    "Wastewater Treatment",
    "Water Storage",
    "Water Distribution",
    "Water Treatment",
    "Stormwater Management"
  ]
};

async function populateAllSubsectors() {
  console.log('Populating database with all DHS subsectors...\n');

  try {
    // First, get all existing sectors
    const { data: existingSectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*');

    if (sectorsError) {
      console.error('Error fetching existing sectors:', sectorsError);
      return;
    }

    console.log(`Found ${existingSectors.length} existing sectors`);

    // Create a mapping of sector names to IDs
    const sectorMap = {};
    existingSectors.forEach(sector => {
      sectorMap[sector.sector_name] = sector.id;
    });

    // Clear existing subsectors
    console.log('Clearing existing subsectors...');
    const { error: deleteError } = await supabase
      .from('subsectors')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      console.error('Error clearing subsectors:', deleteError);
      return;
    }

    // Insert all subsectors
    let totalInserted = 0;
    for (const [sectorName, subsectorNames] of Object.entries(dhsSectorsAndSubsectors)) {
      const sectorId = sectorMap[sectorName];
      
      if (!sectorId) {
        console.log(`⚠️  Sector "${sectorName}" not found in database, skipping...`);
        continue;
      }

      console.log(`\nProcessing ${sectorName} (ID: ${sectorId})...`);
      
      for (const subsectorName of subsectorNames) {
        const subsectorData = {
          subsector_name: subsectorName,
          sector_id: sectorId,
          description: `Subsector within the ${sectorName} critical infrastructure sector.`,
          source: "DHS CISA – Critical Infrastructure Sectors and Subsectors (2024)",
          is_cross_sector: false,
          is_active: true
        };

        const { error: insertError } = await supabase
          .from('subsectors')
          .insert(subsectorData);

        if (insertError) {
          console.error(`Error inserting subsector "${subsectorName}":`, insertError);
        } else {
          totalInserted++;
          console.log(`  ✅ ${subsectorName}`);
        }
      }
    }

    console.log(`\n🎉 Successfully inserted ${totalInserted} subsectors!`);

    // Verify the results
    const { data: finalSubsectors, error: verifyError } = await supabase
      .from('subsectors')
      .select(`
        *,
        sectors (
          sector_name
        )
      `)
      .order('sectors.sector_name, subsector_name');

    if (!verifyError) {
      console.log(`\nFinal count: ${finalSubsectors.length} subsectors`);
      
      // Group by sector for display
      const groupedBySector = {};
      finalSubsectors.forEach(subsector => {
        const sectorName = subsector.sectors.sector_name;
        if (!groupedBySector[sectorName]) {
          groupedBySector[sectorName] = [];
        }
        groupedBySector[sectorName].push(subsector.subsector_name);
      });

      console.log('\nSubsectors by Sector:');
      Object.entries(groupedBySector).forEach(([sector, subsectors]) => {
        console.log(`\n${sector} (${subsectors.length} subsectors):`);
        subsectors.forEach(subsector => {
          console.log(`  - ${subsector}`);
        });
      });
    }

  } catch (error) {
    console.error('Error populating subsectors:', error);
  }
}

populateAllSubsectors();


