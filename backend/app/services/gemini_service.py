import os
import re
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from google import genai
from google.genai import errors
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Base exception for AI service errors."""
    pass

class GeminiNotConfiguredError(GeminiServiceError):
    """Raised when no AI API key is configured."""
    pass

class GeminiService:
    def __init__(self):
        self._gemini_client: Optional[genai.Client] = None

    def get_provider(self) -> str:
        """
        Determines the AI provider:
        - 'openrouter' if OPENROUTER_API_KEY is provided or GEMINI_API_KEY starts with 'sk-' (e.g. OpenRouter key).
        - 'gemini' if GEMINI_API_KEY is set (and does not start with 'sk-').
        - 'none' if no key is configured.
        """
        openrouter_key = (getattr(settings, "OPENROUTER_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")).strip()
        if openrouter_key:
            return "openrouter"

        gemini_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
        if gemini_key.startswith("sk-or-") or gemini_key.startswith("sk-"):
            return "openrouter"
        if gemini_key:
            return "gemini"

        return "none"

    def is_configured(self) -> bool:
        return self.get_provider() != "none"

    def _get_openrouter_key(self) -> str:
        key = (getattr(settings, "OPENROUTER_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")).strip()
        if not key:
            key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
        return key

    def _get_gemini_client(self) -> genai.Client:
        key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
        if not key:
            raise GeminiNotConfiguredError(
                "Gemini API key is not configured on the server. Please set GEMINI_API_KEY in backend/.env to enable AI assistance."
            )
        if self._gemini_client is None:
            self._gemini_client = genai.Client(api_key=key)
        return self._gemini_client

    def get_model(self) -> str:
        if self.get_provider() == "openrouter":
            m = getattr(settings, "OPENROUTER_MODEL", "") or os.environ.get("OPENROUTER_MODEL", "")
            return m.strip() if m.strip() else "openrouter/free"
        m = settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")
        return m.strip() if m.strip() else "gemini-3.8-flash"

    async def _generate_openrouter(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        messages_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7
    ) -> str:
        api_key = self._get_openrouter_key()
        if not api_key:
            raise GeminiNotConfiguredError("OpenRouter API key is missing.")

        primary_model = self.get_model()
        models = [primary_model]
        for candidate in ["openrouter/free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"]:
            if candidate not in models:
                models.append(candidate)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if messages_history:
            for turn in messages_history:
                messages.append({
                    "role": "user" if turn.get("role") == "user" else "assistant",
                    "content": turn.get("content", "")
                })
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.PUBLIC_URL or settings.FRONTEND_URL,
            "X-Title": "AI Resume Builder"
        }

        last_err = None
        for model in models:
            try:
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": temperature
                        },
                        headers=headers
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            content = choices[0].get("message", {}).get("content", "")
                            if content:
                                return content.strip()
                    else:
                        err_text = resp.text[:200]
                        logger.warning(f"OpenRouter model {model} returned HTTP {resp.status_code}: {err_text}")
                        last_err = f"HTTP {resp.status_code}: {err_text}"
            except Exception as e:
                logger.warning(f"OpenRouter call failed for model {model}: {e}")
                last_err = str(e)
                continue

        raise GeminiServiceError(f"AI generation failed via OpenRouter: {last_err}")

    def _generate_gemini_sync(self, client: genai.Client, contents: str):
        primary_model = self.get_model()
        candidates = [primary_model]
        if "gemini-3.5-flash" not in candidates:
            candidates.append("gemini-3.5-flash")
        if "gemini-2.5-flash" not in candidates:
            candidates.append("gemini-2.5-flash")

        last_error = None
        for model in candidates:
            try:
                return client.models.generate_content(
                    model=model,
                    contents=contents
                )
            except errors.APIError as e:
                last_error = e
                logger.warning(f"Gemini API error on model {model} (HTTP {getattr(e, 'code', 'unknown')}): {e}. Trying fallback.")
                if getattr(e, 'code', None) in (429, 500, 503):
                    continue
                raise
            except Exception as e:
                last_error = e
                logger.warning(f"Unexpected error calling Gemini model {model}: {e}")
                continue

        if last_error:
            raise last_error

    async def _generate_gemini(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        client = self._get_gemini_client()
        full_contents = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        try:
            response = await asyncio.to_thread(
                self._generate_gemini_sync,
                client,
                full_contents
            )
            return (response.text or "").strip()
        except errors.APIError as e:
            logger.error(f"Gemini API error: {e}")
            raise GeminiServiceError(f"Google Gemini API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error calling Gemini: {e}")
            raise GeminiServiceError(f"Failed to communicate with Google Gemini: {str(e)}")

    async def _generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        messages_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7
    ) -> str:
        provider = self.get_provider()
        if provider == "openrouter":
            return await self._generate_openrouter(
                prompt=prompt,
                system_prompt=system_prompt,
                messages_history=messages_history,
                temperature=temperature
            )
        elif provider == "gemini":
            return await self._generate_gemini(
                prompt=prompt,
                system_prompt=system_prompt
            )
        else:
            raise GeminiNotConfiguredError(
                "AI service is not configured. Please set GEMINI_API_KEY (Google AI Studio) or OPENROUTER_API_KEY in backend/.env."
            )

    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """Generates structured JSON output from configured AI provider."""
        system_prompt = "You are a professional resume analysis AI. Always return strictly valid JSON only."
        raw = await self._generate_text(prompt=prompt, system_prompt=system_prompt, temperature=0.2)
        clean = raw.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        return json.loads(clean)

    async def generate_chat_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        section_context: Optional[str] = None,
        current_text: Optional[str] = None,
        resume_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates context-aware conversational assistant reply and optional actionable suggestion.
        """
        system_prompt = (
            "You are the AI Assistant for the AI-Powered Resume Builder application. "
            "Your mission is to help users craft exceptional, ATS-optimized, honest, and impactful resumes. "
            "Guidelines:\n"
            "- Never fabricate credentials, employment history, degrees, awards, or fake metrics.\n"
            "- If the user asks for resume improvements or rewrites, preserve their factual truth while enhancing clarity, strong action verbs, and readability.\n"
            "- When proposing a direct replacement or improvement for a specific resume section (such as a professional summary or bullet point), provide a clear explanation and format the suggested text so it can be easily copied or applied.\n"
            "- Maintain an encouraging, professional, and concise tone."
        )

        context_details = []
        if section_context:
            context_details.append(f"Current Resume Section: {section_context}")
        if current_text:
            context_details.append(f"Current Text in Section:\n\"\"\"{current_text}\"\"\"")
        if resume_context:
            target_role = resume_context.get("personal_info", {}).get("professional_title", "")
            if target_role:
                context_details.append(f"Target Professional Title: {target_role}")

        prompt = message
        if context_details:
            prompt = "ACTIVE RESUME CONTEXT:\n" + "\n".join(context_details) + f"\n\nUser Question: {message}"

        recent_history = history[-6:] if history else None

        reply_text = await self._generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            messages_history=recent_history
        )

        suggestion = None
        if section_context and current_text and any(k in message.lower() for k in ("improve", "rewrite", "generate", "bullet", "enhance")):
            suggestion = reply_text.strip()

        return {
            "reply": reply_text,
            "suggestion": suggestion,
            "section_context": section_context
        }

    async def improve_summary(
        self,
        text: str,
        role: Optional[str] = "",
        skills: Optional[List[str]] = None,
        action: str = "improve"
    ) -> str:
        """Improve or generate professional summary."""
        skills_str = ", ".join(skills) if skills else "relevant industry skills"

        if action == "generate" or not text.strip():
            prompt = (
                f"Write a concise, compelling, 3-4 sentence professional resume summary for a {role or 'professional'}. "
                f"Highlight core competencies including {skills_str}. "
                f"Do not invent specific past company names or unverified metrics. Keep it impactful, ATS-friendly, and ready to use."
            )
        else:
            prompt = (
                f"Improve the following professional summary for a {role or 'professional'} with skills ({skills_str}):\n\n"
                f"Original Summary:\n\"{text}\"\n\n"
                f"Requirements:\n"
                f"- Enhance professional vocabulary and impact with strong phrasing.\n"
                f"- Keep factual claims intact; do not fabricate awards or experience.\n"
                f"- Ensure it is concise (under 80 words), ATS-optimized, and impactful.\n"
                f"- Output ONLY the revised summary text without conversational preamble."
            )

        reply = await self._generate_text(
            prompt=prompt,
            system_prompt="You are an expert ATS resume editor. Output ONLY the improved summary text without quotes or conversational filler."
        )
        return reply.strip().strip('"')

    async def improve_description(
        self,
        text: str,
        role_or_project: Optional[str] = "",
        section_type: str = "experience",
        action: str = "improve"
    ) -> str:
        """Improve experience or project bullet points / responsibilities."""
        prompt = (
            f"You are an expert resume editor. Rewrite and elevate the following {section_type} description "
            f"for '{role_or_project or 'the role'}':\n\n"
            f"Original Content:\n\"{text}\"\n\n"
            f"Rules:\n"
            f"- Use strong action verbs at the beginning of bullet points (e.g., Developed, Engineered, Accelerated, Spearheaded).\n"
            f"- Preserve factual honesty; do NOT fabricate percentages, revenue numbers, or team sizes unless originally provided.\n"
            f"- Emphasize clarity, technical skill utilization, and tangible outcomes.\n"
            f"- Output the revised bullet points or paragraph directly, with no conversational preamble."
        )

        reply = await self._generate_text(
            prompt=prompt,
            system_prompt="You are an expert resume editor. Output ONLY the improved bullet points without preamble."
        )
        return reply.strip().strip('"')

    async def suggest_skills(
        self,
        job_title: str,
        current_skills: List[str]
    ) -> List[str]:
        """Suggest industry-relevant skills for a target job title."""
        current_skills_str = ", ".join(current_skills) if current_skills else "none specified"
        prompt = (
            f"Given the target job title '{job_title}', suggest 10-15 highly sought-after, industry-standard technical and professional skills. "
            f"Current candidate skills already listed: {current_skills_str}.\n"
            f"Respond ONLY with a valid JSON array of skill name strings. Example format: [\"Skill A\", \"Skill B\"]."
        )

        raw = await self._generate_text(
            prompt=prompt,
            system_prompt="You are a tech recruiter. Respond ONLY with a valid JSON array of strings."
        )
        raw = raw.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(s).strip() for s in parsed if s]
            return []
        except Exception as e:
            logger.warning(f"Could not parse skills JSON: {e}, raw: {raw[:100]}")
            found = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', raw)
            if found:
                return [f.strip() for f in found if len(f.strip()) > 1][:12]
            raise GeminiServiceError(f"Failed to parse skill suggestions: {str(e)}")

    async def analyze_job_match(
        self,
        job_description: str,
        resume_summary_text: str
    ) -> Dict[str, Any]:
        """Uses AI to identify semantic match highlights and actionable suggestions."""
        prompt = (
            f"Analyze the alignment between this Job Description and Candidate Resume.\n\n"
            f"JOB DESCRIPTION:\n\"\"\"{job_description[:3000]}\"\"\"\n\n"
            f"CANDIDATE RESUME SUMMARY:\n\"\"\"{resume_summary_text[:3000]}\"\"\"\n\n"
            f"Provide a structured JSON response with:\n"
            f"1. 'highlights': array of 2-3 specific strengths where candidate experience aligns with the JD.\n"
            f"2. 'actionable_tips': array of 3-4 concrete tips to tailor this resume honestly for this specific role.\n"
            f"Format as strict JSON: {{\"highlights\": [...], \"actionable_tips\": [...]}}"
        )

        try:
            raw = await self._generate_text(
                prompt=prompt,
                system_prompt="Respond strictly with a valid JSON object matching the requested schema."
            )
            raw = raw.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"AI job match analysis parsing fallback: {e}")
            return {
                "highlights": ["Relevant foundational skills match target job requirements."],
                "actionable_tips": [
                    "Align project descriptions with the exact technologies mentioned in the job description.",
                    "Ensure technical skills section highlights tools specified in the requirements.",
                    "Highlight quantifiable outcomes where applicable."
                ]
            }

gemini_service = GeminiService()
