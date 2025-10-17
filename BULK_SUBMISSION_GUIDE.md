# Bulk CSV Submission Guide

## Overview
The Bulk CSV Submission feature allows users to upload multiple vulnerabilities and options for consideration (OFCs) at once using a CSV format.

## How to Use

### 1. Download the Template
- Click the "Download Template" button on the bulk submission page
- This provides a properly formatted CSV template with examples

### 2. Fill in Your Data
Follow the template structure with these required fields:

#### Required Fields:
- **Category**: The type of security area (e.g., Physical Security, Physical Security Systems, Cybersecurity)
- **Vulnerability**: Description of the security vulnerability
- **Options for Consideration**: Recommended actions to address the vulnerability

#### Category Definitions:
- **Physical Security**: Traditional physical security measures (fencing, lighting, guards)
- **Physical Security Systems**: Electronic, mechanical, and AI-powered security systems (access control, video analytics, sensors, UAS detection, authorized Counter-UAS technologies)
- **Cybersecurity**: Information technology security measures
- **Personnel Security**: Human resource security measures
- **Operational Security**: Day-to-day security operations
- **Information Security**: Data and information protection
- **Facility Information**: Building and infrastructure security
- **Emergency Management**: Emergency response and preparedness
- **Risk Management**: Risk assessment and mitigation
- **Compliance**: Regulatory and standards compliance
- **Training and Awareness**: Security education and awareness programs

#### Optional Fields:
- **Sources**: Proper citations, web pages, and references for the recommendations

#### Source Citation Formats:
- **Government Documents**: "DHS CISA, 2024, Counter-UAS Guidelines, https://www.cisa.gov/counter-uas"
- **Standards**: "NIST SP 800-63B, 2023, Digital Identity Guidelines, https://pages.nist.gov/800-63-3/"
- **Industry Standards**: "ASIS International, 2022, Physical Security Standards, https://www.asisonline.org/standards"
- **Web Pages**: "FAA, 2024, Counter-UAS Regulations, https://www.faa.gov/uas/counter-uas"
- **Research Papers**: "Smith, J., 2023, Security Best Practices, Journal of Security, Vol. 15, pp. 123-145"
- **Books**: "Johnson, A., 2022, Physical Security Handbook, 3rd Edition, Security Press"

#### Legal Considerations for Counter-UAS Technologies:
- **Authorized Systems Only**: Only recommend legally authorized counter-UAS systems with proper licensing
- **Avoid Illegal Measures**: Do not recommend RF jamming, signal interference, or other illegal countermeasures
- **Legal Alternatives**: Focus on detection, tracking, identification, and authorized mitigation systems
- **Regulatory Compliance**: Ensure all recommendations comply with FAA, FCC, and local regulations

#### Automatic Assignments:
The system automatically assigns these fields based on your Category:
- **Discipline**: Set to your Category value
- **Sector/Subsector**: Mapped based on Category (e.g., "Physical Security" → "Commercial Facilities" sector, "Physical Security" subsector)
- **Record ID**: Generated when submissions are approved

### 3. CSV Format Requirements

#### Headers (First Row):
```
Category,Vulnerability,"Options for Consideration",Sources
```

#### Data Rows:
```
Physical Security,"The facility lacks perimeter fencing.","Install appropriate fencing with controlled access points.","DHS Guidelines"
```

#### Important Notes:
- Use quotes around fields that contain commas
- Minimum 10 characters for Vulnerability and Options for Consideration
- Each row creates both a vulnerability and an OFC submission

### 4. Common Categories
- Physical Security
- Cybersecurity  
- Personnel Security
- Operational Security
- Information Security
- Facility Information
- Emergency Management
- Risk Management
- Compliance
- Training and Awareness

### 5. Validation
The system will validate your data and show any errors before submission:
- Missing required fields
- Content too short
- Format issues

### 6. Preview and Submit
- Use "Preview Data" to check your entries
- Fix any validation errors
- Click "Submit All" when ready

## Example CSV Data

```csv
Category,Vulnerability,"Options for Consideration",Sources
Physical Security,"The facility does not have adequate perimeter fencing.","Install appropriate perimeter fencing with controlled access points.","DHS Physical Security Guidelines"
Cybersecurity,"The facility lacks multi-factor authentication.","Implement multi-factor authentication for all critical systems.","NIST Cybersecurity Framework"
Personnel Security,"Background checks are not conducted on all personnel.","Establish comprehensive background check program for all personnel.","ASIS Personnel Security Standards"
```

## Tips for Success

1. **Use the Template**: Always start with the provided template
2. **Check Formatting**: Ensure proper CSV formatting with quotes around fields containing commas
3. **Validate Content**: Make sure each vulnerability and OFC is at least 10 characters
4. **Preview First**: Always preview your data before submitting
5. **Save Your Work**: Keep a backup of your CSV file

## Troubleshooting

### Common Issues:
- **Missing quotes**: Fields with commas must be quoted
- **Short content**: Vulnerability and OFC descriptions must be at least 10 characters
- **Missing fields**: All three required fields must be present
- **Invalid characters**: Avoid special characters that might break CSV parsing

### Getting Help:
- Use the preview function to identify specific errors
- Check the validation messages for guidance
- Refer to the template for proper formatting examples
