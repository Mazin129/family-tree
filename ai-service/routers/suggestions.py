"""
Phase 1: Missing Link Suggestions Router
Suggests potential relationships that may be missing from the tree.
"""
from fastapi import APIRouter
from models.schemas import SuggestionRequest, SuggestionResponse, SuggestionItem
from utils.similarity import name_similarity

router = APIRouter()


@router.post("/suggest-links", response_model=SuggestionResponse)
async def suggest_missing_links(req: SuggestionRequest):
    """
    Suggest potential missing relationships for a given member.

    Strategies:
    1. Same-tribe members with 15–50 year age gap (potential parents)
    2. Same-tribe, similar-age members without sibling connection (potential siblings)
    3. Members with similar name patterns (same lineage)
    """
    member  = req.member
    context = req.treeContext
    suggestions: list[SuggestionItem] = []

    by = member.birthYear

    for candidate in context:
        if candidate.id == member.id:
            continue

        cby = candidate.birthYear

        # Potential parent suggestion
        if by and cby:
            age_diff = by - cby
            if 15 <= age_diff <= 65:
                tribe_match = (
                    member.tribe and candidate.tribe
                    and member.tribe.lower() == candidate.tribe.lower()
                )
                confidence = 0.5
                if tribe_match:
                    confidence += 0.2
                if 20 <= age_diff <= 45:
                    confidence += 0.1

                suggestions.append(SuggestionItem(
                    type        = "POTENTIAL_PARENT",
                    personId    = candidate.id,
                    description = f"{candidate.fullNameArabic or candidate.fullName} قد يكون والداً لـ {member.fullNameArabic or member.fullName}",
                    confidence  = round(confidence, 2),
                    reasoning   = f"الفارق العمري {age_diff} سنة" + (f"، نفس القبيلة ({member.tribe})" if tribe_match else ""),
                ))

            # Potential sibling suggestion
            elif abs(age_diff) <= 20:
                # Check name pattern similarity (same father name pattern)
                fn_score = 0.0
                if member.fatherName and candidate.fatherName:
                    fn_score, _ = name_similarity(
                        member.fatherName, candidate.fatherName
                    )

                if fn_score > 0.7:
                    suggestions.append(SuggestionItem(
                        type        = "POTENTIAL_SIBLING",
                        personId    = candidate.id,
                        description = f"{candidate.fullNameArabic or candidate.fullName} قد يكون أخاً/أختاً",
                        confidence  = round(0.5 + fn_score * 0.3, 2),
                        reasoning   = f"اسم الأب متشابه ({int(fn_score*100)}%) والفارق العمري {abs(age_diff)} سنة",
                    ))

    # Lineage-based suggestions
    if member.lineage:
        for candidate in context:
            if candidate.id == member.id or not candidate.lineage:
                continue
            lineage_score, _ = name_similarity(member.lineage, candidate.lineage)
            if lineage_score > 0.6:
                suggestions.append(SuggestionItem(
                    type        = "POTENTIAL_SIBLING",
                    personId    = candidate.id,
                    description = f"{candidate.fullNameArabic or candidate.fullName} قد ينتمي لنفس النسب",
                    confidence  = round(lineage_score * 0.8, 2),
                    reasoning   = f"تشابه في سلسلة النسب ({int(lineage_score*100)}%)",
                ))

    # Sort by confidence, deduplicate
    seen_ids = set()
    unique_suggestions = []
    for s in sorted(suggestions, key=lambda x: x.confidence, reverse=True):
        if s.personId not in seen_ids:
            seen_ids.add(s.personId)
            unique_suggestions.append(s)

    return SuggestionResponse(suggestions=unique_suggestions[:10])
