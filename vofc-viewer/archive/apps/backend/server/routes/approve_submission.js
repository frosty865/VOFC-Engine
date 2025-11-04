// Approval API for VOFC submissions
import express from "express";
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all pending submissions
router.get("/pending", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vofc_submissions")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending submissions:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, submissions: data });
  } catch (error) {
    console.error("Error in pending submissions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get submission by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("vofc_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching submission:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: "Submission not found" });
    }

    res.json({ success: true, submission: data });
  } catch (error) {
    console.error("Error in get submission:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve submission
router.post("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approver } = req.body;

    if (!approver) {
      return res.status(400).json({ success: false, error: "Approver ID is required" });
    }

    // Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from("vofc_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching submission:", fetchError);
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    if (!submission) {
      return res.status(404).json({ success: false, error: "Submission not found" });
    }

    if (submission.status !== "pending_review") {
      return res.status(400).json({ 
        success: false, 
        error: `Submission is already ${submission.status}` 
      });
    }

    const submissionData = submission.data;

    // Insert source
    const source = submissionData.source;
    const { data: sourceInsert, error: sourceError } = await supabase
      .from("sources")
      .insert({
        title: source.title,
        authors: source.authors?.join(", ") || "",
        year: source.year,
        source_type: source.source_type,
        source_url: source.source_url,
        author_org: source.author_org,
        content_restriction: source.content_restriction,
        source_confidence: source.source_confidence
      })
      .select()
      .single();

    if (sourceError) {
      console.error("Error inserting source:", sourceError);
      return res.status(500).json({ success: false, error: sourceError.message });
    }

    // Process each entry
    const entries = submissionData.entries || [];
    const results = [];

    for (const entry of entries) {
      try {
        // Insert vulnerability
        const { data: vuln, error: vulnError } = await supabase
          .from("vulnerabilities")
          .insert({
            category: entry.category,
            vulnerability: entry.vulnerability,
            sector: entry.sector,
            subsector: entry.subsector
          })
          .select()
          .single();

        if (vulnError) {
          console.error("Error inserting vulnerability:", vulnError);
          continue;
        }

        // Insert OFC if it exists
        if (entry.ofc && entry.ofc.trim()) {
          const { data: ofc, error: ofcError } = await supabase
            .from("options_for_consideration")
            .insert({
              option_text: entry.ofc,
              vulnerability_id: vuln.id
            })
            .select()
            .single();

          if (ofcError) {
            console.error("Error inserting OFC:", ofcError);
            continue;
          }

          // Link OFC to source
          const { error: linkError } = await supabase
            .from("ofc_sources")
            .insert({
              ofc_id: ofc.id,
              source_id: sourceInsert.id
            });

          if (linkError) {
            console.error("Error linking OFC to source:", linkError);
          }

          results.push({
            vulnerability_id: vuln.id,
            ofc_id: ofc.id,
            source_id: sourceInsert.id
          });
        }
      } catch (entryError) {
        console.error("Error processing entry:", entryError);
        continue;
      }
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from("vofc_submissions")
      .update({ 
        status: "approved", 
        approved_by: approver,
        approved_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating submission status:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log(`✅ Submission ${id} approved by ${approver}`);
    console.log(`📊 Processed ${results.length} entries`);

    res.json({ 
      success: true, 
      message: "Submission approved and committed to database",
      results: {
        source_id: sourceInsert.id,
        entries_processed: results.length,
        submission_id: id
      }
    });

  } catch (error) {
    console.error("Error in approve submission:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject submission
router.post("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { rejected_by, rejection_reason } = req.body;

    if (!rejected_by) {
      return res.status(400).json({ success: false, error: "Rejector ID is required" });
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from("vofc_submissions")
      .update({ 
        status: "rejected", 
        rejected_by: rejected_by,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason || "No reason provided"
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating submission status:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log(`❌ Submission ${id} rejected by ${rejected_by}`);

    res.json({ 
      success: true, 
      message: "Submission rejected"
    });

  } catch (error) {
    console.error("Error in reject submission:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get submission statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vofc_submissions")
      .select("status, created_at");

    if (error) {
      console.error("Error fetching submission stats:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const stats = {
      total: data.length,
      pending: data.filter(s => s.status === "pending_review").length,
      approved: data.filter(s => s.status === "approved").length,
      rejected: data.filter(s => s.status === "rejected").length,
      needs_revision: data.filter(s => s.status === "needs_revision").length
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error in submission stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
