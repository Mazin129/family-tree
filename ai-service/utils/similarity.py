"""
Name similarity algorithms optimised for Arabic/Sudanese names
"""
import re
import unicodedata
from typing import List, Tuple
import jellyfish


def normalize_arabic(text: str) -> str:
    """Normalise Arabic text: remove diacritics, normalize alef/hamza, etc."""
    # Remove diacritics (tashkeel)
    text = re.sub(r'[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC]', '', text)
    # Normalize alef forms → bare alef
    text = re.sub(r'[أإآٱ]', 'ا', text)
    # Normalize taa marbouta
    text = re.sub(r'ة', 'ه', text)
    # Normalize waw
    text = re.sub(r'[ؤ]', 'و', text)
    # Normalize yaa
    text = re.sub(r'[ىئ]', 'ي', text)
    return text.strip()


def normalize_name(name: str) -> str:
    """Normalize a name for comparison."""
    if not name:
        return ''
    name = unicodedata.normalize('NFKC', name)
    name = normalize_arabic(name)
    name = name.lower().strip()
    return name


def dice_coefficient(s1: str, s2: str) -> float:
    """Sørensen–Dice coefficient for bigrams."""
    if s1 == s2:
        return 1.0
    if len(s1) < 2 or len(s2) < 2:
        return 0.0

    bigrams1: dict = {}
    for i in range(len(s1) - 1):
        bg = s1[i:i+2]
        bigrams1[bg] = bigrams1.get(bg, 0) + 1

    intersection = 0
    for i in range(len(s2) - 1):
        bg = s2[i:i+2]
        if bigrams1.get(bg, 0) > 0:
            bigrams1[bg] -= 1
            intersection += 1

    return (2.0 * intersection) / (len(s1) + len(s2) - 2)


def name_similarity(name1: str, name2: str) -> Tuple[float, List[str]]:
    """
    Compute composite name similarity for Arabic/Sudanese names.
    Returns (score 0-1, list of matching signals).
    """
    if not name1 or not name2:
        return 0.0, []

    n1 = normalize_name(name1)
    n2 = normalize_name(name2)

    signals: List[str] = []
    scores:  List[float] = []

    # Exact match
    if n1 == n2:
        return 1.0, ['exact_match']

    # Dice coefficient
    dice = dice_coefficient(n1, n2)
    scores.append(dice * 0.4)
    if dice > 0.7:
        signals.append(f'high_dice_similarity_{dice:.2f}')

    # Jaro-Winkler (handles transpositions and prefixes)
    jaro_winkler = jellyfish.jaro_winkler_similarity(n1, n2)
    scores.append(jaro_winkler * 0.35)
    if jaro_winkler > 0.85:
        signals.append('high_jaro_winkler')

    # Soundex for phonetic similarity
    try:
        if jellyfish.soundex(n1) == jellyfish.soundex(n2) and n1 and n2:
            scores.append(0.2)
            signals.append('soundex_match')
    except Exception:
        pass

    # Token overlap (for compound names)
    tokens1 = set(n1.split())
    tokens2 = set(n2.split())
    if tokens1 and tokens2:
        overlap = len(tokens1 & tokens2) / max(len(tokens1), len(tokens2))
        scores.append(overlap * 0.25)
        if overlap > 0.5:
            signals.append(f'token_overlap_{overlap:.1f}')

    total = min(1.0, sum(scores))
    return total, signals


def compute_member_similarity(m1: dict, m2: dict) -> Tuple[float, List[str]]:
    """
    Compute overall similarity between two family members.
    Considers name, birth year, gender, and tribe.
    """
    score = 0.0
    reasons: List[str] = []

    # Name similarity (most important signal)
    n1_ar = m1.get('fullNameArabic') or m1.get('fullName', '')
    n2_ar = m2.get('fullNameArabic') or m2.get('fullName', '')
    n1_en = m1.get('fullName', '')
    n2_en = m2.get('fullName', '')

    name_score_ar, ar_signals = name_similarity(n1_ar, n2_ar)
    name_score_en, en_signals = name_similarity(n1_en, n2_en)
    name_score = max(name_score_ar, name_score_en)

    score += name_score * 0.5
    if name_score > 0.7:
        reasons.append(f'اسم مشابه ({int(name_score * 100)}%)')

    # Birth year proximity
    by1 = m1.get('birthYear')
    by2 = m2.get('birthYear')
    if by1 and by2:
        year_diff = abs(by1 - by2)
        if year_diff == 0:
            score += 0.25
            reasons.append(f'نفس سنة الميلاد ({by1})')
        elif year_diff <= 2:
            score += 0.15
            reasons.append(f'سنة ميلاد متقاربة (فرق {year_diff} سنة)')

    # Gender match
    g1 = m1.get('gender', 'UNSPECIFIED')
    g2 = m2.get('gender', 'UNSPECIFIED')
    if g1 == g2 and g1 != 'UNSPECIFIED':
        score += 0.1
        reasons.append('نفس الجنس')

    # Tribe match
    t1 = m1.get('tribe', '')
    t2 = m2.get('tribe', '')
    if t1 and t2 and t1.lower() == t2.lower():
        score += 0.1
        reasons.append(f'نفس القبيلة ({t1})')

    # Father name similarity
    fn1 = m1.get('fatherName', '') or ''
    fn2 = m2.get('fatherName', '') or ''
    if fn1 and fn2:
        fn_score, _ = name_similarity(fn1, fn2)
        if fn_score > 0.8:
            score += 0.15
            reasons.append('اسم الأب مشابه')

    return min(1.0, score), reasons
