"""
Phase 3: AI-Generated Narrative & Heritage Reports
Generates rich family narratives and heritage reports using LLM APIs.
Falls back to template-based generation when LLM is unavailable.
"""
import os
from fastapi import APIRouter
from models.schemas import NarrativeRequest, NarrativeResponse, HeritageReportRequest, HeritageReportResponse

router = APIRouter()

OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


async def generate_with_claude(prompt: str, language: str = "ar") -> str:
    """Generate text using Anthropic Claude API."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    system = (
        "أنت مؤرخ متخصص في التاريخ والتراث السوداني. "
        "اكتب بأسلوب أدبي جميل يعكس الهوية الثقافية السودانية. "
        "استخدم اللغة العربية الفصيحة مع مراعاة الألفاظ والتعبيرات السودانية الأصيلة."
        if language == "ar" else
        "You are a historian specializing in Sudanese history and heritage. "
        "Write in an elegant literary style reflecting Sudanese cultural identity."
    )

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def generate_template_narrative(members: list, language: str = "ar") -> tuple[str, list]:
    """Template-based narrative generation (no LLM required)."""
    if not members:
        return (
            "هذه الشجرة العائلية في طور الإنشاء. أضف المزيد من الأفراد لإنشاء سردية ثرية.",
            []
        ) if language == "ar" else (
            "This family tree is being built. Add more members to generate a rich narrative.",
            []
        )

    names = [m.get("fullNameArabic") or m.get("fullName", "مجهول") for m in members[:5]]
    tribes = list({m.get("tribe") for m in members if m.get("tribe")})
    regions = list({m.get("birthRegion") or m.get("region") for m in members if m.get("birthRegion") or m.get("region")})

    birth_years = sorted([m.get("birthYear") for m in members if m.get("birthYear")])
    year_range = f"من {birth_years[0]} إلى {birth_years[-1]}" if len(birth_years) >= 2 else ""

    highlights = []

    if language == "ar":
        narrative_parts = [
            f"تضم هذه الشجرة العائلية {len(members)} فرداً",
        ]
        if year_range:
            narrative_parts.append(f"تمتد {year_range}")
        if tribes:
            highlights.append(f"القبائل: {', '.join(tribes[:3])}")
            narrative_parts.append(f"ينتمي أفرادها إلى قبائل {', '.join(tribes[:3])}")
        if regions:
            highlights.append(f"الأقاليم: {', '.join(regions[:3])}")
            narrative_parts.append(f"من أقاليم {', '.join(regions[:3])}")

        narrative = (
            "تحكي هذه الشجرة العائلية قصة عائلة سودانية أصيلة. "
            + "، ".join(narrative_parts) + ". "
            "إنها شهادة حية على عراقة الجذور السودانية وعمق الروابط الأسرية "
            "عبر الأجيال المتعاقبة في رحاب وادي النيل العظيم."
        )
    else:
        narrative = (
            f"This family tree tells the story of {len(members)} individuals"
            + (f" spanning {year_range}" if year_range else "")
            + ". "
            + (f"Connected through the {', '.join(tribes[:3])} tribes. " if tribes else "")
            + "A testament to Sudanese heritage and family bonds across generations."
        )
        highlights = [f"Tribes: {', '.join(tribes)}" if tribes else "",
                      f"Regions: {', '.join(regions)}" if regions else ""]

    return narrative, [h for h in highlights if h]


@router.post("/generate-narrative", response_model=NarrativeResponse)
async def generate_narrative(req: NarrativeRequest):
    """
    Phase 3: Generate an AI narrative for the family tree.
    Uses Claude/GPT if available, falls back to templates.
    """
    members = [m.model_dump() for m in req.members] if req.members else []

    # Try LLM first
    if ANTHROPIC_API_KEY and len(members) >= 3:
        try:
            names  = [m.get("fullNameArabic") or m.get("fullName") for m in members[:10] if m.get("fullName")]
            tribes = list({m.get("tribe") for m in members if m.get("tribe")})
            regions = list({m.get("birthRegion") for m in members if m.get("birthRegion")})

            prompt = (
                f"اكتب سردية أدبية جميلة عن هذه العائلة السودانية:\n"
                f"أفراد العائلة البارزون: {', '.join(names[:5])}\n"
                f"القبائل: {', '.join(tribes) if tribes else 'غير محدد'}\n"
                f"الأقاليم: {', '.join(str(r) for r in regions) if regions else 'غير محدد'}\n"
                f"عدد الأفراد: {len(members)}\n\n"
                f"اكتب سردية من 200-300 كلمة تحكي قصة هذه العائلة وجذورها."
                if req.language == "ar" else
                f"Write a literary narrative about this Sudanese family:\n"
                f"Members: {', '.join(names[:5])}\n"
                f"Tribes: {', '.join(tribes) if tribes else 'unspecified'}\n"
                f"Write 200-300 words telling their story."
            )

            narrative_text = await generate_with_claude(prompt, req.language)
            highlights = [f"عائلة من {len(members)} فرد"] if req.language == "ar" else [f"Family of {len(members)} members"]

            return NarrativeResponse(narrative=narrative_text, highlights=highlights)

        except Exception as e:
            # Fall through to template generation
            pass

    # Template fallback
    narrative_text, highlights = generate_template_narrative(members, req.language)
    return NarrativeResponse(narrative=narrative_text, highlights=highlights)


@router.post("/heritage-report", response_model=HeritageReportResponse)
async def generate_heritage_report(req: HeritageReportRequest):
    """
    Phase 3: Generate a comprehensive heritage report for a family tree.
    """
    sections: dict[str, str] = {}

    if req.language == "ar":
        sections = {
            "النسب":    "يُعدّ النسب من أهم مقومات الهوية السودانية. تتشابك فيه الجذور القبلية...",
            "التاريخ":  "تعكس هذه الشجرة قصة عائلة سودانية أصيلة عبر الأجيال...",
            "الجغرافيا": "يمتد انتشار أفراد هذه العائلة عبر أقاليم متعددة من السودان...",
            "التراث":   "يحمل أفراد هذه العائلة إرثاً ثقافياً غنياً ينعكس في أسمائهم وعاداتهم...",
        }
        report = "\n\n".join(f"## {k}\n{v}" for k, v in sections.items())
    else:
        sections = {
            "Lineage":   "Lineage is central to Sudanese identity...",
            "History":   "This tree reflects generations of a Sudanese family...",
            "Geography": "Family members span multiple regions of Sudan...",
            "Heritage":  "The family carries a rich cultural legacy...",
        }
        report = "\n\n".join(f"## {k}\n{v}" for k, v in sections.items())

    return HeritageReportResponse(report=report, sections=sections)
