import argparse
import sys
from pathlib import Path
from model_router import route_request
from summarize_indic import summarize_file, get_default_prompt

def get_judge_prompt(source_lang: str, target_lang: str) -> str:
    return f"""
You are an impartial, highly rigorous Judge evaluating a {target_lang} summary of a {source_lang} language transcript.
Your absolute priority is preventing hallucinations, omissions of scandalous/critical content, and mistranslations.

Input:
1. Original {source_lang} Transcript
2. Generated {target_lang} Summary

You MUST follow this exact Step-by-Step Chain of Thought BEFORE rendering a verdict:

STEP 1: OMISSION HUNTING
Without looking at the summary, identify the 5 most critical, sensitive, or culturally significant facts/allegations directly from the Original Transcript. List them out.

STEP 2: CROSS-REFERENCE
Now, check the Generated Summary. Does it successfully include ALL 5 of the critical facts you identified? Explain your findings for each point.

STEP 3: VERDICT
Based on your cross-reference, on a new line at the very end of your response, output exactly one of the following:
- If the summary captures all critical details and has no hallucinations, output: VERDICT: PASS
- If the summary is missing critical details, hallucinates, or mistranslates, output: VERDICT: FAIL, followed by your specific feedback on what the Generator must fix in the next attempt.
"""

def evaluate_summary(transcript: str, summary: str, judge_model: str, source_lang: str, target_lang: str) -> tuple[bool, str]:
    """Passes the summary and transcript to the Judge LLM."""
    print(f"\n[Judge] Evaluating summary using {judge_model}...")

    content = f"--- ORIGINAL TRANSCRIPT ---\n{transcript}\n\n--- GENERATED SUMMARY ---\n{summary}"

    messages = [
        {"role": "system", "content": get_judge_prompt(source_lang, target_lang)},
        {"role": "user", "content": content}
    ]

    response = route_request(model_name=judge_model, messages=messages)
    if not response:
        return False, "Judge failed to respond."

    response_upper = response.upper()
    if 'VERDICT: PASS' in response_upper:
        return True, response
    else:
        return False, response

def main() -> int:
    parser = argparse.ArgumentParser(description="Dual-LLM self-correcting summarization loop.")
    parser.add_argument("input_file", help="Path to the Indic transcript file.")
    parser.add_argument("--generator-model", default="ollama/gemma2", help="Model to generate the summary.")
    parser.add_argument("--judge-model", default="gemini/gemini-3.5-flash", help="Model to judge the summary.")
    parser.add_argument("--max-retries", type=int, default=2, help="Maximum number of retries.")
    parser.add_argument("--source-lang", default="any language", help="The source language.")
    parser.add_argument("--target-lang", default="English", help="The target language.")

    args = parser.parse_args()

    input_path = Path(args.input_file)
    if not input_path.is_file():
        print(f"Error: {input_path} not found.")
        return 1

    transcript = input_path.read_text(encoding="utf-8")

    # Attempt 1
    current_prompt = get_default_prompt(args.source_lang, args.target_lang)
    attempt = 1

    while attempt <= args.max_retries + 1:
        print(f"\n=== ATTEMPT {attempt}/{args.max_retries + 1} ===")
        print(f"[Generator] Running {args.generator_model}...")

        messages = [
            {"role": "system", "content": current_prompt},
            {"role": "user", "content": f"Transcript to summarize:\n\n{transcript}"}
        ]

        summary = route_request(model_name=args.generator_model, messages=messages)

        if not summary:
            print("Generator failed. Exiting.")
            return 1

        # Evaluation Phase
        passed, feedback = evaluate_summary(transcript, summary, args.judge_model, args.source_lang, args.target_lang)

        if passed:
            print(f"\n[SUCCESS] The Judge approved the summary on attempt {attempt}.")
            print("\n--- FINAL SUMMARY ---\n")
            print(summary)
            return 0
        else:
            print("\n[FAILED] The Judge rejected the summary. Feedback:")
            print(feedback)

            # Update the prompt for the next generation
            current_prompt = (
                get_default_prompt(args.source_lang, args.target_lang) +
                "\n\nCRITICAL FEEDBACK FROM PREVIOUS ATTEMPT:\n" +
                feedback +
                "\n\nYou MUST fix these issues in your new summary."
            )
            attempt += 1

    print("\n[ERROR] Maximum retries reached. The Generator could not satisfy the Judge.")
    return 1

if __name__ == "__main__":
    sys.exit(main())
