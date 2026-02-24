"""
Phase 2: Lineage Pattern Analysis Router
Analyzes genealogical data to extract migration patterns, lineage depth,
tribe distribution, and historical ancestry insights.
"""
from fastapi import APIRouter
from collections import Counter
from models.schemas import (
    LineageRequest, LineageResponse,
    LineagePattern, MigrationPoint,
    TribeInferenceRequest, TribeInferenceResponse,
)

router = APIRouter()

# ── Sudanese tribe name patterns (for inference) ─────────────────────────────
# Based on common Sudanese naming conventions and tribal naming patterns

TRIBE_NAME_PATTERNS: dict[str, list[str]] = {
    "Ja'alin": [
        "جعلي", "جعلى", "العباسي", "المهدي", "الكبير",
        "jaali", "jaalin", "abbasi",
    ],
    "Shaigiyya": [
        "شايقي", "شايقى", "الشايقي", "شيقي",
        "shaygi", "shaigiyya",
    ],
    "Danagla": [
        "دنقلاوي", "الدنقلاوي", "دنقلا", "نوبي",
        "dongolawi", "danagla",
    ],
    "Beja": [
        "البجاوي", "البشاري", "الهدندوا",
        "beja", "bisharin", "hadendoa",
    ],
    "Fur": [
        "الفوري", "دارفور", "فور",
        "fur", "darfuri",
    ],
    "Nuba": [
        "النوباوي", "النوبا",
        "nuba", "nubawi",
    ],
    "Kababish": [
        "الكبابيش", "كبابيش",
        "kababish",
    ],
    "Zaghawa": [
        "الزغاوة", "زغاوة",
        "zaghawa",
    ],
    "Rashaida": [
        "الرشايدة", "رشايدة",
        "rashaida",
    ],
}


@router.post("/analyze-lineage", response_model=LineageResponse)
async def analyze_lineage(req: LineageRequest):
    """
    Phase 2: Analyze lineage patterns in the family tree.
    """
    members = req.members
    patterns: list[LineagePattern] = []

    # ── 1. Generation depth analysis ─────────────────────────────────────────
    birth_years = [m.birthYear for m in members if m.birthYear]
    generation_depth = 1
    avg_generation_gap = None

    if len(birth_years) >= 2:
        birth_years.sort()
        span = birth_years[-1] - birth_years[0]
        avg_generation_gap = 28.0  # assumed Sudanese average
        generation_depth = max(1, round(span / avg_generation_gap))

        patterns.append(LineagePattern(
            type        = "GENERATION_DEPTH",
            description = f"تمتد الشجرة عبر حوالي {generation_depth} أجيال (من {birth_years[0]} إلى {birth_years[-1]})",
            confidence  = 0.85,
            members     = [m.id for m in members if m.id],
        ))

    # ── 2. Tribe distribution ─────────────────────────────────────────────────
    tribe_counter = Counter(m.tribe for m in members if m.tribe)
    tribe_distribution = dict(tribe_counter.most_common(10))

    if tribe_counter:
        dominant_tribe = tribe_counter.most_common(1)[0]
        patterns.append(LineagePattern(
            type        = "DOMINANT_TRIBE",
            description = f"القبيلة المهيمنة هي {dominant_tribe[0]} بنسبة {int(dominant_tribe[1]/len(members)*100)}%",
            confidence  = 0.9,
        ))

    # ── 3. Region migration patterns ─────────────────────────────────────────
    region_counter = Counter(m.region for m in members if m.region)
    migration_route: list[MigrationPoint] = []

    if len(region_counter) > 1:
        patterns.append(LineagePattern(
            type        = "GEOGRAPHIC_SPREAD",
            description = f"العائلة موزعة على {len(region_counter)} إقليم/ولاية",
            confidence  = 0.8,
        ))

        for region, count in region_counter.most_common():
            migration_route.append(MigrationPoint(
                region     = str(region),
                period     = "غير محدد",
                population = count,
            ))

    # ── 4. Longevity pattern ─────────────────────────────────────────────────
    deceased = [
        m for m in members
        if m.birthYear and m.deathYear
    ]
    if len(deceased) >= 3:
        avg_lifespan = sum(
            m.deathYear - m.birthYear for m in deceased  # type: ignore
        ) / len(deceased)
        patterns.append(LineagePattern(
            type        = "LONGEVITY",
            description = f"متوسط العمر في الشجرة: {round(avg_lifespan)} سنة",
            confidence  = 0.75,
        ))

    # ── 5. Name pattern clustering ────────────────────────────────────────────
    father_names = Counter(m.fatherName for m in members if m.fatherName)
    if father_names:
        common_ancestor = father_names.most_common(1)[0]
        if common_ancestor[1] >= 3:
            patterns.append(LineagePattern(
                type        = "COMMON_ANCESTOR",
                description = f"جد مشترك محتمل: '{common_ancestor[0]}' يظهر {common_ancestor[1]} مرات",
                confidence  = 0.7,
            ))

    return LineageResponse(
        patterns          = patterns,
        migrationRoute    = migration_route,
        tribeDistribution = tribe_distribution,
        generationDepth   = generation_depth,
        avgGenerationGap  = avg_generation_gap,
    )


@router.post("/infer-tribe", response_model=TribeInferenceResponse)
async def infer_tribe(req: TribeInferenceRequest):
    """
    Phase 2: Infer likely tribe from name patterns and region.
    Uses rule-based pattern matching on Sudanese naming conventions.
    """
    search_text = " ".join(filter(None, [
        req.fullName, req.fatherName, req.lineage
    ])).lower()

    tribe_scores: dict[str, float] = {}

    for tribe, patterns in TRIBE_NAME_PATTERNS.items():
        score = 0.0
        for pattern in patterns:
            if pattern.lower() in search_text:
                score += 0.4
        if score > 0:
            tribe_scores[tribe] = min(1.0, score)

    # Region-based hints
    if req.region:
        region_tribe_hints = {
            "NORTHERN":       ["Danagla", "Shaigiyya", "Ja'alin"],
            "NILE":           ["Ja'alin", "Manasir", "Rubatab"],
            "RED_SEA":        ["Beja", "Bisharin", "Rashaida"],
            "NORTH_DARFUR":   ["Zaghawa", "Fur", "Berti"],
            "SOUTH_DARFUR":   ["Fur", "Masalit"],
            "SOUTH_KORDOFAN": ["Nuba"],
            "KASSALA":        ["Beja", "Hadendoa"],
        }
        hints = region_tribe_hints.get(req.region, [])
        for tribe in hints:
            tribe_scores[tribe] = tribe_scores.get(tribe, 0) + 0.1

    if not tribe_scores:
        return TribeInferenceResponse(
            tribe       = "غير محدد",
            confidence  = 0.0,
            alternatives = [],
            reasoning   = "لا توجد معلومات كافية للاستدلال على القبيلة",
        )

    sorted_tribes = sorted(tribe_scores.items(), key=lambda x: x[1], reverse=True)
    top = sorted_tribes[0]
    alternatives = [t for t, _ in sorted_tribes[1:4]]

    return TribeInferenceResponse(
        tribe       = top[0],
        confidence  = round(top[1], 2),
        alternatives = alternatives,
        reasoning   = f"بناءً على أنماط الاسم والمنطقة الجغرافية",
    )
