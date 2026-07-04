from app.db import get_pool


async def get_farm_context(question: str) -> dict | None:
    """
    Keyword-matches crop/seed names mentioned in the question against
    crops.name and growth_profiles.seed_name, and pulls the matching growth
    profile + recent bad-tray issues for that crop/seed as grounding context
    for synthesis. Plain substring match — no NLP/entity extraction; good
    enough for a farm's own crop catalog (a few dozen names).
    """
    pool = await get_pool()
    q = question.lower()

    crops = await pool.fetch("SELECT id, name FROM crops")
    matched_crop = next((c for c in crops if c["name"].lower() in q), None)

    seed_name: str | None = None
    profile = None

    if matched_crop:
        profile = await pool.fetchrow(
            "SELECT * FROM growth_profiles WHERE crop_id = $1 LIMIT 1",
            matched_crop["id"],
        )
        seed_name = profile["seed_name"] if profile else matched_crop["name"]
    else:
        seed_rows = await pool.fetch("SELECT DISTINCT seed_name FROM growth_profiles")
        matched = next((r["seed_name"] for r in seed_rows if r["seed_name"].lower() in q), None)
        if matched:
            seed_name = matched
            profile = await pool.fetchrow(
                "SELECT * FROM growth_profiles WHERE seed_name = $1 LIMIT 1",
                seed_name,
            )

    if not seed_name:
        return None

    bad_trays = await pool.fetch(
        """
        SELECT bte.issue, bte.severity, bte.created_at
        FROM bad_tray_entries bte
        JOIN cycles c ON c.id = bte.cycle_id
        WHERE c.seed_name = $1
        ORDER BY bte.created_at DESC
        LIMIT 5
        """,
        seed_name,
    )

    return {
        "matched_crop_or_seed": seed_name,
        "growth_profile": dict(profile) if profile else None,
        "recent_bad_tray_issues": [dict(r) for r in bad_trays],
    }


def format_farm_context(ctx: dict) -> str:
    """
    Renders get_farm_context()'s result as plain text for the LLM prompt.
    Only mentions fields that are actually populated — an unset field sent
    as "EC None" reads like a claim, not an absence, and risks the model
    treating it as a real (missing) data point instead of simply omitted.
    """
    lines = [f"Crop/seed: {ctx['matched_crop_or_seed']}"]

    profile = ctx.get("growth_profile")
    if profile:
        targets = []
        if profile.get("ec_target") is not None:
            targets.append(f"EC {profile['ec_target']}")
        if profile.get("ph_target_min") is not None and profile.get("ph_target_max") is not None:
            targets.append(f"pH {profile['ph_target_min']}-{profile['ph_target_max']}")
        if profile.get("fertigation_temp_c") is not None:
            targets.append(f"fertigation temp {profile['fertigation_temp_c']}°C")
        if profile.get("fertigation_rh_pct") is not None:
            targets.append(f"fertigation RH {profile['fertigation_rh_pct']}%")
        if profile.get("light_ppfd") is not None:
            light = f"light {profile['light_ppfd']} PPFD"
            if profile.get("light_hours") is not None:
                light += f" / {profile['light_hours']}h"
            targets.append(light)
        if profile.get("expected_yield_per_tray_kg") is not None:
            targets.append(f"expected yield {profile['expected_yield_per_tray_kg']} kg/tray")

        if targets:
            lines.append(f"Growth profile targets: {', '.join(targets)}.")
        else:
            lines.append("Growth profile exists but has no configured setpoints yet.")

    issues = ctx.get("recent_bad_tray_issues") or []
    if issues:
        issue_lines = "; ".join(
            f"{i['issue']} ({i['severity']}, {i['created_at']})" for i in issues
        )
        lines.append(f"Recent bad-tray issues for this crop: {issue_lines}.")
    else:
        lines.append("No recent bad-tray issues recorded for this crop.")

    return "\n".join(lines)
