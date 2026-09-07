"""
BaazarSetu — AI Services Unit Tests (mocked)
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
class TestGeminiService:
    async def test_recognize_product_returns_fallback_when_disabled(self):
        """When Gemini key is missing, recognize_product returns fallback."""
        with patch("app.services.gemini_service.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = None
            from app.services.gemini_service import GeminiService
            svc = GeminiService.__new__(GeminiService)
            svc._enabled = False
            result = svc._fallback_recognition()
        assert result["confidence"] == 0.0
        assert result["_fallback"] is True

    async def test_parse_json_response_strips_markdown(self):
        """_parse_json_response handles markdown-wrapped JSON."""
        from app.services.gemini_service import GeminiService
        raw = '```json\n{"key": "value"}\n```'
        result = GeminiService._parse_json_response(raw)
        assert result == {"key": "value"}

    async def test_parse_json_response_clean(self):
        from app.services.gemini_service import GeminiService
        raw = '{"product_name": "Kurta", "confidence": 0.85}'
        result = GeminiService._parse_json_response(raw)
        assert result["product_name"] == "Kurta"
        assert result["confidence"] == 0.85

    async def test_fallback_catalog_uses_recognition(self):
        from app.services.gemini_service import GeminiService
        svc = GeminiService.__new__(GeminiService)
        svc._enabled = False
        recognition = {"product_name": "Blue Pottery Vase", "category": "Pottery"}
        result = svc._fallback_catalog(recognition)
        assert "Pottery Vase" in result["title"]
        assert result["_fallback"] is True

    async def test_fallback_pricing_explanation(self):
        from app.services.gemini_service import GeminiService
        svc = GeminiService.__new__(GeminiService)
        cost = {"total_cost": 450}
        pricing = {"suggested_price": 800, "profit_margin": 43.75}
        explanation = svc._fallback_pricing_explanation(cost, pricing)
        assert "₹450" in explanation
        assert "₹800" in explanation


@pytest.mark.asyncio
class TestPricingService:
    def test_fallback_price_above_cost(self):
        """Fallback algorithm should always return price above unit cost."""
        from app.services.pricing_service import PricingService
        svc = PricingService.__new__(PricingService)
        svc._model = None
        svc._use_fallback = True
        svc._model_loaded = True

        product_info = {"category": "textiles", "craft_type": "chikankari"}
        cost_data = {"raw_material_cost": 200, "labour_cost": 150, "packaging_cost": 30, "transport_cost": 20, "quantity": 1}
        unit_cost = 400

        result = svc._fallback_price(product_info, cost_data, None, unit_cost)
        assert result["minimum_price"] >= unit_cost * 1.05
        assert result["suggested_price"] >= result["minimum_price"]
        assert result["maximum_price"] >= result["suggested_price"]

    def test_fallback_price_with_market_data(self):
        from app.services.pricing_service import PricingService
        svc = PricingService.__new__(PricingService)
        svc._model = None
        svc._use_fallback = True

        product_info = {"category": "jewelry", "craft_type": "dhokra"}
        cost_data = {}
        market_data = {"average_price": 1500, "min_price": 500, "max_price": 3000, "demand_score": 0.8}
        unit_cost = 500

        result = svc._fallback_price(product_info, cost_data, market_data, unit_cost)
        assert result["confidence"] > 0.5  # Higher confidence with market data

    def test_pricing_explanation_contains_cost_and_price(self):
        from app.services.pricing_service import PricingService
        svc = PricingService.__new__(PricingService)
        cost_data = {"raw_material_cost": 200}
        pricing_result = {"total_cost": 400, "suggested_price": 900, "profit_margin": 55.6}
        explanation = svc.build_explanation(cost_data, None, pricing_result)
        assert "₹400" in explanation
        assert "₹900" in explanation


@pytest.mark.asyncio
class TestTranslationService:
    async def test_same_language_returns_identity(self):
        """No-op translation when source == target."""
        from app.services.translation_service import TranslationService
        svc = TranslationService.__new__(TranslationService)
        svc._enabled = False
        result = await svc.translate("नमस्ते", "hi", "hi")
        assert result["translated_text"] == "नमस्ते"
        assert result["model_used"] == "identity"

    async def test_normalize_short_code(self):
        from app.services.translation_service import TranslationService
        svc = TranslationService.__new__(TranslationService)
        assert svc._normalize_lang("hi") == "hin_Deva"
        assert svc._normalize_lang("bn") == "ben_Beng"
        assert svc._normalize_lang("en") == "eng_Latn"

    async def test_translation_fallback_on_failure(self):
        """When IndicTrans2 and Gemini both fail, return original text."""
        from app.services.translation_service import TranslationService
        svc = TranslationService.__new__(TranslationService)
        svc._enabled = True
        svc._indictrans_model = None
        svc._indictrans_tokenizer = None

        with patch.object(svc, "_translate_indictrans_sync", side_effect=Exception("Model failed")):
            with patch.object(svc, "_translate_gemini_fallback", new_callable=AsyncMock) as mock_gemini:
                mock_gemini.return_value = {
                    "original_text": "test",
                    "translated_text": "test",
                    "success": False,
                    "model_used": "none",
                    "error": "unavailable",
                }
                result = await svc.translate("test", "hi", "en")
        assert result["translated_text"] == "test"


@pytest.mark.asyncio
class TestMatchingService:
    def test_score_artisan_exact_craft_match(self):
        from app.services.matching_service import MatchingService
        svc = MatchingService()
        artisan = {
            "artisan_id": "1", "business_name": "Test", "craft_type": "chikankari",
            "state": "uttar pradesh", "district": "lucknow", "rating": 4.5,
        }
        products = [{"category": "textiles", "price": 1000, "craft_type": "chikankari"}]
        inventory = [{"available_quantity": 50}]
        request = {
            "craft_type": "chikankari", "product_category": "textiles",
            "required_quantity": 20, "budget": 25000, "location": "uttar pradesh",
        }
        result = svc.score_artisan(artisan, products, inventory, request)
        assert result["match_score"] >= 0.50  # craft + category + location + inventory

    def test_rank_matches_filters_low_score(self):
        from app.services.matching_service import MatchingService
        svc = MatchingService()
        matches = [
            {"match_score": 0.9, "artisan_id": "1"},
            {"match_score": 0.05, "artisan_id": "2"},  # Below min_score
            {"match_score": 0.7, "artisan_id": "3"},
        ]
        ranked = svc.rank_matches(matches, min_score=0.1)
        assert len(ranked) == 2
        assert ranked[0]["match_score"] > ranked[1]["match_score"]


@pytest.mark.asyncio
class TestStorageService:
    async def test_validate_image_rejects_exe(self):
        from app.services.storage_service import StorageService, StorageError
        svc = StorageService()
        with pytest.raises(StorageError):
            svc.validate_image(b"fake content", "malware.exe")

    async def test_validate_image_rejects_oversized(self):
        from app.services.storage_service import StorageService, StorageError
        svc = StorageService()
        big_file = b"x" * (25 * 1024 * 1024)  # 25MB, over 20MB limit
        with pytest.raises(StorageError, match="too large"):
            svc.validate_image(big_file, "photo.jpg")

    def test_path_traversal_prevented(self):
        from app.services.storage_service import StorageService, StorageError
        svc = StorageService()
        with pytest.raises(StorageError):
            svc.get_absolute_path("../../etc/passwd")
