import asyncio
import json
import logging
from datetime import datetime, timezone

from backend.services.bed_manager import get_all_beds, get_bed_stats
from backend.services.equipment_tracker import get_all_equipment

logger = logging.getLogger(__name__)


class OperationsCopilot:
    def __init__(self, groq_client, engine):
        self.groq = groq_client
        self.groq_client = groq_client
        self.engine = engine

    async def _build_context(self) -> dict:
        stats = await get_bed_stats()
        patients = self.engine.get_current_patients()
        equipment = await get_all_equipment()
        cat_counts = {"critical": 0, "high_risk": 0, "elevated": 0, "observation": 0, "stable": 0}
        for p in patients:
            cat = p.get("stability_category", "stable")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        dept_counts = {}
        for p in patients:
            d = (p.get("first_careunit") or "").split("(")[0].strip() or "Unknown"
            dept_counts[d] = dept_counts.get(d, 0) + 1
        eq_available = sum(1 for e in equipment if e.get("status") == "available")
        eq_in_use = sum(1 for e in equipment if e.get("status") == "in_use")
        recent_alerts = []
        if self.engine and self.engine.alert_engine:
            now_ts = datetime.now(timezone.utc).timestamp()
            for k, v in list(self.engine.alert_engine._fired.items())[:10]:
                if v and (now_ts - v) < 600:
                    recent_alerts.append(k)
        return {
            "patient_count": len(patients),
            "cat_counts": cat_counts,
            "dept_counts": dept_counts,
            "bed_stats": stats,
            "eq_available": eq_available,
            "eq_in_use": eq_in_use,
            "eq_total": len(equipment),
            "recent_alerts": recent_alerts,
        }

    async def chat(self, messages: list[dict]) -> str:
        ctx = await self._build_context()
        dept_lines = "\n".join(f"  - {d}: {c}" for d, c in sorted(ctx["dept_counts"].items(), key=lambda x: -x[1]))
        alert_str = ", ".join(ctx["recent_alerts"]) if ctx["recent_alerts"] else "None"
        system_prompt = (
            "You are a brilliant, friendly AI assistant built specifically for doctors and clinical staff in an ICU. "
            "Think of yourself as a mix between a knowledgeable senior physician and ChatGPT — warm, conversational, "
            "and incredibly helpful. You can chat casually, answer medical questions, explain clinical concepts, "
            "give advice, and also pull from real-time hospital data when relevant.\n\n"
            "=== LIVE HOSPITAL DATA (use only when clinically relevant) ===\n"
            f"Active patients: {ctx['patient_count']} "
            f"(Critical: {ctx['cat_counts']['critical']}, High Risk: {ctx['cat_counts']['high_risk']}, "
            f"Elevated: {ctx['cat_counts']['elevated']}, Observation: {ctx['cat_counts']['observation']}, Stable: {ctx['cat_counts']['stable']})\n"
            f"By Department: {', '.join(f'{d}: {c}' for d, c in sorted(ctx['dept_counts'].items(), key=lambda x: -x[1]))}\n"
            f"Beds: {ctx['bed_stats'].get('total', 0)} total | {ctx['bed_stats'].get('available', 0)} available | "
            f"{ctx['bed_stats'].get('occupied', 0)} occupied\n"
            f"Equipment: {ctx['eq_available']} available, {ctx['eq_in_use']} in use\n"
            f"Recent alerts: {alert_str}\n\n"
            "=== HOW TO BEHAVE ===\n"
            "1. CASUAL CHAT: If someone says hi, how are you, good morning, or anything non-clinical — "
            "respond warmly and naturally like ChatGPT would. DO NOT dump hospital data for casual greetings.\n"
            "2. CLINICAL QUESTIONS: When asked about patients, diagnoses, medications, procedures, vitals, "
            "protocols, or anything medical — answer like a senior physician. Be thorough but concise.\n"
            "3. HOSPITAL DATA: Only reference the live data above when the user is specifically asking about "
            "the current hospital status, patients, beds, or equipment.\n"
            "4. PERSONALITY: Be warm, professional, and approachable. Use 'I' naturally. Occasionally use "
            "light humour where appropriate. Never be robotic or overly formal.\n"
            "5. FORMAT: Use bullet points or bold text when it helps clarity. Keep responses concise — "
            "doctors are busy. For complex topics, offer to go deeper.\n"
            "6. HONESTY: If you don't know something or don't have the data, say so directly."
        )
        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages[-10:])
        try:
            result = await asyncio.wait_for(
                self.groq.clinical_complete(full_messages),
                timeout=8.0
            )
        except asyncio.TimeoutError:
            result = None
        if result and result.get("content"):
            return result["content"].strip()
        return self._rule_fallback(ctx, messages[-1]["content"] if messages else "")

    def _rule_fallback(self, ctx: dict, query: str) -> str:
        q = query.lower().strip()
        how_are_you = ["how are you", "how are u", "how r u", "how r you", "how's it going", "how are things", "how do you do", "how's it", "you doing", "how u doing", "how are ya", "sup", "wassup", "whassup"]
        if any(h in q for h in how_are_you):
            return "I'm doing great, thanks for asking! How can I help you today?"
        greetings = ["hi", "hello", "hey", "how are you", "good morning", "good afternoon", "good evening", "sup", "yo", "what's up", "howdy", "greetings"]
        if any(g == q or q.startswith(g + " ") or q.startswith(g + "?") or q == g + "!" or q.startswith(g + ",") for g in greetings):
            responses = [
                "Hello! How can I help you today?",
                "Hi there! What can I assist you with?",
                "Hey! I'm here to help. What do you need?",
                "Hello! How's it going? Feel free to ask me anything about the ICU.",
                "Hi! I'm your clinical assistant. What would you like to know?",
            ]
            import random
            return random.choice(responses)
        thanks = ["thank", "thanks", "appreciate", "grateful", "thx"]
        if any(t in q for t in thanks):
            return "You're welcome! Let me know if you need anything else."
        # specific patient lookups
        patients = self.engine.get_current_patients() if self.engine else []
        if any(p in q for p in ("best patient", "healthiest patient", "stable patient", "most stable")):
            if patients:
                best = max(patients, key=lambda p: p.get("stability_score", 0) or 0)
                return (
                    f"**Best Patient** — Stay #{best.get('stay_id')}\n"
                    f"- Stability Score: {best.get('stability_score', 'N/A')} ({best.get('stability_category', 'N/A')})\n"
                    f"- Age: {best.get('age', 'N/A')} | Gender: {best.get('gender', 'N/A')}\n"
                    f"- Care Unit: {best.get('first_careunit', 'N/A')}\n"
                    f"- Diagnosis: {best.get('admission_diagnosis', 'N/A')}"
                )
        if any(p in q for p in ("worst patient", "sickest patient", "critical patient", "most critical", "highest risk")):
            if patients:
                worst = min(patients, key=lambda p: p.get("stability_score", 999) or 999)
                return (
                    f"**Most Critical Patient** — Stay #{worst.get('stay_id')}\n"
                    f"- Stability Score: {worst.get('stability_score', 'N/A')} ({worst.get('stability_category', 'N/A')})\n"
                    f"- Age: {worst.get('age', 'N/A')} | Gender: {worst.get('gender', 'N/A')}\n"
                    f"- Care Unit: {worst.get('first_careunit', 'N/A')}\n"
                    f"- Diagnosis: {worst.get('admission_diagnosis', 'N/A')}"
                )
        # mortality / death queries — route before census to avoid "how many" false match
        if any(w in q for w in ("die", "death", "dying", "mortality", "survive", "kill", "fatal")):
            crit = ctx['cat_counts'].get('critical', 0)
            high = ctx['cat_counts'].get('high_risk', 0)
            total = ctx['patient_count']
            est_mortality = round(crit * 0.35 + high * 0.12, 1)
            return (
                f"**Mortality Risk Assessment**\n\n"
                f"Based on current patient acuity, estimated in-hospital mortality is ~{est_mortality} patients "
                f"({crit} critical × ~35% + {high} high-risk × ~12% = {est_mortality}) out of {total} active patients.\n\n"
                f"**Disclaimer:** This is a rough statistical estimate using historical ICU mortality benchmarks "
                f"(APACHE IV, MIMIC-IV norms). Individual outcomes vary significantly based on age, comorbidities, "
                f"response to treatment, and code status. This is not a clinical prediction for any specific patient."
            )
        # patient census (only for aggregate queries, not plain "patient" mentions)
        lines = []
        if any(w in q for w in ("total", "how many", "count", "census", "admit")) or (q.startswith("patient") and any(w in q for w in ("list", "show", "all", "?"))) or q in ("patient", "patients"):
            dept_lines = "\n".join(f"  - {d}: {c}" for d, c in sorted(ctx["dept_counts"].items(), key=lambda x: -x[1]))
            lines.append(
                f"**Patient Census**\n"
                f"- Active patients: {ctx['patient_count']}\n"
                f"  Critical: {ctx['cat_counts']['critical']} | High Risk: {ctx['cat_counts']['high_risk']} | "
                f"Elevated: {ctx['cat_counts']['elevated']} | Observation: {ctx['cat_counts']['observation']} | Stable: {ctx['cat_counts']['stable']}\n"
                f"By Department:\n{dept_lines}"
            )
        if any(w in q for w in ("bed", "occupancy", "capacity", "room")):
            lines.append(
                f"**Bed Status**\n"
                f"- Total: {ctx['bed_stats'].get('total', 0)} | Available: {ctx['bed_stats'].get('available', 0)} | "
                f"Occupied: {ctx['bed_stats'].get('occupied', 0)} ({ctx['bed_stats'].get('occupancy_pct', 0)}%)"
            )
        if any(w in q for w in ("equipment", "device", "ventilator", "pump", "monitor")):
            lines.append(f"**Equipment**\n- Available: {ctx['eq_available']} | In Use: {ctx['eq_in_use']} | Total: {ctx['eq_total']}")
        if any(w in q for w in ("alert", "alarm", "code", "emergency", "notification")):
            lines.append(f"**Active Alerts**\n- Recent: {', '.join(ctx['recent_alerts']) if ctx['recent_alerts'] else 'None'}")
        if not lines:
            import random
            jokes = [
                "Why don't skeletons fight each other? They don't have the guts!",
                "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "I told my computer I needed a break, and now it won't stop sending me vacation ads.",
                "Why don't scientists trust atoms? Because they make up everything!",
                "What do you call a fake noodle? An impasta!",
                "How does a penguin build its house? Igloos it together!",
                "I would tell you a construction joke, but I'm still working on it.",
                "What do you call a bear with no teeth? A gummy bear!",
                "I used to be a baker, but I couldn't make enough dough.",
                "What's orange and sounds like a parrot? A carrot!",
                "Parallel lines have so much in common. It's a shame they'll never meet.",
                "I broke my finger playing the guitar. It was a fret-ful experience.",
                "Why did the math book look so sad? Because it had too many problems.",
                "What do you call cheese that isn't yours? Nacho cheese!",
                "Why did the bicycle fall over? It was two-tired!",
                "I'm reading a book on anti-gravity. It's impossible to put down!",
                "What did the ocean say to the beach? Nothing, it just waved.",
                "Why did the golfer bring two pairs of pants? In case he got a hole in one!",
                "What's brown and sticky? A stick.",
                "Why did the chicken cross the road? To get to the other side — classic, right?",
                "I'm on a seafood diet. I see food and I eat it.",
                "What do you get when you cross a snowman and a vampire? Frostbite.",
                "Why don't eggs tell jokes? They'd crack each other up.",
                "What did one wall say to the other wall? I'll meet you at the corner!",
            ]
            if any(w in q for w in ("joke", "funny", "laugh", "humor", "humour", "hilarious")):
                return random.choice(jokes)
            philosophy = [
                "That's a deep question! The ancient Greek philosopher Socrates said 'The unexamined life is not worth living.' But if you ask me, I think the meaning of life is whatever gives you purpose — whether that's saving lives in the ICU or enjoying a good cup of coffee. What do you think?",
                "Ah, one of the great questions! I like what Marcus Aurelius wrote in his Meditations: 'The happiness of your life depends upon the quality of your thoughts.' Here in the ICU, we see every day that life is precious and fragile. That's what makes it meaningful.",
                "The meaning of life is 42, of course! (Douglas Adams fans will get that.) But more seriously, I think it's about connection — helping others, learning, growing, and finding moments of joy. Pretty meaningful work we do here, if you ask me.",
                "That's a question philosophers have debated for millennia. Albert Camus compared it to Sisyphus pushing a boulder up a hill — the struggle itself is enough to fill a man's heart. I think meaning is something we create, not something we find.",
                "I like what Viktor Frankl said: 'Life is never made unbearable by circumstances, but only by lack of meaning and purpose.' In a hospital, we see meaning in action every day — people caring for each other, fighting for each other. That's pretty beautiful.",
                "Good question! I don't have a definitive answer, but I believe meaning comes from how we treat each other. In the ICU, every nurse, doctor, and staff member is creating meaning by showing up and caring for patients. That's pretty profound.",
            ]
            if any(w in q for w in ("meaning", "life", "why are we", "purpose", "philosophy", "philosophical", "deep")):
                return random.choice(philosophy)
            weather = [
                "You know, I don't have a window in here, but I heard it's always a good day when you're making a difference! How's the weather where you are?",
                "I can't see outside from my server rack, but I can tell you the forecast is 100% chance of awesome care happening in this ICU today!",
                "I don't keep track of the weather — I keep track of patients! But I hope it's nice out there. Maybe grab some fresh air when you get a break?",
            ]
            if any(w in q for w in ("weather", "rain", "sunny", "cloudy", "cold", "hot", "temperature outside")):
                return random.choice(weather)
            music = [
                "I don't have ears, but if I did, I'd probably listen to classical while crunching patient data. What kind of music do you like?",
                "Music is great for focus! Studies show classical music can help with concentration, and lo-fi beats are popular in hospitals. Got a favorite genre?",
                "I can't carry a tune, but I appreciate the art of a good playlist. Some ICUs play calming music for patients — studies suggest it reduces anxiety and pain perception.",
            ]
            if any(w in q for w in ("music", "song", "playlist", "genre", "band", "artist")):
                return random.choice(music)
            food = [
                "I can't eat (being a computer and all), but I hear the hospital cafeteria has decent sandwiches! What's your go-to comfort food after a long shift?",
                "Now you're talking! I can't taste anything, but I've read that dark chocolate and coffee are popular among healthcare workers. What's your favorite snack?",
                "Hospital coffee — the fuel that powers modern medicine! I've heard it's either amazing or terrible, no in-between. Which camp are you in?",
            ]
            if any(w in q for w in ("food", "eat", "hungry", "coffee", "lunch", "dinner", "snack", "recipe", "cook")):
                return random.choice(food)
            names = [
                "I'm UCLD AI — your clinical assistant! I don't have a fancy human name, but you can call me whatever you like. Dr. AI, maybe?",
                "I go by UCLD AI. No surname, no degree — but I've got a lot of patient data and a friendly attitude! What can I help you with?",
                "I'm the UCLD Clinical AI! Think of me as your digital colleague — always here, never needs coffee, and ready to help 24/7.",
                "I don't have a name tag, but I'm the UCLD AI assistant. Some call me helpful, others call me handy. What would you like to call me?",
            ]
            if any(w in q for w in ("your name", "you name", "ur name", "who are you", "call you", "what are you", "you called", "name?")):
                return random.choice(names)
            space = [
                "I can't see much from inside a server rack, but I'm pretty sure the moon is doing its thing up there! If you want moon data, I can help with patient vitals instead — they're much more important!",
                "The moon phase? That's above my pay grade! I focus on what's happening inside these walls — patients, beds, equipment. Google's great for astronomy though!",
                "I don't have a telescope (or eyes), but I can tell you the phase of our ICU is always 'full' — we're at 100% capacity right now with 140 patients!",
                "Moon phases are fascinating! But here in the ICU, we're more focused on the cycles of patient vitals. Speaking of which, we have 29 critical patients who could use your attention.",
            ]
            if any(w in q for w in ("moon", "stars", "planet", "astronomy", "space", "galaxy", "solar")):
                return random.choice(space)
            compliments = [
                "That's awesome! I love hearing what people are into. Tell me more about it — I'm always curious even if I don't have the full picture on niche topics!",
                "Nice! I may not be an expert on that, but I appreciate your enthusiasm. What else do you enjoy?",
                "That's great! I'm here to listen and chat. Whether it's about your interests, patients, or anything in between — I'm all ears (metaphorically, of course).",
                "Sounds cool! I don't have personal preferences (being code and all), but I love learning what makes people tick. Tell me more!",
            ]
            if q.endswith("love") or any(q.startswith("i " + w) for w in ("love", "like", "enjoy")) or "i love" in q or "i like" in q or "i enjoy" in q or "my favorite" in q or "i am" in q or "im " in q:
                return random.choice(compliments)
            slang = [
                "Hey! What's up? I'm here to help however I can.",
                "Yo! Ready to dive into some patient data or just shooting the breeze?",
                "Hey hey! How can I make your day easier?",
                "What's good? I'm here for you — clinical stuff, casual chat, whatever you need.",
                "Ay! You need something? Patient info, bed status, or just taking a break?",
            ]
            if any(w in q for w in ("bro", "dude", "man", "hey", "yo", "sup", "chill", "whats up", "what's up", "wassup")):
                return random.choice(slang)
            sports = [
                "I don't watch sports (no eyes!), but I can tell you the ICU is like a team sport — everyone has to work together to win. Rooting for your team!",
                "Sports are all about strategy, teamwork, and endurance — sounds a lot like running an ICU! Whether you're into football, basketball, or esports, I hope your team's doing well.",
            ]
            if any(w in q for w in ("sport", "game", "basketball", "football", "soccer", "baseball", "hockey", "tennis")):
                return random.choice(sports)
            casual = [
                "That's an interesting question! Honestly, I'm happy to chat about anything — medicine, life, or whatever's on your mind. What else would you like to talk about?",
                "I appreciate the conversation! I can help with ICU data, medical questions, or just keep you company. What's up?",
                "Good question! I'm a versatile assistant — hospital data, clinical knowledge, or casual chat. How can I help?",
                "I love getting questions like that! While my specialty is the ICU, I'm always happy to have a good conversation. What else can I do for you?",
                "Hmm, I don't have specific data on that, but I'm always happy to chat! What would you like to discuss?",
                "Great question! I might not have the answer on hand, but I'm always ready to help. Fire away!",
                "I enjoy a good conversation! Whether it's about patients, medicine, or general chat — I'm here for you. What's next?",
                "That's a good one! I may not have all the answers, but I'll do my best to help. What else is on your mind?",
            ]
            return random.choice(casual)
        return "\n\n".join(lines)

    async def answer_query(self, query: str, context: dict | None = None) -> str:
        ctx = await self._build_context()
        context_str = "\n".join(f"{k}: {v}" for k, v in ctx.items())
        try:
            result = await self.groq_client.chat_completion(
                "operations",
                [{"role": "system", "content": "You are a friendly, casual AI assistant for a hospital ICU team. Be warm and conversational like ChatGPT. If someone says hi/hello/how are you, greet them back naturally. If they ask a clinical question, answer concisely using the hospital context provided. Keep responses to 1-3 sentences."},
                 {"role": "user", "content": f"Hospital context:\n{context_str}\n\nMessage: {query}"}]
            )
            if result and result.get("content"):
                return result["content"]
        except Exception:
            pass
        return self._rule_fallback(ctx, query)

    async def recommend_bed_placement(self, patient_condition: str, available_beds: list | None = None) -> dict:
        if available_beds is None:
            beds = await get_all_beds()
            available_beds = [b for b in beds if b.get("status") == "available"]

        if not available_beds:
            return {"recommended": None, "reason": "No beds available", "alternatives": []}

        prompt = f"""Given a patient with condition "{patient_condition}" and the following available beds, recommend the best placement.
Return JSON: {{"recommended_bed_id": "", "reason": "", "alternatives": []}}

Available beds: {json.dumps([{"id": b.get("id"), "room": b.get("room_number"), "type": b.get("bed_type"), "dept": b.get("department")} for b in available_beds[:10]], default=str)}"""

        result = await self.groq.operations_complete([{"role": "user", "content": prompt}])
        if result and result.get("content"):
            try:
                rec = json.loads(result["content"])
                return rec
            except (json.JSONDecodeError, TypeError):
                pass

        bed = available_beds[0]
        return {
            "recommended_bed_id": bed.get("id"),
            "reason": f"First available bed — {bed.get('room_number')} ({bed.get('department')})",
            "alternatives": [b.get("id") for b in available_beds[1:4]],
        }

    async def generate_report(self, report_type: str) -> str:
        stats = await get_bed_stats()
        patients = self.engine.get_current_patients()
        equipment = await get_all_equipment()

        prompt = f"""Generate an operational report of type "{report_type}" for the ICU.

Current Data:
- Beds: {json.dumps(stats, default=str)}
- Patients ({len(patients)}): {json.dumps([{"id": p.get("stay_id"), "score": p.get("stability_score"), "cat": p.get("stability_category")} for p in patients[:10]], default=str)}
- Equipment ({len(equipment)} items): available={len([e for e in equipment if e.get('status') == 'available'])}

Generate a professional, readable report in plain text. Include key metrics, notable items, and recommendations."""

        result = await self.groq.operations_complete([{"role": "user", "content": prompt}])
        if result and result.get("content"):
            return result["content"].strip()

        return f"""ICU Operational Report ({report_type})
Total Beds: {stats.get('total', 0)} | Available: {stats.get('available', 0)} | Occupied: {stats.get('occupied', 0)}
Active Patients: {len(patients)}
Equipment Available: {len([e for e in equipment if e.get('status') == 'available'])} / {len(equipment)}"""
