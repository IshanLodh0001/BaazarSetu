export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "BaazarSetu Node.js API",
    version: "1.0.0",
    description: "API Documentation for BaazarSetu Backend (Node.js/Express + Prisma)",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    { name: "Authentication", description: "OTP & JWT handling" },
    { name: "Users", description: "Artisan and Buyer profiles" },
    { name: "Products", description: "Product CRUD operations" },
    { name: "AI Image Studio", description: "Background removal & enhancement" },
    { name: "Voice", description: "Voice transcription endpoints" },
    { name: "Translation", description: "Indic language translation" },
    { name: "AI Catalog", description: "Generative AI catalog listing generation" },
    { name: "AI Pricing", description: "XGBoost pricing recommendations" },
    { name: "Inventory", description: "Stock management & tracking" },
    { name: "Cart", description: "Shopping cart operations" },
    { name: "Orders", description: "Order fulfillment and state machine" },
    { name: "Reviews", description: "Ratings and reviews system" },
    { name: "Enquiries", description: "B2B matching and bulk enquiries" },
    { name: "AI Assistant", description: "Contextual business assistant" },
    { name: "Notifications", description: "System alerts and notifications" },
    { name: "Analytics", description: "Seller business analytics & dashboards" },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["System"],
        summary: "Health Check",
        responses: {
          200: { description: "OK" },
        },
      },
    },
    // Authentication
    "/api/v1/auth/send-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Send OTP",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] }
            }
          }
        },
        responses: { 200: { description: "OTP sent" } }
      }
    },
    "/api/v1/auth/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify OTP and get JWT",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { phone: { type: "string" }, code: { type: "string" }, role: { type: "string", enum: ["ARTISAN", "BUYER"] } }, required: ["phone", "code"] }
            }
          }
        },
        responses: { 200: { description: "Successful login" } }
      }
    },
    
    // Users
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        responses: { 200: { description: "User profile" } }
      }
    },
    "/api/v1/users/profile": {
      patch: {
        tags: ["Users"],
        summary: "Update Basic Profile",
        requestBody: {
          content: {
            "application/json": { schema: { type: "object", properties: { name: { type: "string" }, preferredLanguage: { type: "string" } } } }
          }
        },
        responses: { 200: { description: "Profile updated" } }
      }
    },
    "/api/v1/users/artisan/onboarding": {
      post: {
        tags: ["Users"],
        summary: "Onboard Artisan",
        requestBody: {
          content: {
            "application/json": { schema: { type: "object", properties: { businessName: { type: "string" }, craftType: { type: "string" } } } }
          }
        },
        responses: { 200: { description: "Artisan onboarded" } }
      }
    },
    "/api/v1/users/buyer/onboarding": {
      post: {
        tags: ["Users"],
        summary: "Onboard Buyer",
        requestBody: {
          content: {
            "application/json": { schema: { type: "object", properties: { companyName: { type: "string" }, buyerType: { type: "string" } } } }
          }
        },
        responses: { 200: { description: "Buyer onboarded" } }
      }
    },

    // Products
    "/api/v1/products": { 
      get: { tags: ["Products"], summary: "List Products", responses: { 200: { description: "List of products" } } },
      post: { tags: ["Products"], summary: "Create Product", responses: { 201: { description: "Product created" } } }
    },
    "/api/v1/products/{id}": { 
      get: { tags: ["Products"], summary: "Get Product by ID", responses: { 200: { description: "Product details" } } },
      patch: { tags: ["Products"], summary: "Update Product", responses: { 200: { description: "Product updated" } } },
      delete: { tags: ["Products"], summary: "Delete Product", responses: { 200: { description: "Product deleted" } } }
    },
    "/api/v1/products/{id}/stock": { 
      patch: { tags: ["Products"], summary: "Update Product Stock", responses: { 200: { description: "Stock updated" } } }
    },
    "/api/v1/products/{id}/publish": { 
      post: { tags: ["Products"], summary: "Publish Product", responses: { 200: { description: "Product published" } } }
    },
    "/api/v1/products/{id}/unpublish": { 
      post: { tags: ["Products"], summary: "Unpublish Product", responses: { 200: { description: "Product unpublished" } } }
    },
    "/api/v1/products/{id}/images": { 
      get: { tags: ["Products"], summary: "Get Product Images", responses: { 200: { description: "List of images" } } },
      post: { tags: ["Products"], summary: "Upload Product Images", responses: { 200: { description: "Images uploaded" } } }
    },
    "/api/v1/products/{id}/images/{imageId}": { 
      delete: { tags: ["Products"], summary: "Delete Product Image", responses: { 200: { description: "Image deleted" } } }
    },

    // AI Image Studio
    "/api/v1/products/{id}/images/{imageId}/process": { 
      post: { tags: ["AI Image Studio"], summary: "Process Image with AI", responses: { 200: { description: "Image processed successfully" } } }
    },
    "/api/v1/products/{id}/images/{imageId}/retry": { 
      post: { tags: ["AI Image Studio"], summary: "Retry Processing Image with AI", responses: { 200: { description: "Image processed successfully" } } }
    },
    "/api/v1/products/{id}/images/{imageId}/status": { 
      get: { tags: ["AI Image Studio"], summary: "Get Processing Status", responses: { 200: { description: "Processing status" } } }
    },

    // Voice & Translation
    "/api/v1/voice/transcribe": { post: { tags: ["Voice"], summary: "Transcribe audio file" } },
    "/api/v1/translation/translate": { post: { tags: ["Translation"], summary: "Translate Indic to English" } },

    // AI Catalog & Pricing
    "/api/v1/catalog/generate": { post: { tags: ["AI Catalog"], summary: "Generate catalog from images/text" } },
    "/api/v1/pricing/calculate": {
      post: {
        tags: ["Dynamic Pricing"],
        summary: "Calculate dynamic price recommendation with deterministic costs and XGBoost market analysis",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  rawMaterialCost: { type: "number", default: 0 },
                  labourCost: { type: "number", default: 0 },
                  packagingCost: { type: "number", default: 0 },
                  transportCost: { type: "number", default: 0 },
                  otherCost: { type: "number", default: 0 },
                  quantity: { type: "integer", default: 1 },
                  desiredProfitMargin: { type: "number", default: 0 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Pricing calculation and recommendation created" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - product not owned by user" },
          404: { description: "Product not found" }
        }
      }
    },
    "/api/v1/pricing/apply/{pricingId}": {
      post: {
        tags: ["Dynamic Pricing"],
        summary: "Apply suggested price to product",
        parameters: [
          { name: "pricingId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Price applied to product successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - product not owned by user" },
          404: { description: "Pricing recommendation not found" }
        }
      }
    },
    "/api/v1/pricing/explain/{pricingId}": {
      post: {
        tags: ["Dynamic Pricing"],
        summary: "Get AI explanation for suggested pricing",
        parameters: [
          { name: "pricingId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Explanation generated successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - product not owned by user" },
          404: { description: "Pricing recommendation not found" }
        }
      }
    },
    "/api/v1/pricing/product/{productId}/history": {
      get: {
        tags: ["Dynamic Pricing"],
        summary: "Get pricing recommendation history for a product",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "List of historical pricing recommendations" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - product not owned by user" },
          404: { description: "Product not found" }
        }
      }
    },

    // Marketplace
    "/api/v1/marketplace/products": {
      get: {
        tags: ["Marketplace"],
        summary: "List published products with search, filtering, and safe pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "subCategory", in: "query", schema: { type: "string" } },
          { name: "craftType", in: "query", schema: { type: "string" } },
          { name: "material", in: "query", schema: { type: "string" } },
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "price_low_to_high", "price_high_to_low", "rating", "popular"], default: "newest" } },
          { name: "sellerId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Paginated list of published products" },
          400: { description: "Validation error in query parameters" }
        }
      }
    },
    "/api/v1/marketplace/products/{productId}": {
      get: {
        tags: ["Marketplace"],
        summary: "Get published product details",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Public product details" },
          404: { description: "Product not found or not published" }
        }
      }
    },
    "/api/v1/marketplace/products/{productId}/reviews": {
      get: {
        tags: ["Marketplace"],
        summary: "Get reviews for a product",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Product reviews and rating summary" },
          404: { description: "Product not found" }
        }
      },
      post: {
        tags: ["Reviews"],
        summary: "Submit verified-purchase review for a delivered order",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                  reviewText: { type: "string", example: "Authentic handmade blue pottery, exquisite quality!" },
                  orderId: { type: "string", format: "uuid" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Review submitted and ratings recalculated" },
          400: { description: "Duplicate review or invalid request" },
          403: { description: "Forbidden - only verified delivered buyers can review" }
        }
      }
    },
    "/api/v1/marketplace/artisans/{sellerId}": {
      get: {
        tags: ["Marketplace"],
        summary: "Get public artisan profile and featured products",
        parameters: [
          { name: "sellerId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Public artisan profile" },
          404: { description: "Artisan not found" }
        }
      }
    },
    "/api/v1/marketplace/artisans/{sellerId}/products": {
      get: {
        tags: ["Marketplace"],
        summary: "Get published products by an artisan",
        parameters: [
          { name: "sellerId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Paginated products by artisan" },
          404: { description: "Artisan not found" }
        }
      }
    },
    "/api/v1/marketplace/categories": {
      get: {
        tags: ["Marketplace"],
        summary: "List all distinct product categories in marketplace",
        responses: {
          200: { description: "List of categories" }
        }
      }
    },
    "/api/v1/marketplace/filters": {
      get: {
        tags: ["Marketplace"],
        summary: "Get available marketplace filter options (categories, subcategories, craftTypes, materials, states)",
        responses: {
          200: { description: "Filter options" }
        }
      }
    },

    // Wishlist
    "/api/v1/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Get authenticated buyer's wishlist",
        responses: {
          200: { description: "Buyer wishlist items" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      }
    },
    "/api/v1/wishlist/{productId}": {
      post: {
        tags: ["Wishlist"],
        summary: "Add product to buyer wishlist",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Product added to wishlist" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" },
          404: { description: "Product not found or not published" }
        }
      },
      delete: {
        tags: ["Wishlist"],
        summary: "Remove product from buyer wishlist",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Product removed from wishlist" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      }
    },

    // Cart
    "/api/v1/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get authenticated buyer's active cart",
        responses: {
          200: { description: "Active cart with items and subtotal" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear all items from cart",
        responses: {
          200: { description: "Cart cleared" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      }
    },
    "/api/v1/cart/items": {
      post: {
        tags: ["Cart"],
        summary: "Add item to cart with inventory check and server-side price",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "integer", minimum: 1, default: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Item added to cart" },
          400: { description: "Requested quantity exceeds available stock or product unavailable" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" },
          404: { description: "Product not found" }
        }
      }
    },
    "/api/v1/cart/items/{productId}": {
      patch: {
        tags: ["Cart"],
        summary: "Update cart item quantity",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: { type: "integer", minimum: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Cart item updated" },
          400: { description: "Requested quantity exceeds available stock" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" },
          404: { description: "Product not found in cart" }
        }
      },
      delete: {
        tags: ["Cart"],
        summary: "Remove product from cart",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Product removed from cart" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      }
    },

    // Orders (Buyer)
    "/api/v1/orders/checkout": {
      post: {
        tags: ["Orders"],
        summary: "Checkout shopping cart with atomic multi-seller order splitting",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shippingAddress", "paymentMethod"],
                properties: {
                  shippingAddress: { type: "string", example: "123 Artisan Marg, Jaipur, Rajasthan 302001" },
                  paymentMethod: { type: "string", enum: ["COD", "MOCK_ONLINE"], example: "COD" },
                  notes: { type: "string", example: "Please deliver between 10am and 5pm" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Orders created successfully" },
          400: { description: "Cart empty or insufficient inventory" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires BUYER role" }
        }
      }
    },
    "/api/v1/orders": {
      get: {
        tags: ["Orders"],
        summary: "Get buyer order history",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Buyer orders retrieved successfully" },
          401: { description: "Unauthorized" }
        }
      }
    },
    "/api/v1/orders/{orderId}": {
      get: {
        tags: ["Orders"],
        summary: "Get buyer order details",
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Order details retrieved successfully" },
          404: { description: "Order not found" }
        }
      }
    },
    "/api/v1/orders/{orderId}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel order by buyer (if CONFIRMED or PROCESSING) and restore inventory",
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Ordered by mistake" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Order cancelled successfully and inventory restored" },
          400: { description: "Cannot cancel order in current status" },
          404: { description: "Order not found" }
        }
      }
    },

    // Orders (Artisan)
    "/api/v1/artisan/orders": {
      get: {
        tags: ["Orders"],
        summary: "List artisan received orders",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Artisan orders retrieved successfully" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },
    "/api/v1/artisan/orders/{orderId}": {
      get: {
        tags: ["Orders"],
        summary: "Get artisan order details",
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Artisan order details retrieved" },
          404: { description: "Order not found" }
        }
      }
    },
    "/api/v1/artisan/orders/{orderId}/status": {
      patch: {
        tags: ["Orders"],
        summary: "Update order status by artisan (controlled state transitions)",
        parameters: [
          { name: "orderId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] },
                  trackingNumber: { type: "string", example: "DTDC-987654321" },
                  notes: { type: "string", example: "Dispatched via air cargo" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Order status updated" },
          400: { description: "Invalid status transition" },
          404: { description: "Order not found" }
        }
      }
    },
    // B2B Market Linkage (Buyer)
    "/api/v1/b2b/enquiries": {
      post: {
        tags: ["Enquiries"],
        summary: "Submit B2B bulk purchase enquiry / quotation request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sellerId", "requiredQuantity", "message"],
                properties: {
                  sellerId: { type: "string", format: "uuid" },
                  productId: { type: "string", format: "uuid" },
                  requiredQuantity: { type: "integer", minimum: 1, example: 50 },
                  proposedPrice: { type: "number", example: 350 },
                  budget: { type: "number", example: 17500 },
                  deliveryDate: { type: "string", format: "date", example: "2026-10-15" },
                  message: { type: "string", example: "Requesting quotation for boutique corporate gifting." }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "B2B enquiry created" },
          400: { description: "Validation error" }
        }
      },
      get: {
        tags: ["Enquiries"],
        summary: "List buyer B2B enquiries",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Enquiries retrieved" }
        }
      }
    },
    "/api/v1/b2b/enquiries/{enquiryId}": {
      get: {
        tags: ["Enquiries"],
        summary: "Get buyer B2B enquiry details",
        parameters: [
          { name: "enquiryId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Enquiry details retrieved" },
          404: { description: "Enquiry not found" }
        }
      }
    },
    "/api/v1/b2b/enquiries/{enquiryId}/accept-counter": {
      post: {
        tags: ["Enquiries"],
        summary: "Buyer accepts artisan counter offer quotation",
        parameters: [
          { name: "enquiryId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Counter offer accepted by buyer" },
          400: { description: "Enquiry is not in COUNTER_OFFER status" }
        }
      }
    },

    // B2B Market Linkage (Artisan)
    "/api/v1/artisan/b2b/enquiries": {
      get: {
        tags: ["Enquiries"],
        summary: "List artisan received B2B bulk enquiries",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Artisan enquiries list" }
        }
      }
    },
    "/api/v1/artisan/b2b/enquiries/{enquiryId}": {
      get: {
        tags: ["Enquiries"],
        summary: "Get artisan B2B enquiry details",
        parameters: [
          { name: "enquiryId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Enquiry details" },
          404: { description: "Enquiry not found" }
        }
      }
    },
    "/api/v1/artisan/b2b/enquiries/{enquiryId}/respond": {
      patch: {
        tags: ["Enquiries"],
        summary: "Artisan responds to B2B enquiry (ACCEPT, REJECT, or COUNTER_OFFER)",
        parameters: [
          { name: "enquiryId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["ACCEPT", "REJECT", "COUNTER_OFFER"] },
                  counterOfferPrice: { type: "number", example: 380 },
                  counterOfferMessage: { type: "string", example: "We can craft 50 units at ₹380 each with custom packaging." }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Enquiry response updated" },
          400: { description: "Invalid action or missing counterOfferPrice" }
        }
      }
    },

    // Notifications
    "/api/v1/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List user in-app notifications",
        parameters: [
          { name: "isRead", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          200: { description: "Notifications list retrieved" }
        }
      }
    },
    "/api/v1/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all user notifications as read",
        responses: {
          200: { description: "All notifications marked as read" }
        }
      }
    },
    "/api/v1/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark single notification as read",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          200: { description: "Notification marked as read" },
          404: { description: "Notification not found" }
        }
      }
    },

    // Seller Analytics & Business Dashboard
    "/api/v1/artisan/analytics/overview": {
      get: {
        tags: ["Analytics"],
        summary: "Get comprehensive seller overview dashboard with authoritative revenue",
        parameters: [
          { name: "from", in: "query", schema: { type: "string" }, description: "Start date (YYYY-MM-DD or ISO)" },
          { name: "to", in: "query", schema: { type: "string" }, description: "End date (YYYY-MM-DD or ISO)" }
        ],
        responses: {
          200: { description: "Artisan overview metrics retrieved successfully" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },
    "/api/v1/artisan/analytics/sales": {
      get: {
        tags: ["Analytics"],
        summary: "Get detailed sales metrics, revenue, and payment method breakdown",
        parameters: [
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Sales analytics retrieved successfully" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },
    "/api/v1/artisan/analytics/products": {
      get: {
        tags: ["Analytics"],
        summary: "Get product-by-product performance, stock, revenue, and ratings",
        responses: {
          200: { description: "Product analytics retrieved successfully" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },
    "/api/v1/artisan/analytics/inventory": {
      get: {
        tags: ["Analytics"],
        summary: "Get inventory analytics, capital tied in stock, and stock health",
        responses: {
          200: { description: "Inventory analytics retrieved successfully" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },

    // Inventory Intelligence
    "/api/v1/artisan/inventory/insights": {
      get: {
        tags: ["Inventory"],
        summary: "Get intelligent inventory insights (low stock, out of stock, fast/slow moving, restock recommendations)",
        responses: {
          200: { description: "Inventory intelligence insights retrieved" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },

    // AI Business Recommendations
    "/api/v1/artisan/recommendations": {
      get: {
        tags: ["AI Assistant"],
        summary: "Get prioritized AI business recommendations based on real seller data",
        responses: {
          200: { description: "Actionable business recommendations retrieved" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },

    // AI Business Assistant
    "/api/v1/ai/business-assistant": {
      post: {
        tags: ["AI Assistant"],
        summary: "Ask AI Business Assistant questions grounded in real seller data",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string", example: "Which products should I focus on this week?" },
                  language: { type: "string", default: "en", example: "hi" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Structured AI business response with insights and real data" },
          400: { description: "Validation error" },
          403: { description: "Forbidden - requires ARTISAN role" }
        }
      }
    },
    "/api/v1/assistant/chat": {
      post: {
        tags: ["AI Assistant"],
        summary: "Alias endpoint for AI Business Assistant chat",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string", example: "Show my sales summary." },
                  language: { type: "string", default: "en" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "AI Business Assistant response" }
        }
      }
    }

  },
};
