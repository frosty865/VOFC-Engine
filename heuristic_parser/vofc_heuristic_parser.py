#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# VOFC Heuristic Parser
# Parses unstructured security guidance (PDF/HTML/DOCX/TXT) to extract
# Vulnerabilities and Options for Consideration (OFCs) using linguistic heuristics,
# optional embeddings, and section-aware clustering.

import argparse
import json
import os
import re
import sys
from typing import List, Dict, Any, Optional, Tuple

# Optional imports
_HAVE_PDFMINER = False
_HAVE_PYPDF2 = False
_HAVE_DOCX = False
_HAVE_BS4 = False
_HAVE_ST = False
_HAVE_NP = False

try:
    from pdfminer.high_level import extract_text as pdfminer_extract_text
    _HAVE_PDFMINER = True
except Exception:
    _HAVE_PDFMINER = False

try:
    import PyPDF2
    _HAVE_PYPDF2 = True
except Exception:
    _HAVE_PYPDF2 = False

try:
    import docx  # python-docx
    _HAVE_DOCX = True
except Exception:
    _HAVE_DOCX = False

try:
    from bs4 import BeautifulSoup
    _HAVE_BS4 = True
except Exception:
    _HAVE_BS4 = False

try:
    import numpy as _np
    _HAVE_NP = True
except Exception:
    _HAVE_NP = False

try:
    from sentence_transformers import SentenceTransformer
    from numpy.linalg import norm as _l2norm
    _HAVE_ST = True
except Exception:
    _HAVE_ST = False

RECOMMENDATION_CUES = [
    "should", "shall", "must", "ensure", "establish", "develop", "create",
    "implement", "train", "conduct", "consider", "coordinate", "consult",
    "maintain", "exercise", "test", "assess", "review", "update", "designate",
    "appoint", "stock", "install", "deploy", "improve", "upgrade", "define",
    "document", "verify", "audit", "monitor", "harden", "secure", "configure",
    "enable", "validate", "enforce", "restrict", "segregate", "isolate",
    "backup", "patch", "scan", "encrypt", "log", "alert", "notify", "report"
]

VULNERABILITY_CUES = [
    "lacks", "lack of", "does not have", "no ", "not have", "is missing", "missing",
    "insufficient", "inadequate", "limited", "absent", "outdated", "unavailable",
    "untrained", "unprepared", "incomplete", "not coordinated", "not documented",
    "not tested", "not exercised", "not implemented", "not established",
    "doesn’t have", "doesn't have", "has not", "have not", "without "
]

POLICY_CUES = [
    "policy", "policies", "standard", "standards", "regulation", "regulatory",
    "requirement", "requirements", "guideline", "guidelines",
    "procedure", "procedures", "plan", "plans", "program", "programs"
]

CATEGORY_HINTS = [
    "Security Management",
    "Information Sharing",
    "Security Force",
    "Resilience Management - Business Continuity",
    "Resilience Management - Emergency Action Plan",
    "Emergency Management",
    "Emergency Action Plan",
    "Business Continuity",
    "Facility Information",
    "First Preventers-Responders",
    "Access Control",
    "Perimeter Security",
    "Video Security Systems",
    "Visitor Management",
    "Communications",
    "Training & Exercises",
    "Mail Screening",
    "Active Shooter",
    "Cyber-Physical Convergence"
]

BULLETS = ["•", "◦", "▪", "‣", "●", "■", "–", "-", "—", "•", "·", ""]

def _read_text_from_file(path: str) -> str:
    ext = os.path.splitext(path.lower())[1]
    if ext == ".txt":
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    if ext == ".pdf":
        if _HAVE_PDFMINER:
            try:
                return pdfminer_extract_text(path)
            except Exception:
                pass
        if _HAVE_PYPDF2:
            try:
                text = []
                with open(path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        try:
                            text.append(page.extract_text() or "")
                        except Exception:
                            text.append("")
                return "\n".join(text)
            except Exception:
                pass
        raise RuntimeError("PDF parsing requires pdfminer.six or PyPDF2 to be installed.")
    if ext in (".html", ".htm"):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()
        if _HAVE_BS4:
            soup = BeautifulSoup(html, "html.parser")
            return soup.get_text(separator="\n")
        text = re.sub(r"<script.*?>.*?</script>", " ", html, flags=re.S|re.I)
        text = re.sub(r"<style.*?>.*?</style>", " ", text, flags=re.S|re.I)
        text = re.sub(r"<[^>]+>", "\n", text)
        return text
    if ext == ".docx":
        if not _HAVE_DOCX:
            raise RuntimeError("DOCX parsing requires python-docx to be installed.")
        d = docx.Document(path)
        return "\n".join(p.text for p in d.paragraphs)
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def normalize_text(text: str) -> str:
    for b in BULLETS:
        text = text.replace(b, "-")
    text = text.replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"-\s{2,}", "- ", text)
    return text

def split_into_lines(text: str) -> List[str]:
    lines = [ln.strip() for ln in text.split("\n")]
    return [ln for ln in lines if ln]

def naive_sentence_split(text: str) -> List[str]:
    text = text.replace("\n- ", ".\n- ")
    parts = re.split(r"(?<=[\.\!\?])\s+|\n-\s+|\n", text)
    out = []
    for p in parts:
        p = p.strip(" -\t")
        if not p:
            continue
        if not p.startswith("-") and re.match(r"^(Implement|Develop|Ensure|Train|Conduct|Establish|Create)\b", p, re.I):
            p = "- " + p
        out.append(p)
    return out

def is_header(line: str) -> bool:
    if len(line) > 120:
        return False
    if line.endswith(":"):
        return True
    if re.fullmatch(r"[A-Z0-9\-\&\(\)\/\s]+", line) and len(line) >= 4:
        return True
    words = line.split()
    if 1 <= len(words) <= 12 and sum(w[:1].isupper() for w in words) >= max(2, int(0.6*len(words))):
        return True
    return False

def jaccard(a_tokens: set, b_tokens: set) -> float:
    inter = a_tokens.intersection(b_tokens)
    union = a_tokens.union(b_tokens) or {""}
    return len(inter) / max(1, len(union))

def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9]+", text.lower())

def cosine_sim(a, b) -> float:
    if not _HAVE_NP or a is None or b is None:
        return 0.0
    denom = (_l2norm(a) * _l2norm(b)) if _HAVE_ST else (_np.linalg.norm(a) * _np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(a.dot(b) / denom)

def classify_sentence(sentence: str) -> Tuple[str, Dict[str, Any]]:
    s = sentence.strip().lower()
    features = {
        "has_bullet": sentence.strip().startswith("-"),
        "has_modal": any(cue in s for cue in ["should", "shall", "must"]),
        "rec_hits": sum(1 for cue in RECOMMENDATION_CUES if cue in s),
        "vuln_hits": sum(1 for cue in VULNERABILITY_CUES if cue in s),
        "policy_hits": sum(1 for cue in POLICY_CUES if cue in s),
        "len": len(s.split())
    }
    rec_score = features["rec_hits"] + (1.2 if features["has_modal"] else 0) + (0.6 if features["has_bullet"] else 0)
    vuln_score = features["vuln_hits"] + (0.3 * features["policy_hits"])
    if features["has_bullet"] and features["len"] <= 25 and rec_score >= 1:
        label = "recommendation"
    elif rec_score > vuln_score and rec_score >= 1:
        label = "recommendation"
    elif vuln_score >= 1:
        label = "vulnerability"
    else:
        label = "neutral"
    features["rec_score"] = rec_score
    features["vuln_score"] = vuln_score
    features["label"] = label
    return label, features

def assign_category_from_headers(header_stack: List[str]) -> Optional[str]:
    if not header_stack:
        return None
    header_text = " / ".join(header_stack[-3:])
    header_tokens = set(tokenize(header_text))
    best = (None, 0.0)
    for cat in CATEGORY_HINTS:
        score = jaccard(header_tokens, set(tokenize(cat)))
        if score > best[1]:
            best = (cat, score)
    return best[0]

def make_topic_label(vuln_sent: str, header_stack: List[str]) -> str:
    tokens = tokenize(vuln_sent)
    keywords = [t for t in tokens if len(t) >= 5]
    top = " ".join(sorted(set(keywords), key=lambda x: (-tokens.count(x), -len(x)))[:3])
    hdr = header_stack[-1] if header_stack else ""
    if hdr and top:
        return f"{hdr} - {top}".strip(" -")
    return hdr or (top if top else "General")

def embed_sentences(sentences: List[str]):
    if not _HAVE_ST or not _HAVE_NP:
        return None
    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embs = model.encode(sentences)
        return embs
    except Exception:
        return None

def cluster_recs_with_vulns(sentences: List[str], labels: List[str], headers: List[List[str]],
                            min_conf: float = 0.5, use_embeddings: bool = True) -> List[Dict[str, Any]]:
    tokens_list = [set(tokenize(s)) for s in sentences]
    feats = [classify_sentence(s)[1] for s in sentences]
    emb_matrix = None
    if use_embeddings:
        embs = embed_sentences(sentences)
        if embs is not None and _HAVE_NP:
            emb_matrix = _np.array(embs)

    entries = []
    n = len(sentences)
    i = 0
    while i < n:
        if labels[i] == "vulnerability":
            vuln_idx = i
            vuln_text = sentences[i].strip(" -")
            hdr_stack = headers[i]
            window = range(i+1, min(n, i+8))
            ofcs = []
            confs = []
            for j in window:
                if headers[j] != hdr_stack:
                    break
                if labels[j] == "recommendation":
                    jac = jaccard(tokens_list[vuln_idx], tokens_list[j])
                    cos = cosine_sim(emb_matrix[vuln_idx], emb_matrix[j]) if emb_matrix is not None else 0.0
                    sim = 0.6 * jac + 0.4 * cos
                    base = feats[j]["rec_score"]
                    confidence = min(1.0, 0.3 * base + 0.7 * sim + (0.1 if feats[j]["has_bullet"] else 0))
                    if confidence >= min_conf or (jac >= 0.12 and feats[j]["rec_score"] >= 1):
                        ofcs.append(sentences[j].strip(" -"))
                        confs.append(confidence)
            if ofcs:
                category = assign_category_from_headers(hdr_stack)
                topic = make_topic_label(vuln_text, hdr_stack)
                entry_conf = float(min(1.0, sum(confs) / max(1, len(confs)) + 0.05))
                entries.append({
                    "topic": topic,
                    "category": category or "General",
                    "vulnerability": vuln_text,
                    "options_for_consideration": sorted(list(dict.fromkeys(ofcs))),
                    "confidence": round(entry_conf, 3),
                    "section_path": hdr_stack
                })
        i += 1
    return entries

def build_header_stack(lines: List[str]) -> List[List[str]]:
    stack = []
    stack_per_line = []
    for ln in lines:
        if is_header(ln):
            if stack and len(ln) < len(stack[-1]):
                stack = [ln]
            else:
                stack.append(ln)
            stack = stack[-4:]
        stack_per_line.append(stack.copy())
    return stack_per_line

def postprocess_merge(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def tokset(t): return set(tokenize(t))
    merged = []
    for e in entries:
        found = False
        for m in merged:
            if m["category"] == e["category"]:
                if jaccard(tokset(m["vulnerability"]), tokset(e["vulnerability"])) >= 0.6:
                    m["options_for_consideration"] = sorted(list(dict.fromkeys(
                        (m.get("options_for_consideration") or []) + (e.get("options_for_consideration") or [])
                    )))
                    m["confidence"] = round(min(1.0, (m["confidence"] + e["confidence"]) / 2.0), 3)
                    found = True
                    break
        if not found:
            merged.append(e)
    return merged

def parse_document_to_vofc(text: str, min_confidence: float = 0.5) -> List[Dict[str, Any]]:
    text = normalize_text(text)
    lines = split_into_lines(text)
    header_context_per_line = build_header_stack(lines)
    sentences = []
    headers_for_sentence = []

    for idx, ln in enumerate(lines):
        hdr_stack = header_context_per_line[idx]
        if is_header(ln):
            continue
        sents = naive_sentence_split(ln)
        for s in sents:
            sentences.append(s)
            headers_for_sentence.append(hdr_stack.copy())

    labels = []
    for s in sentences:
        label, _ = classify_sentence(s)
        labels.append(label)

    entries = cluster_recs_with_vulns(sentences, labels, headers_for_sentence, min_conf=min_confidence, use_embeddings=True)
    entries = postprocess_merge(entries)
    return entries

def main():
    ap = argparse.ArgumentParser(description="Heuristic VOFC Parser")
    ap.add_argument("input_path", help="Path to PDF/HTML/DOCX/TXT")
    ap.add_argument("--source-url", default="", help="Canonical source URL for provenance")
    ap.add_argument("--category-hint", default="", help="Force category when unknown")
    ap.add_argument("--min-confidence", type=float, default=0.5, help="Minimum confidence to include an entry")
    ap.add_argument("--out", default="", help="Write JSON to this path (default: stdout)")
    args = ap.parse_args()

    raw = _read_text_from_file(args.input_path)
    entries = parse_document_to_vofc(raw, min_confidence=args.min_confidence)

    for e in entries:
        if args.source_url:
            e["source"] = args.source_url
        if args.category_hint and (not e.get("category") or e["category"] == "General"):
            e["category"] = args.category_hint

    result = {
        "source_file": os.path.abspath(args.input_path),
        "entry_count": len(entries),
        "entries": entries
    }
    js = json.dumps(result, indent=2, ensure_ascii=False)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"Wrote {len(entries)} entries to {args.out}")
    else:
        print(js)

if __name__ == "__main__":
    main()
