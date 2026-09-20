"""
Act name standardization module.
Creates a normalized mapping between legal acts and judgement citations.
"""

import json
import re
from typing import Dict, List, Set
from difflib import SequenceMatcher


class ActStandardizer:
    """Handles normalization and matching of act names across datasets."""

    def __init__(self, legal_acts_path: str, judgements_path: str):
        self.legal_acts_path = legal_acts_path
        self.judgements_path = judgements_path

        # Main data structures
        self.legal_acts_map: Dict[str, dict] = {}  # normalized_name -> act data
        self.citation_to_normalized: Dict[str, str] = {}  # citation -> normalized_name
        self.normalized_to_legal: Dict[str, str] = {}  # normalized -> original legal act title

        # Load and process data
        self._load_data()

    def _normalize_act_name(self, act_name: str) -> str:
        """
        Normalize act name for matching:
        - Remove section references
        - Remove 'THE' prefix
        - Convert to uppercase
        - Normalize whitespace
        """
        # Remove section references (e.g., ", Section 16")
        name = re.sub(r',\s*Section\s+\d+.*$', '', act_name, flags=re.IGNORECASE)

        # Remove 'THE' at the beginning
        name = re.sub(r'^\s*THE\s+', '', name, flags=re.IGNORECASE)

        # Convert to uppercase
        name = name.upper().strip()

        # Normalize whitespace
        name = re.sub(r'\s+', ' ', name)

        return name

    def _load_data(self):
        """Load legal acts and judgements, create normalized mappings."""
        print("Loading legal acts...")
        # Load legal acts
        with open(self.legal_acts_path, 'r') as f:
            legal_acts_data = json.load(f)

        # Create normalized mapping for legal acts
        for act in legal_acts_data['legal_acts']:
            original_title = act['act_identification']['act_title']
            normalized_title = self._normalize_act_name(original_title)

            self.legal_acts_map[normalized_title] = act
            self.normalized_to_legal[normalized_title] = original_title

        print(f"Loaded {len(self.legal_acts_map)} legal acts")

        # Load judgements and map citations
        print("Loading judgements...")
        with open(self.judgements_path, 'r') as f:
            judgements_data = json.load(f)

        print(f"Loaded {len(judgements_data['judgements'])} judgements")

        # Extract all unique citations and map them to normalized names
        all_citations: Set[str] = set()
        for judgement in judgements_data['judgements']:
            if 'legal_citations' in judgement and 'acts_cited' in judgement['legal_citations']:
                for cited_act in judgement['legal_citations']['acts_cited']:
                    all_citations.add(cited_act)

        print(f"Found {len(all_citations)} unique act citations")
        print("Mapping citations to legal acts...")

        # Map each citation to its normalized form
        matched = 0
        for citation in all_citations:
            normalized = self._normalize_act_name(citation)

            # For now, use exact match only (fuzzy matching is too slow for 881 acts)
            # The normalization (removing "THE", uppercase, etc.) handles most variations
            if normalized in self.legal_acts_map:
                self.citation_to_normalized[citation] = normalized
                matched += 1
            else:
                # No match found - use normalized form anyway
                # (This handles cases like Constitution, IPC, CrPC that might not be in the acts file)
                self.citation_to_normalized[citation] = normalized

        unmatched = len(all_citations) - matched
        print(f"Mapping complete: {matched} matched, {unmatched} unmatched")
        print("Note: Unmatched acts (like Constitution, IPC, CrPC) may not be in the legal acts database")

    def _find_best_match(self, normalized_name: str, threshold: float = 0.85) -> str:
        """Find best matching act using fuzzy matching."""
        best_match = None
        best_ratio = 0.0

        for legal_normalized in self.legal_acts_map.keys():
            ratio = SequenceMatcher(None, normalized_name, legal_normalized).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = legal_normalized

        return best_match if best_ratio >= threshold else None

    def get_normalized_name(self, citation: str) -> str:
        """Get normalized name for any citation."""
        return self.citation_to_normalized.get(citation, self._normalize_act_name(citation))

    def get_legal_act_data(self, act_title: str) -> dict:
        """Get legal act data by any form of the title."""
        normalized = self._normalize_act_name(act_title)
        return self.legal_acts_map.get(normalized)

    def get_all_act_titles(self) -> List[str]:
        """Get all legal act titles in their original form."""
        return list(self.normalized_to_legal.values())

    def is_valid_act(self, act_title: str) -> bool:
        """Check if an act title exists in legal acts."""
        normalized = self._normalize_act_name(act_title)
        return normalized in self.legal_acts_map
