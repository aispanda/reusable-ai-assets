#!/usr/bin/env python3
"""Judge LLM Review: Autonomous artifact validation using Claude."""

import argparse
import sys
from pathlib import Path
import anthropic

def load_validation_rules(rules_path: str) -> dict:
    """Load validation rules from YAML."""
    import yaml
    with open(rules_path) as f:
        return yaml.safe_load(f)

def judge_review(content_path: str, rules_path: str) -> dict:
    """Submit artifact to Claude for validation."""
    client = anthropic.Anthropic()
    
    # Read artifact
    with open(content_path) as f:
        artifact_content = f.read()
    
    # Load rules
    rules = load_validation_rules(rules_path)
    
    # Create validation prompt
    prompt = f"""Review this artifact against the following validation rules:

RULES:
{rules['validation_checks']}

ARTIFACT:
{artifact_content}

Provide:
1. Compliance with each rule
2. Security/correctness issues
3. Recommendations
4. Pass/Fail verdict"""
    
    # Call Claude for validation
    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=2048,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    return {
        "artifact_path": content_path,
        "verdict": "PASSED" if "pass" in message.content[0].text.lower() else "FAILED",
        "review": message.content[0].text,
        "rules_applied": list(rules.get('validation_checks', {}).keys())
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True, help="Path to artifact")
    parser.add_argument("--rules", default="rules/validation.yaml", help="Rules file")
    args = parser.parse_args()
    
    result = judge_review(args.path, args.rules)
    print(f"Judge Verdict: {result['verdict']}")
    print(result['review'])
    sys.exit(0 if result['verdict'] == "PASSED" else 1)
