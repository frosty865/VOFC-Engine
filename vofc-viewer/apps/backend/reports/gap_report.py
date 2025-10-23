"""
Gap Reporter for VOFC Engine
Identifies vulnerabilities without OFCs and generates priority reports
"""

import json
import csv
from typing import List, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

class GapReporter:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.reports_dir = Path("apps/backend/data/reports")
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Sector priorities (higher number = higher priority)
        self.sector_priorities = {
            "Critical Infrastructure": 10,
            "Healthcare": 9,
            "Energy": 8,
            "Transportation": 7,
            "Education": 6,
            "Financial": 5,
            "Government": 4,
            "Security": 3,
            "Other": 1
        }
    
    def generate_gap_report(self, sector_filter: str = None, output_format: str = "json") -> Dict[str, Any]:
        """Generate a comprehensive gap report"""
        print(f"Generating gap report for sector: {sector_filter or 'All'}")
        
        if not self.supabase:
            print("Supabase client not available for gap reporting")
            return {"error": "Supabase client not available"}
        
        try:
            # Get gap data
            gap_data = self._get_gap_data(sector_filter)
            
            # Analyze gaps
            analysis = self._analyze_gaps(gap_data)
            
            # Generate report
            report = {
                "report_metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "sector_filter": sector_filter,
                    "total_vulnerabilities": len(gap_data),
                    "vulnerabilities_without_ofcs": len([v for v in gap_data if not v["has_ofcs"]]),
                    "vulnerabilities_with_ofcs": len([v for v in gap_data if v["has_ofcs"]])
                },
                "gap_analysis": analysis,
                "vulnerabilities": gap_data
            }
            
            # Save report
            if output_format == "json":
                self._save_json_report(report)
            elif output_format == "csv":
                self._save_csv_report(gap_data)
            
            return report
            
        except Exception as e:
            print(f"Error generating gap report: {e}")
            return {"error": str(e)}
    
    def _get_gap_data(self, sector_filter: str = None) -> List[Dict[str, Any]]:
        """Get vulnerability data with OFC counts"""
        try:
            # Use the Supabase function if available
            if sector_filter:
                result = self.supabase.rpc('get_gap_report', {'sector_filter': sector_filter}).execute()
            else:
                result = self.supabase.rpc('get_gap_report', {'sector_filter': None}).execute()
            
            return result.data
            
        except Exception as e:
            print(f"Error calling get_gap_report function: {e}")
            # Fallback to manual query
            return self._manual_gap_query(sector_filter)
    
    def _manual_gap_query(self, sector_filter: str = None) -> List[Dict[str, Any]]:
        """Manual gap query as fallback"""
        try:
            # Get vulnerabilities
            vuln_query = self.supabase.table("vulnerabilities").select("*")
            if sector_filter:
                vuln_query = vuln_query.eq("sector", sector_filter)
            
            vulnerabilities = vuln_query.execute().data
            
            # Get OFC links
            ofc_links = self.supabase.table("vulnerability_ofc_links").select("*").execute().data
            
            # Create lookup for OFC counts
            ofc_counts = {}
            for link in ofc_links:
                vuln_id = link["vulnerability_id"]
                ofc_counts[vuln_id] = ofc_counts.get(vuln_id, 0) + 1
            
            # Build gap data
            gap_data = []
            for vuln in vulnerabilities:
                vuln_id = vuln["id"]
                ofc_count = ofc_counts.get(vuln_id, 0)
                
                gap_data.append({
                    "vulnerability_id": vuln_id,
                    "vulnerability_text": vuln["vulnerability"],
                    "sector": vuln.get("sector"),
                    "subsector": vuln.get("subsector"),
                    "has_ofcs": ofc_count > 0,
                    "ofc_count": ofc_count
                })
            
            return gap_data
            
        except Exception as e:
            print(f"Error in manual gap query: {e}")
            return []
    
    def _analyze_gaps(self, gap_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze gap data to identify patterns and priorities"""
        analysis = {
            "by_sector": {},
            "by_subsector": {},
            "priority_vulnerabilities": [],
            "statistics": {
                "total_vulnerabilities": len(gap_data),
                "vulnerabilities_without_ofcs": 0,
                "vulnerabilities_with_ofcs": 0,
                "average_ofcs_per_vulnerability": 0
            }
        }
        
        # Calculate statistics
        total_ofcs = 0
        for vuln in gap_data:
            if vuln["has_ofcs"]:
                analysis["statistics"]["vulnerabilities_with_ofcs"] += 1
                total_ofcs += vuln["ofc_count"]
            else:
                analysis["statistics"]["vulnerabilities_without_ofcs"] += 1
        
        if analysis["statistics"]["vulnerabilities_with_ofcs"] > 0:
            analysis["statistics"]["average_ofcs_per_vulnerability"] = total_ofcs / analysis["statistics"]["vulnerabilities_with_ofcs"]
        
        # Analyze by sector
        sector_gaps = {}
        for vuln in gap_data:
            sector = vuln.get("sector", "Unknown")
            if sector not in sector_gaps:
                sector_gaps[sector] = {"total": 0, "without_ofcs": 0, "with_ofcs": 0}
            
            sector_gaps[sector]["total"] += 1
            if vuln["has_ofcs"]:
                sector_gaps[sector]["with_ofcs"] += 1
            else:
                sector_gaps[sector]["without_ofcs"] += 1
        
        # Calculate sector priorities
        for sector, data in sector_gaps.items():
            priority = self.sector_priorities.get(sector, 1)
            gap_percentage = (data["without_ofcs"] / data["total"]) * 100 if data["total"] > 0 else 0
            
            analysis["by_sector"][sector] = {
                "total_vulnerabilities": data["total"],
                "without_ofcs": data["without_ofcs"],
                "with_ofcs": data["with_ofcs"],
                "gap_percentage": gap_percentage,
                "priority_score": priority * (1 + gap_percentage / 100),  # Higher gap = higher priority
                "priority_level": self._get_priority_level(gap_percentage, priority)
            }
        
        # Analyze by subsector
        subsector_gaps = {}
        for vuln in gap_data:
            subsector = vuln.get("subsector", "Unknown")
            if subsector not in subsector_gaps:
                subsector_gaps[subsector] = {"total": 0, "without_ofcs": 0}
            
            subsector_gaps[subsector]["total"] += 1
            if not vuln["has_ofcs"]:
                subsector_gaps[subsector]["without_ofcs"] += 1
        
        for subsector, data in subsector_gaps.items():
            gap_percentage = (data["without_ofcs"] / data["total"]) * 100 if data["total"] > 0 else 0
            analysis["by_subsector"][subsector] = {
                "total_vulnerabilities": data["total"],
                "without_ofcs": data["without_ofcs"],
                "gap_percentage": gap_percentage
            }
        
        # Identify priority vulnerabilities
        priority_vulns = []
        for vuln in gap_data:
            if not vuln["has_ofcs"]:
                sector = vuln.get("sector", "Unknown")
                priority = self.sector_priorities.get(sector, 1)
                gap_percentage = analysis["by_sector"].get(sector, {}).get("gap_percentage", 0)
                
                priority_vulns.append({
                    "vulnerability_id": vuln["vulnerability_id"],
                    "vulnerability_text": vuln["vulnerability_text"],
                    "sector": sector,
                    "subsector": vuln.get("subsector"),
                    "priority_score": priority * (1 + gap_percentage / 100),
                    "gap_reason": f"No OFCs found for {sector} vulnerability"
                })
        
        # Sort by priority score
        priority_vulns.sort(key=lambda x: x["priority_score"], reverse=True)
        analysis["priority_vulnerabilities"] = priority_vulns[:20]  # Top 20
        
        return analysis
    
    def _get_priority_level(self, gap_percentage: float, sector_priority: int) -> str:
        """Determine priority level based on gap percentage and sector priority"""
        if gap_percentage > 80 or sector_priority >= 8:
            return "Critical"
        elif gap_percentage > 60 or sector_priority >= 6:
            return "High"
        elif gap_percentage > 40 or sector_priority >= 4:
            return "Medium"
        else:
            return "Low"
    
    def _save_json_report(self, report: Dict[str, Any]) -> str:
        """Save report as JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gap_report_{timestamp}.json"
        filepath = self.reports_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"JSON report saved to: {filepath}")
        return str(filepath)
    
    def _save_csv_report(self, gap_data: List[Dict[str, Any]]) -> str:
        """Save report as CSV file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gap_report_{timestamp}.csv"
        filepath = self.reports_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            if gap_data:
                writer = csv.DictWriter(f, fieldnames=gap_data[0].keys())
                writer.writeheader()
                writer.writerows(gap_data)
        
        print(f"CSV report saved to: {filepath}")
        return str(filepath)
    
    def get_sector_priority_report(self) -> Dict[str, Any]:
        """Get a focused report on sector priorities"""
        if not self.supabase:
            return {"error": "Supabase client not available"}
        
        try:
            # Get all sectors with gap data
            all_sectors = self.supabase.table("vulnerabilities").select("sector").execute().data
            sectors = list(set([v["sector"] for v in all_sectors if v["sector"]]))
            
            sector_reports = {}
            for sector in sectors:
                report = self.generate_gap_report(sector_filter=sector)
                if "error" not in report:
                    sector_reports[sector] = report["gap_analysis"]["by_sector"].get(sector, {})
            
            # Sort by priority score
            sorted_sectors = sorted(
                sector_reports.items(),
                key=lambda x: x[1].get("priority_score", 0),
                reverse=True
            )
            
            return {
                "sector_priorities": dict(sorted_sectors),
                "recommendations": self._generate_recommendations(sorted_sectors)
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def _generate_recommendations(self, sorted_sectors: List[Tuple[str, Dict]]) -> List[str]:
        """Generate recommendations based on sector priorities"""
        recommendations = []
        
        for sector, data in sorted_sectors[:5]:  # Top 5 sectors
            gap_percentage = data.get("gap_percentage", 0)
            priority_level = data.get("priority_level", "Low")
            
            if priority_level == "Critical":
                recommendations.append(f"URGENT: {sector} has {gap_percentage:.1f}% gap - immediate attention required")
            elif priority_level == "High":
                recommendations.append(f"HIGH PRIORITY: {sector} needs {gap_percentage:.1f}% gap reduction")
            elif priority_level == "Medium":
                recommendations.append(f"MEDIUM PRIORITY: {sector} could benefit from gap reduction")
        
        return recommendations
    
    def generate_weekly_report(self) -> Dict[str, Any]:
        """Generate a weekly summary report"""
        print("Generating weekly gap report...")
        
        # Generate full report
        full_report = self.generate_gap_report()
        
        if "error" in full_report:
            return full_report
        
        # Create weekly summary
        weekly_summary = {
            "report_type": "weekly_summary",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_vulnerabilities": full_report["report_metadata"]["total_vulnerabilities"],
                "vulnerabilities_without_ofcs": full_report["report_metadata"]["vulnerabilities_without_ofcs"],
                "vulnerabilities_with_ofcs": full_report["report_metadata"]["vulnerabilities_with_ofcs"],
                "overall_gap_percentage": (full_report["report_metadata"]["vulnerabilities_without_ofcs"] / 
                                         full_report["report_metadata"]["total_vulnerabilities"] * 100) if full_report["report_metadata"]["total_vulnerabilities"] > 0 else 0
            },
            "top_priority_sectors": list(full_report["gap_analysis"]["by_sector"].keys())[:5],
            "critical_vulnerabilities": full_report["gap_analysis"]["priority_vulnerabilities"][:10]
        }
        
        # Save weekly report
        timestamp = datetime.now().strftime("%Y%m%d")
        weekly_file = self.reports_dir / f"weekly_gap_report_{timestamp}.json"
        with open(weekly_file, 'w') as f:
            json.dump(weekly_summary, f, indent=2)
        
        print(f"Weekly report saved to: {weekly_file}")
        return weekly_summary

if __name__ == "__main__":
    # Test the gap reporter
    reporter = GapReporter()
    
    # Generate full gap report
    report = reporter.generate_gap_report()
    
    if "error" not in report:
        print(f"Gap report generated:")
        print(f"  - Total vulnerabilities: {report['report_metadata']['total_vulnerabilities']}")
        print(f"  - Without OFCs: {report['report_metadata']['vulnerabilities_without_ofcs']}")
        print(f"  - With OFCs: {report['report_metadata']['vulnerabilities_with_ofcs']}")
        
        # Show top priority sectors
        top_sectors = list(report['gap_analysis']['by_sector'].keys())[:3]
        print(f"  - Top priority sectors: {', '.join(top_sectors)}")
    else:
        print(f"Error generating report: {report['error']}")
    
    # Generate sector priority report
    sector_report = reporter.get_sector_priority_report()
    if "error" not in sector_report:
        print(f"\nSector priorities:")
        for sector, data in list(sector_report["sector_priorities"].items())[:3]:
            print(f"  - {sector}: {data.get('priority_level', 'Unknown')} priority")
