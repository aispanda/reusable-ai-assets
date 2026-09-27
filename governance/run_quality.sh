#!/usr/bin/env sh
set -eu

python3 "AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/scripts/test_governance_check.py"
python3 "AI-Native Rapid Solution Delivery Kit/rapid-ai-solution-delivery/scripts/test_delivery_tools.py"
python3 "Asset-creation-skill/create-reusable-asset/scripts/test_asset_tools.py"
python3 "Asset-creation-skill/create-reusable-asset/scripts/validate_asset.py" .
