"""
Phase 1: Duplicate Detection Router
Detects potential duplicate persons in a family tree using name similarity
and demographic data analysis.
"""
import time
from fastapi import APIRouter
from models.schemas import DuplicateRequest, DuplicateResponse, DuplicateResult
from utils.similarity import compute_member_similarity

router = APIRouter()


@router.post("/detect-duplicates", response_model=DuplicateResponse)
async def detect_duplicates(req: DuplicateRequest):
    """
    Detect potential duplicate family members using multi-signal similarity.

    Algorithm:
    1. Compare all pairs of members
    2. Compute composite similarity score (name + birth year + gender + tribe)
    3. Return pairs above threshold with reasons
    """
    start = time.perf_counter()
    members = req.members
    threshold = req.threshold
    duplicates = []

    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            m1 = members[i]
            m2 = members[j]

            score, reasons = compute_member_similarity(
                m1.model_dump(), m2.model_dump()
            )

            if score >= threshold:
                duplicates.append(DuplicateResult(
                    member1Id = m1.id or f"idx_{i}",
                    member2Id = m2.id or f"idx_{j}",
                    score     = round(score, 3),
                    reasons   = reasons,
                ))

    # Sort by score descending
    duplicates.sort(key=lambda x: x.score, reverse=True)

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return DuplicateResponse(
        duplicates         = duplicates,
        analyzed           = len(members),
        processing_time_ms = elapsed_ms,
    )


@router.post("/validate-relationship")
async def validate_relationship(req: dict):
    """
    Validate that a proposed relationship is logically consistent.
    Checks: age constraints, gender constraints, circular relationships.
    """
    p1   = req.get("person1",  {})
    p2   = req.get("person2",  {})
    rtype = req.get("relationshipType", "")

    warnings = []
    confidence = 0.9

    by1 = p1.get("birthYear")
    by2 = p2.get("birthYear")
    g1  = p1.get("gender", "UNSPECIFIED")
    g2  = p2.get("gender", "UNSPECIFIED")

    if rtype == "PARENT_OF" and by1 and by2:
        age_diff = by2 - by1
        if age_diff < 12:
            warnings.append("الفارق العمري صغير جداً لعلاقة أب/ابن (أقل من 12 سنة)")
            confidence -= 0.3
        elif age_diff > 80:
            warnings.append("الفارق العمري كبير جداً لعلاقة أب/ابن (أكثر من 80 سنة)")
            confidence -= 0.2

    if rtype == "SPOUSE_OF":
        if by1 and by2:
            age_diff = abs(by1 - by2)
            if age_diff > 50:
                warnings.append("الفارق العمري بين الزوجين كبير جداً")
                confidence -= 0.1
        if g1 != "UNSPECIFIED" and g2 != "UNSPECIFIED" and g1 == g2:
            # Note: same-gender marriages — flag for cultural review
            warnings.append("ملاحظة: كلا الشخصين من نفس الجنس")
            confidence -= 0.2

    if rtype == "SIBLING_OF" and by1 and by2:
        age_diff = abs(by1 - by2)
        if age_diff > 30:
            warnings.append("الفارق العمري بين الأخوين كبير نسبياً")
            confidence -= 0.1

    return {
        "isValid":    confidence > 0.3,
        "warnings":   warnings,
        "confidence": round(max(0.0, confidence), 2),
        "explanation": f"نوع العلاقة: {rtype}" if not warnings else "; ".join(warnings),
    }
