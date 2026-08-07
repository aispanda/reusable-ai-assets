import os
import time
from dotenv import load_dotenv

# Use litellm for unified API routing (supports Ollama, DeepSeek, Gemini, etc.)
# pip install litellm
import litellm
from litellm import completion

# Load an optional project-local .env. Production deployments should inject
# credentials through their approved secret manager or environment settings.
load_dotenv()

def route_request(model_name: str, messages: list[dict], **kwargs) -> str:
    """
    Standardizes the request to the target model using litellm.
    Expects model_name format like:
    - 'deepseek/deepseek-chat'
    - 'gemini/gemini-3.5-flash'
    - 'ollama/gemma2'
    """
    try:
        response = completion(
            model=model_name,
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Routing Error for {model_name}: {e}")
        return None

def bake_off(prompt: str, content: str, models: list[str]) -> dict:
    """
    Runs the exact same prompt and content against a list of models to evaluate:
    - Cost (if applicable)
    - Latency (execution time)
    - Output quality (human review)
    """
    print(f"\n--- Starting Model Bake-off ({len(models)} models) ---")
    results = {}

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": content}
    ]

    for model in models:
        print(f"Testing {model}...")
        start_time = time.time()

        # litellm automatically handles cost tracking internally for supported models
        try:
            response = completion(
                model=model,
                messages=messages
            )
            elapsed = time.time() - start_time

            # Try to get cost if litellm knows it
            cost = litellm.completion_cost(completion_response=response)
            cost_str = f"${cost:.6f}" if cost else "Unknown/Free"

            results[model] = {
                "elapsed_seconds": round(elapsed, 2),
                "cost": cost_str,
                "output": response.choices[0].message.content
            }

            print(f"  [OK] {elapsed:.2f}s | Cost: {cost_str}")
        except Exception as e:
            print(f"  [FAILED] {e}")
            results[model] = {"error": str(e)}

    return results

if __name__ == "__main__":
    # Example usage / Test
    test_prompt = "Translate this into exactly 3 English words:"
    test_content = "તમે કેમ છો?" # "How are you?" in Gujarati

    # Fast Routing Rule candidates:
    # - A free local model (requires Ollama running locally)
    # - DeepSeek V4 Flash equivalent (deepseek-chat is extremely cheap)
    # - Gemini 3.5 Flash
    candidates = [
        "ollama/gemma2",
        "deepseek/deepseek-chat",
        "gemini/gemini-3.5-flash"
    ]

    results = bake_off(test_prompt, test_content, models=candidates)

    for model, data in results.items():
        print(f"\n[{model}] -> {data.get('cost', 'N/A')} in {data.get('elapsed_seconds', 'N/A')}s")
        print(f"Output: {data.get('output', data.get('error'))}")
