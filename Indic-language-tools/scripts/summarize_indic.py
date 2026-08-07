import argparse
import sys
from pathlib import Path
from model_router import route_request

def get_default_prompt(source_lang: str, target_lang: str) -> str:
    return f"""
You are an expert at translating and summarizing {source_lang} into {target_lang}.
Read the provided transcript and produce a highly detailed, comprehensive {target_lang} summary.
Ensure all critical allegations, nuance, and culturally specific terms are captured accurately.
Do not invent information. Do not artificially truncate the summary.
"""

def summarize_file(filepath: Path, model: str, prompt: str) -> str:
    """Reads a file and generates a summary using the selected model."""
    if not filepath.is_file():
        raise FileNotFoundError(f"File not found: {filepath}")

    content = filepath.read_text(encoding="utf-8")

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Transcript to summarize:\n\n{content}"}
    ]

    print(f"Sending request to {model}...")
    summary = route_request(model_name=model, messages=messages)

    if summary:
        print("Summary successfully generated.")
    else:
        print("Failed to generate summary.")

    return summary

def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize an Indic transcript using a routed LLM.")
    parser.add_argument("input_file", help="Path to the transcript file (e.g., .txt)")
    parser.add_argument(
        "--model",
        default="deepseek/deepseek-chat",
        help="Target model string for litellm (e.g., deepseek/deepseek-chat, gemini/gemini-3.5-flash, ollama/gemma2)"
    )
    parser.add_argument(
        "--prompt-file",
        help="Optional path to a custom project profile prompt (if omitted, uses default)."
    )
    parser.add_argument(
        "--output",
        help="Path to save the generated summary. If omitted, prints to stdout."
    )

    parser.add_argument(
        "--source-lang",
        default="any language",
        help="The language of the input transcript (default: 'any language' for auto-detect)."
    )
    parser.add_argument(
        "--target-lang",
        default="English",
        help="The target language for the summary (default: English)."
    )

    args = parser.parse_args()

    # Load prompt
    prompt = get_default_prompt(args.source_lang, args.target_lang)
    if args.prompt_file:
        prompt_path = Path(args.prompt_file)
        if prompt_path.is_file():
            prompt = prompt_path.read_text(encoding="utf-8")
            print(f"Loaded custom prompt from {prompt_path}")
        else:
            print(f"Warning: custom prompt file {prompt_path} not found. Using default.")

    try:
        summary = summarize_file(Path(args.input_file), args.model, prompt)
    except Exception as e:
        print(f"Error: {e}")
        return 1

    if not summary:
        return 1

    if args.output:
        out_path = Path(args.output)
        # Ensure parent directories exist
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(summary, encoding="utf-8")
        print(f"Summary saved to: {out_path}")
    else:
        print("\n--- SUMMARY ---\n")
        print(summary)
        print("\n---------------\n")

    return 0

if __name__ == "__main__":
    sys.exit(main())
