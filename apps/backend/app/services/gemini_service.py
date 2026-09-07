"""
BaazarSetu — Gemini Service
Multimodal reasoning for product recognition and catalog generation.
Uses google-generativeai SDK.
"""
import json
import asyncio
import time
from pathlib import Path
from typing import Optional, Dict, Any

import google.generativeai as genai

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GeminiError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class GeminiService:
    """
    Wraps Google Gemini API for:
    - Product image recognition
    - Catalog text generation
    - AI business assistant reasoning
    All other tasks (translation, OCR, pricing) use dedicated services.
    """

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set — Gemini features will use fallback responses")
            self._enabled = False
            return
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self._enabled = True
        logger.info(f"GeminiService initialized with model={settings.GEMINI_MODEL}")

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def _call_with_retry(self, prompt: Any, image_bytes: Optional[bytes] = None) -> str:
        """Call Gemini with retry and timeout."""
        last_err = None
        for attempt in range(settings.GEMINI_MAX_RETRIES):
            try:
                parts = [prompt]
                if image_bytes is not None:
                    import PIL.Image
                    import io
                    img = PIL.Image.open(io.BytesIO(image_bytes))
                    parts = [img, prompt]

                # Run in executor to avoid blocking event loop
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: self._model.generate_content(parts)
                    ),
                    timeout=settings.GEMINI_TIMEOUT_SECONDS,
                )
                return response.text
            except asyncio.TimeoutError:
                last_err = GeminiError("Gemini API timeout")
                logger.warning(f"Gemini timeout (attempt {attempt+1})")
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                last_err = GeminiError(str(e))
                logger.warning(f"Gemini error (attempt {attempt+1}): {e}")
                await asyncio.sleep(2 ** attempt)
        raise last_err

    # ── Product Recognition ────────────────────────────────────────────────────

    async def recognize_product(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Send image to Gemini, extract structured product attributes.
        Returns a dict matching ProductRecognitionResult schema.
        Falls back to empty dict on failure.
        """
        if not self._enabled:
            return self._fallback_recognition()

        prompt = """
You are an expert product analyst specializing in Indian handicrafts and artisan products.

Analyze this product image and extract structured information. 
Respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.

Required JSON format:
{
  "product_name": "specific product name",
  "category": "main category (e.g. Textiles, Pottery, Jewelry, Woodwork, Paintings, Leather, Metalwork, Basketry)",
  "subcategory": "specific subcategory",
  "craft_type": "specific craft tradition (e.g. Madhubani, Warli, Dhokra, Banarasi, Chikankari)",
  "material": "primary material",
  "colour": "main colors as comma-separated string",
  "style": "aesthetic style or design tradition",
  "estimated_size": "rough size estimate",
  "visual_features": ["list", "of", "notable", "visual", "features"],
  "tags": ["relevant", "search", "tags"],
  "confidence": 0.85
}

Confidence should reflect how certain you are (0.0 to 1.0).
If you cannot identify the product confidently, set confidence below 0.5.
"""
        try:
            raw = await self._call_with_retry(prompt, image_bytes)
            result = self._parse_json_response(raw)
            self._validate_recognition_result(result)
            logger.info("Product recognition successful", extra={"confidence": result.get("confidence")})
            return result
        except GeminiError as e:
            logger.error(f"Gemini recognition failed: {e}")
            return self._fallback_recognition()
        except json.JSONDecodeError as e:
            logger.error(f"Gemini returned invalid JSON: {e}")
            return self._fallback_recognition()

    def _fallback_recognition(self) -> Dict[str, Any]:
        return {
            "product_name": "",
            "category": "",
            "subcategory": "",
            "craft_type": "",
            "material": "",
            "colour": "",
            "style": "",
            "estimated_size": "",
            "visual_features": [],
            "tags": [],
            "confidence": 0.0,
            "_fallback": True,
        }

    def _validate_recognition_result(self, result: Dict[str, Any]) -> None:
        required = ["product_name", "category", "confidence"]
        for key in required:
            if key not in result:
                raise ValueError(f"Missing required key in recognition result: {key}")
        conf = result.get("confidence", 0)
        if not isinstance(conf, (int, float)) or not 0 <= conf <= 1:
            result["confidence"] = 0.0

    # ── Catalog Generation ─────────────────────────────────────────────────────

    async def generate_catalog(
        self,
        image_bytes: Optional[bytes],
        recognition_result: Dict[str, Any],
        seller_context: str,
        artisan_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate professional product catalog using image + recognition + seller context.
        Returns structured catalog dict.
        """
        if not self._enabled:
            return self._fallback_catalog(recognition_result)

        prompt = f"""
You are an expert product catalog writer specializing in Indian artisan and handicraft products.

Product Information Gathered:
- Category: {recognition_result.get('category', 'Unknown')}
- Craft Type: {recognition_result.get('craft_type', 'Unknown')}
- Material: {recognition_result.get('material', 'Unknown')}
- Colours: {recognition_result.get('colour', 'Unknown')}
- Visual Features: {', '.join(recognition_result.get('visual_features', []))}

Artisan Context:
- State: {artisan_info.get('state', 'India')}
- Experience: {artisan_info.get('experience_years', 0)} years
- Business: {artisan_info.get('business_name', 'Artisan Business')}

Seller's Own Description (may be in regional language, already translated):
{seller_context}

Your task: Write a compelling, honest, professional product listing for an Indian artisan marketplace.

Respond ONLY with a valid JSON object — no markdown, no explanation:
{{
  "title": "Professional, specific product title (max 80 chars)",
  "description": "Compelling 3-4 sentence description highlighting craftsmanship, uniqueness, cultural significance, and use",
  "category": "standardized category",
  "subcategory": "specific subcategory",
  "craft_type": "specific craft tradition",
  "material": "primary materials",
  "color": "main colors",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}}

Rules:
- Be honest — do not invent features not visible in image or mentioned in context
- Use simple, clear English
- Highlight the handmade, artisan nature
- Include cultural context where appropriate
"""
        try:
            raw = await self._call_with_retry(prompt, image_bytes)
            result = self._parse_json_response(raw)
            logger.info("Catalog generation successful")
            return result
        except Exception as e:
            logger.error(f"Gemini catalog generation failed: {e}")
            return self._fallback_catalog(recognition_result)

    def _fallback_catalog(self, recognition: Dict[str, Any]) -> Dict[str, Any]:
        name = recognition.get("product_name", "Artisan Product")
        return {
            "title": name,
            "description": f"A handcrafted {name} made by a skilled Indian artisan.",
            "category": recognition.get("category", ""),
            "subcategory": recognition.get("subcategory", ""),
            "craft_type": recognition.get("craft_type", ""),
            "material": recognition.get("material", ""),
            "color": recognition.get("colour", ""),
            "tags": recognition.get("tags", []),
            "seo_keywords": [],
            "_fallback": True,
        }

    # ── Business Assistant ────────────────────────────────────────────────────

    async def chat_assistant(
        self,
        user_message: str,
        context_data: Dict[str, Any],
        conversation_history: Optional[list] = None,
    ) -> str:
        """
        Artisan AI assistant reasoning over real business data.
        context_data contains DB-fetched orders, products, inventory, etc.
        """
        if not self._enabled:
            return "AI assistant is currently unavailable. Please check your Gemini API key."

        context_json = json.dumps(context_data, default=str, ensure_ascii=False, indent=2)

        system_prompt = f"""
You are BaazarSetu Assistant, a helpful business advisor for Indian artisans and micro-entrepreneurs.
You have access to the artisan's real business data below. 
Answer questions honestly, kindly, and in simple language.
Never invent numbers — only use the data provided.
If data is not available, say so clearly.
Always respond in the same language as the user's message.

ARTISAN'S BUSINESS DATA:
{context_json}
"""
        full_prompt = f"{system_prompt}\n\nARTISAN'S QUESTION: {user_message}"

        try:
            response_text = await self._call_with_retry(full_prompt)
            return response_text
        except GeminiError as e:
            logger.error(f"Assistant chat failed: {e}")
            return "I'm having trouble connecting right now. Please try again in a moment."

    # ── Pricing Explanation ───────────────────────────────────────────────────

    async def generate_pricing_explanation(
        self,
        cost_data: Dict[str, Any],
        market_data: Dict[str, Any],
        pricing_result: Dict[str, Any],
        preferred_language: str = "en",
    ) -> str:
        """Generate a human-readable pricing explanation for the artisan."""
        if not self._enabled:
            return self._fallback_pricing_explanation(cost_data, pricing_result)

        prompt = f"""
You are helping an Indian artisan understand why a price was suggested for their product.
Write a clear, encouraging 2-3 sentence explanation in simple English.

Cost Details:
- Material cost: ₹{cost_data.get('raw_material_cost', 0)}
- Labour cost: ₹{cost_data.get('labour_cost', 0)}
- Packaging: ₹{cost_data.get('packaging_cost', 0)}
- Transport: ₹{cost_data.get('transport_cost', 0)}
- Total cost: ₹{cost_data.get('total_cost', 0)}

Market Information:
- Similar products sell between ₹{market_data.get('min_price', 0)} and ₹{market_data.get('max_price', 0)}
- Market average: ₹{market_data.get('average_price', 0)}

Recommended Price:
- Minimum (break-even): ₹{pricing_result.get('minimum_price', 0)}
- Suggested price: ₹{pricing_result.get('suggested_price', 0)}
- Maximum (premium): ₹{pricing_result.get('maximum_price', 0)}
- Expected profit margin: {pricing_result.get('profit_margin', 0):.1f}%

Write the explanation in {preferred_language} language.
Start with "Your" and be warm and encouraging.
Never say the price is guaranteed.
"""
        try:
            return await self._call_with_retry(prompt)
        except Exception:
            return self._fallback_pricing_explanation(cost_data, pricing_result)

    def _fallback_pricing_explanation(
        self, cost_data: Dict, pricing_result: Dict
    ) -> str:
        total = cost_data.get("total_cost", 0)
        suggested = pricing_result.get("suggested_price", 0)
        margin = pricing_result.get("profit_margin", 0)
        return (
            f"Your total production cost is ₹{total:.0f}. "
            f"Based on your costs and current market conditions, "
            f"a suggested price of ₹{suggested:.0f} gives you an estimated profit margin of {margin:.1f}%. "
            f"You can adjust this price based on your experience and local demand."
        )

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_json_response(text: str) -> Dict[str, Any]:
        """Extract JSON from Gemini response, handling markdown fences."""
        text = text.strip()
        # Remove markdown code fences
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:])
            if text.endswith("```"):
                text = text[: text.rfind("```")]
        return json.loads(text.strip())


gemini_service = GeminiService()
