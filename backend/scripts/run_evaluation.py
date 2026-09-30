#!/usr/bin/env python3
"""MORPHEUS Benchmark Evaluation Runner (CLI).
Executes retrieval evaluation and applicability decision benchmarking across labelled cases.
Computes Precision@5, Recall@5, nDCG@5, MRR, Applicability F1, and Grounding/Safety metrics.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import time

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.services.evaluation.harness import run_evaluation, seed_eval_cases, summary


def main():
    parser = argparse.ArgumentParser(description="Run MORPHEUS Benchmark Evaluation")
    parser.add_argument("--run-label", default="benchmark-cli", help="Identifier label for this evaluation run")
    parser.add_argument("--json", dest="output_json", action="store_true", help="Output raw JSON summary")
    args = parser.parse_args()

    t0 = time.time()
    print(f"[*] Initializing MORPHEUS Evaluation Harness (label='{args.run_label}')...", file=sys.stderr)
    
    with SessionLocal() as db:
        cases_count = seed_eval_cases(db)
        print(f"[*] Synchronized benchmark gold set. Running evaluation across all test cases...", file=sys.stderr)
        
        result_rows = run_evaluation(db, run_label=args.run_label)
        results = summary(db, run_label=args.run_label)
        elapsed = time.time() - t0

    if args.output_json:
        print(json.dumps(results, indent=2))
        return

    # Print ASCII Report
    print("\n" + "=" * 84)
    print("                      MORPHEUS EVALUATION BENCHMARK REPORT                      ")
    print("=" * 84)
    print(f"Cases Evaluated: {results.get('cases', 0)} labelled procurement cases")
    print(f"Run Label:       {results.get('run_label', args.run_label)}")
    print(f"Execution Time:  {elapsed:.2f} seconds\n")

    print("-" * 84)
    print(f"{'Method':<20} | {'P@5':<8} | {'R@5':<8} | {'nDCG@5':<8} | {'MRR':<8} | {'App F1':<8} | {'Evidence':<8}")
    print("-" * 84)

    for m in results.get("methods", []):
        method_name = m["method"].capitalize()
        p5 = f"{m.get('precision_at_5', 0)*100:.1f}%" if m.get('precision_at_5') is not None else "—"
        r5 = f"{m.get('recall_at_5', 0)*100:.1f}%" if m.get('recall_at_5') is not None else "—"
        ndcg5 = f"{m.get('ndcg_at_5', 0):.3f}" if m.get('ndcg_at_5') is not None else "—"
        mrr = f"{m.get('mrr', 0):.3f}" if m.get('mrr') is not None else "—"
        app_f1 = f"{m.get('applicability_f1', 0)*100:.1f}%" if m.get('applicability_f1') is not None else "—"
        evidence = f"{m.get('evidence_precision', 0)*100:.1f}%" if m.get('evidence_precision') is not None else "—"
        
        print(f"{method_name:<20} | {p5:<8} | {r5:<8} | {ndcg5:<8} | {mrr:<8} | {app_f1:<8} | {evidence:<8}")

    print("-" * 84)
    safety = results.get("safety_audit", {})
    print("\n[SAFETY & AUDIT VERIFICATION]")
    print(f"  • Hallucination Rate:             {safety.get('hallucination_rate', 0.0)*100:.2f}% (Target: 0.0%)")
    print(f"  • Unsupported Recommendations:    {safety.get('unsupported_rate', 0.0)*100:.2f}% (Target: 0.0%)")
    print(f"  • Citation Correctness:           {safety.get('citation_correctness', 1.0)*100:.2f}% (Target: 100.0%)")
    print(f"  • Adversarial Case Abstention:    {safety.get('adversarial_abstention_rate', 1.0)*100:.2f}% (Target: 100.0%)")
    print("=" * 84 + "\n")


if __name__ == "__main__":
    main()
