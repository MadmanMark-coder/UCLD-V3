STABILITY_RULES = [
    {"key": "heart_rate", "normal_low": 60, "normal_high": 100, "deduction_per_10": 10},
    {"key": "sbp", "normal_low": 90, "normal_high": 180, "deduction_per_10": 10},
    {"key": "dbp", "normal_low": 60, "normal_high": 90, "deduction_per_10": 10},
    {"key": "spo2", "normal_low": 95, "normal_high": 100, "deduction_per_1": 15},
    {"key": "resp_rate", "normal_low": 12, "normal_high": 20, "deduction_per_5": 8},
    {"key": "temperature", "normal_low": 36, "normal_high": 37.5, "deduction_per_1": 10},
    {"key": "glucose", "normal_low": 70, "normal_high": 180, "deduction_per_10": 8},
]

CATEGORY_MAP = [
    (80, "stable"),
    (60, "observation"),
    (40, "elevated"),
    (20, "high_risk"),
    (0, "critical"),
]


def calculate_stability_score(vitals: dict) -> dict:
    score = 100.0

    for rule in STABILITY_RULES:
        val = vitals.get(rule["key"])
        if val is None:
            continue

        low = rule["normal_low"]
        high = rule["normal_high"]

        if val < low:
            diff = low - val
            if "deduction_per_1" in rule:
                score -= diff * rule["deduction_per_1"]
            elif "deduction_per_10" in rule:
                score -= (diff // 10) * rule["deduction_per_10"]
            elif "deduction_per_5" in rule:
                score -= (diff // 5) * rule["deduction_per_5"]
        elif val > high:
            diff = val - high
            if "deduction_per_1" in rule:
                score -= diff * rule["deduction_per_1"]
            elif "deduction_per_10" in rule:
                score -= (diff // 10) * rule["deduction_per_10"]
            elif "deduction_per_5" in rule:
                score -= (diff // 5) * rule["deduction_per_5"]

    score = max(0, min(100, int(round(score))))

    for threshold, category in CATEGORY_MAP:
        if score >= threshold:
            return {"score": score, "category": category}

    return {"score": score, "category": "critical"}
