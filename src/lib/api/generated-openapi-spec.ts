/**
 * Auto-generated OpenAPI 3.0 Specification
 *
 * Generated: 2026-03-01
 * Routes: 275
 * Operations: 444
 * Tags: 65
 *
 * DO NOT EDIT — regenerate with: npx tsx scripts/generate-openapi.ts
 */

import type { OpenAPISpec } from "./openapi-generator";

export const generatedOpenAPISpec: OpenAPISpec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Fynvita API",
    "version": "1.0.0",
    "description": "Comprehensive REST API for the Fynvita Financial Vitality Platform. Provides 248 endpoints across 41 domains including financial management, credit repair, trading, AI insights, and more.",
    "contact": {
      "name": "Fynvita Support",
      "email": "support@fynvita.com",
      "url": "https://fynvita.com/support"
    },
    "license": {
      "name": "Proprietary",
      "url": "https://fynvita.com/terms"
    }
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Development"
    },
    {
      "url": "https://app.fynvita.com",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "AI",
      "description": "AI-powered analysis, coaching, and orchestration"
    },
    {
      "name": "Admin",
      "description": "Platform administration, metrics, and user management"
    },
    {
      "name": "Analytics",
      "description": "Platform analytics, reports, and event tracking"
    },
    {
      "name": "Auth",
      "description": "Authentication and WebAuthn credential management"
    },
    {
      "name": "Automation",
      "description": "Workflow automation and scheduled jobs"
    },
    {
      "name": "Chat",
      "description": "Financial chat sessions and messaging"
    },
    {
      "name": "Credit",
      "description": "Credit analysis and factor tracking"
    },
    {
      "name": "Credit Builder",
      "description": "Credit building tools, secured cards, and loans"
    },
    {
      "name": "Credit Bureau",
      "description": "Credit bureau integration and report analysis"
    },
    {
      "name": "Credit Monitoring",
      "description": "Real-time credit score monitoring and alerts"
    },
    {
      "name": "Credit Repair",
      "description": "Dispute management, negotiation, and credit repair tools"
    },
    {
      "name": "Credit Report",
      "description": "Credit Report operations"
    },
    {
      "name": "Cron",
      "description": "Scheduled background tasks and maintenance jobs"
    },
    {
      "name": "Csrf",
      "description": "Csrf operations"
    },
    {
      "name": "Disputes",
      "description": "Dispute generation, tracking, and strategies"
    },
    {
      "name": "Documents",
      "description": "Document upload, processing, and sharing"
    },
    {
      "name": "Email",
      "description": "Email preferences and unsubscribe management"
    },
    {
      "name": "Federal",
      "description": "Federal program eligibility and applications"
    },
    {
      "name": "Federal Programs",
      "description": "Federal Programs operations"
    },
    {
      "name": "Financial - Accounts",
      "description": "Bank account linking and management"
    },
    {
      "name": "Financial - Aggregated",
      "description": "Financial - Aggregated operations"
    },
    {
      "name": "Financial - Ai Insights",
      "description": "Financial - Ai Insights operations"
    },
    {
      "name": "Financial - Bills",
      "description": "Bill tracking, negotiation, and optimization"
    },
    {
      "name": "Financial - Budgets",
      "description": "Budget creation, analysis, and recommendations"
    },
    {
      "name": "Financial - Context",
      "description": "Aggregated financial context and summaries"
    },
    {
      "name": "Financial - Credit",
      "description": "Credit scoring and AI insights"
    },
    {
      "name": "Financial - Credit Builder",
      "description": "Financial - Credit Builder operations"
    },
    {
      "name": "Financial - Credit Repair",
      "description": "Financial - Credit Repair operations"
    },
    {
      "name": "Financial - Dashboard",
      "description": "Financial dashboard data aggregation"
    },
    {
      "name": "Financial - Debt",
      "description": "Debt management and payoff calculations"
    },
    {
      "name": "Financial - Disputes",
      "description": "Financial - Disputes operations"
    },
    {
      "name": "Financial - Export",
      "description": "Financial data export"
    },
    {
      "name": "Financial - Goals",
      "description": "Financial goal tracking and optimization"
    },
    {
      "name": "Financial - Health Score",
      "description": "Financial health score calculation"
    },
    {
      "name": "Financial - Income",
      "description": "Income tracking and detection"
    },
    {
      "name": "Financial - Insights",
      "description": "Financial insights and recommendations"
    },
    {
      "name": "Financial - Investments",
      "description": "Investment portfolio and AI insights"
    },
    {
      "name": "Financial - Monitoring",
      "description": "API monitoring and statistics"
    },
    {
      "name": "Financial - Openapi",
      "description": "Financial - Openapi operations"
    },
    {
      "name": "Financial - Plaid",
      "description": "Plaid bank integration"
    },
    {
      "name": "Financial - Savings",
      "description": "Savings goals, automation, and analysis"
    },
    {
      "name": "Financial - Spending",
      "description": "Spending analysis, trends, and forecasting"
    },
    {
      "name": "Financial - Tax",
      "description": "Financial - Tax operations"
    },
    {
      "name": "Financial - Transactions",
      "description": "Transaction history and management"
    },
    {
      "name": "Gamification",
      "description": "Achievements, badges, and rewards"
    },
    {
      "name": "Health",
      "description": "Health operations"
    },
    {
      "name": "Investments",
      "description": "Investments operations"
    },
    {
      "name": "Marketplace",
      "description": "Financial product marketplace"
    },
    {
      "name": "Ml",
      "description": "Ml operations"
    },
    {
      "name": "Monitoring",
      "description": "Monitoring operations"
    },
    {
      "name": "Notifications",
      "description": "User notifications and push messaging"
    },
    {
      "name": "Onboarding",
      "description": "User onboarding flow and progress"
    },
    {
      "name": "Payment",
      "description": "Payment operations"
    },
    {
      "name": "Performance",
      "description": "Performance operations"
    },
    {
      "name": "Profile",
      "description": "Profile operations"
    },
    {
      "name": "Servicers",
      "description": "Servicers operations"
    },
    {
      "name": "Settings",
      "description": "User settings and preferences"
    },
    {
      "name": "Strategies",
      "description": "Strategies operations"
    },
    {
      "name": "Student Loans",
      "description": "Student Loans operations"
    },
    {
      "name": "Tax",
      "description": "Tax operations"
    },
    {
      "name": "Test Db",
      "description": "Test Db operations"
    },
    {
      "name": "Trading",
      "description": "Trading orders, positions, and paper trading"
    },
    {
      "name": "User",
      "description": "User operations"
    },
    {
      "name": "Voice",
      "description": "Voice operations"
    },
    {
      "name": "Ws",
      "description": "Ws operations"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token from Supabase Auth"
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "error": {
            "type": "string"
          }
        }
      },
      "Success": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "object"
          }
        }
      }
    }
  },
  "paths": {
    "/api/admin/analytics": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Analytics",
        "description": "List Analytics. Requires authentication.",
        "operationId": "getAdminAnalytics",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/audit": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Audit",
        "description": "List Audit. Requires authentication.",
        "operationId": "getAdminAudit",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Admin"
        ],
        "summary": "Create Audit",
        "description": "Create Audit. Requires authentication.",
        "operationId": "postAdminAudit",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/admin/auth": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Auth",
        "description": "List Auth. Requires authentication.",
        "operationId": "getAdminAuth",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/disputes": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Disputes",
        "description": "List Disputes. Requires authentication.",
        "operationId": "getAdminDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Admin"
        ],
        "summary": "Update Disputes",
        "description": "Update Disputes. Requires authentication.",
        "operationId": "patchAdminDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/admin/logs": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Logs",
        "description": "List Logs. Requires authentication.",
        "operationId": "getAdminLogs",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/metrics": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Metrics",
        "description": "List Metrics. Requires authentication.",
        "operationId": "getAdminMetrics",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/settings": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Settings",
        "description": "List Settings. Requires authentication.",
        "operationId": "getAdminSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Admin"
        ],
        "summary": "Create Settings",
        "description": "Create Settings. Requires authentication.",
        "operationId": "postAdminSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/admin/stats": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Stats",
        "description": "List Stats. Requires authentication.",
        "operationId": "getAdminStats",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/subscriptions": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Subscriptions",
        "description": "List Subscriptions. Requires authentication.",
        "operationId": "getAdminSubscriptions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Admin"
        ],
        "summary": "Delete Subscriptions",
        "description": "Delete Subscriptions. Requires authentication.",
        "operationId": "deleteAdminSubscriptions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/admin/users": {
      "get": {
        "tags": [
          "Admin"
        ],
        "summary": "List Users",
        "description": "List Users. Requires authentication.",
        "operationId": "getAdminUsers",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Admin"
        ],
        "summary": "Update Users",
        "description": "Update Users. Requires authentication.",
        "operationId": "patchAdminUsers",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "403": {
            "description": "Forbidden — admin role required"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/chat/message": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Chat Message",
        "description": "Create Chat Message. Requires authentication.",
        "operationId": "postAiChatMessage",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/chat": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Chat",
        "description": "List Chat. Requires authentication.",
        "operationId": "getAiChat",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Chat",
        "description": "Create Chat. Requires authentication.",
        "operationId": "postAiChat",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/chat/sessions/{id}": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "Get Chat Sessions by ID",
        "description": "Get Chat Sessions by ID. Requires authentication.",
        "operationId": "getAiChatSessionsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "AI"
        ],
        "summary": "Update Chat Sessions",
        "description": "Update Chat Sessions. Requires authentication.",
        "operationId": "putAiChatSessionsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "AI"
        ],
        "summary": "Delete Chat Sessions",
        "description": "Delete Chat Sessions. Requires authentication.",
        "operationId": "deleteAiChatSessionsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/ai/chat/sessions": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Chat Sessions",
        "description": "List Chat Sessions. Requires authentication.",
        "operationId": "getAiChatSessions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Chat Sessions",
        "description": "Create Chat Sessions. Requires authentication.",
        "operationId": "postAiChatSessions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/consensus": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Consensus",
        "description": "List Consensus. Requires authentication.",
        "operationId": "getAiConsensus",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Consensus",
        "description": "Create Consensus. Requires authentication.",
        "operationId": "postAiConsensus",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/create-workflow": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Create Workflow",
        "description": "List Create Workflow. Requires authentication.",
        "operationId": "getAiCreateWorkflow",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Create Workflow",
        "description": "Create Create Workflow. Requires authentication.",
        "operationId": "postAiCreateWorkflow",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/advice": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Advice",
        "description": "Create Financial Coach Advice. Requires authentication.",
        "operationId": "postAiFinancialCoachAdvice",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/analyze": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Analyze",
        "description": "Create Financial Coach Analyze. Requires authentication.",
        "operationId": "postAiFinancialCoachAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/budget": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Financial Coach Budget",
        "description": "List Financial Coach Budget. Requires authentication.",
        "operationId": "getAiFinancialCoachBudget",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Budget",
        "description": "Create Financial Coach Budget. Requires authentication.",
        "operationId": "postAiFinancialCoachBudget",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/dashboard": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Financial Coach Dashboard",
        "description": "List Financial Coach Dashboard. Requires authentication.",
        "operationId": "getAiFinancialCoachDashboard",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/ai/financial-coach/debt-strategy": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Debt Strategy",
        "description": "Create Financial Coach Debt Strategy. Requires authentication.",
        "operationId": "postAiFinancialCoachDebtStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/debt": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Financial Coach Debt",
        "description": "List Financial Coach Debt. Requires authentication.",
        "operationId": "getAiFinancialCoachDebt",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Debt",
        "description": "Create Financial Coach Debt. Requires authentication.",
        "operationId": "postAiFinancialCoachDebt",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/goals/{goalId}": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "Get Financial Coach Goals by ID",
        "description": "Get Financial Coach Goals by ID. Requires authentication.",
        "operationId": "getAiFinancialCoachGoalsByGoalId",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "goalId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The goalId of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "AI"
        ],
        "summary": "Update Financial Coach Goals",
        "description": "Update Financial Coach Goals. Requires authentication.",
        "operationId": "patchAiFinancialCoachGoalsByGoalId",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "goalId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The goalId of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/goals/{goalId}/simulate": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Goals Simulate",
        "description": "Create Financial Coach Goals Simulate. Requires authentication.",
        "operationId": "postAiFinancialCoachGoalsByGoalIdSimulate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "goalId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The goalId of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/goals": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Financial Coach Goals",
        "description": "List Financial Coach Goals. Requires authentication.",
        "operationId": "getAiFinancialCoachGoals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Goals",
        "description": "Create Financial Coach Goals. Requires authentication.",
        "operationId": "postAiFinancialCoachGoals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/plan": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Plan",
        "description": "Create Financial Coach Plan. Requires authentication.",
        "operationId": "postAiFinancialCoachPlan",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/financial-coach/recommendations": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Financial Coach Recommendations",
        "description": "List Financial Coach Recommendations. Requires authentication.",
        "operationId": "getAiFinancialCoachRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Financial Coach Recommendations",
        "description": "Create Financial Coach Recommendations. Requires authentication.",
        "operationId": "postAiFinancialCoachRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/insights": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Insights",
        "description": "List Insights. Requires authentication.",
        "operationId": "getAiInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/ai/nudges": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Nudges",
        "description": "List Nudges. Requires authentication.",
        "operationId": "getAiNudges",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Nudges",
        "description": "Create Nudges. Requires authentication.",
        "operationId": "postAiNudges",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/orchestrate": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Orchestrate",
        "description": "List Orchestrate. Requires authentication.",
        "operationId": "getAiOrchestrate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Orchestrate",
        "description": "Create Orchestrate. Requires authentication.",
        "operationId": "postAiOrchestrate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/predict-outcomes": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Predict Outcomes",
        "description": "List Predict Outcomes. Requires authentication.",
        "operationId": "getAiPredictOutcomes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Predict Outcomes",
        "description": "Create Predict Outcomes. Requires authentication.",
        "operationId": "postAiPredictOutcomes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/recommend-strategy": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Recommend Strategy",
        "description": "List Recommend Strategy. Requires authentication.",
        "operationId": "getAiRecommendStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Recommend Strategy",
        "description": "Create Recommend Strategy. Requires authentication.",
        "operationId": "postAiRecommendStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ai/spending-analysis": {
      "get": {
        "tags": [
          "AI"
        ],
        "summary": "List Spending Analysis",
        "description": "List Spending Analysis. Requires authentication.",
        "operationId": "getAiSpendingAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Create Spending Analysis",
        "description": "Create Spending Analysis. Requires authentication.",
        "operationId": "postAiSpendingAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/analytics/events": {
      "get": {
        "tags": [
          "Analytics"
        ],
        "summary": "List Events",
        "description": "List Events. Requires authentication.",
        "operationId": "getAnalyticsEvents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Analytics"
        ],
        "summary": "Create Events",
        "description": "Create Events. Requires authentication.",
        "operationId": "postAnalyticsEvents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/analytics/reports": {
      "get": {
        "tags": [
          "Analytics"
        ],
        "summary": "List Reports",
        "description": "List Reports. Requires authentication.",
        "operationId": "getAnalyticsReports",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Analytics"
        ],
        "summary": "Create Reports",
        "description": "Create Reports. Requires authentication.",
        "operationId": "postAnalyticsReports",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/analytics": {
      "get": {
        "tags": [
          "Analytics"
        ],
        "summary": "List Analytics",
        "description": "List Analytics. Requires authentication.",
        "operationId": "getAnalytics",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/analytics/strategies": {
      "get": {
        "tags": [
          "Analytics"
        ],
        "summary": "List Strategies",
        "description": "List Strategies. Requires authentication.",
        "operationId": "getAnalyticsStrategies",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/analytics/timeseries": {
      "get": {
        "tags": [
          "Analytics"
        ],
        "summary": "List Timeseries",
        "description": "List Timeseries. Requires authentication.",
        "operationId": "getAnalyticsTimeseries",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/auth/webauthn/authenticate": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Create Webauthn Authenticate",
        "description": "Create Webauthn Authenticate. Requires authentication.",
        "operationId": "postAuthWebauthnAuthenticate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/auth/webauthn/authenticate/verify": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Create Webauthn Authenticate Verify",
        "description": "Create Webauthn Authenticate Verify. Requires authentication.",
        "operationId": "postAuthWebauthnAuthenticateVerify",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/auth/webauthn/credentials": {
      "get": {
        "tags": [
          "Auth"
        ],
        "summary": "List Webauthn Credentials",
        "description": "List Webauthn Credentials. Requires authentication.",
        "operationId": "getAuthWebauthnCredentials",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Auth"
        ],
        "summary": "Update Webauthn Credentials",
        "description": "Update Webauthn Credentials. Requires authentication.",
        "operationId": "patchAuthWebauthnCredentials",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Auth"
        ],
        "summary": "Delete Webauthn Credentials",
        "description": "Delete Webauthn Credentials. Requires authentication.",
        "operationId": "deleteAuthWebauthnCredentials",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/auth/webauthn/register": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Create Webauthn Register",
        "description": "Create Webauthn Register. Requires authentication.",
        "operationId": "postAuthWebauthnRegister",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/auth/webauthn/register/verify": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Create Webauthn Register Verify",
        "description": "Create Webauthn Register Verify. Requires authentication.",
        "operationId": "postAuthWebauthnRegisterVerify",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/automation/jobs": {
      "get": {
        "tags": [
          "Automation"
        ],
        "summary": "List Jobs",
        "description": "List Jobs. Requires authentication.",
        "operationId": "getAutomationJobs",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Automation"
        ],
        "summary": "Create Jobs",
        "description": "Create Jobs. Requires authentication.",
        "operationId": "postAutomationJobs",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Automation"
        ],
        "summary": "Delete Jobs",
        "description": "Delete Jobs. Requires authentication.",
        "operationId": "deleteAutomationJobs",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/automation/workflows": {
      "get": {
        "tags": [
          "Automation"
        ],
        "summary": "List Workflows",
        "description": "List Workflows. Requires authentication.",
        "operationId": "getAutomationWorkflows",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Automation"
        ],
        "summary": "Create Workflows",
        "description": "Create Workflows. Requires authentication.",
        "operationId": "postAutomationWorkflows",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/chat/financial": {
      "post": {
        "tags": [
          "Chat"
        ],
        "summary": "Create Financial",
        "description": "Create Financial. Requires authentication.",
        "operationId": "postChatFinancial",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/chat/financial/sessions/{id}/messages": {
      "get": {
        "tags": [
          "Chat"
        ],
        "summary": "Get Financial Sessions Messages by ID",
        "description": "Get Financial Sessions Messages by ID. Requires authentication.",
        "operationId": "getChatFinancialSessionsByIdMessages",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/chat/financial/sessions/{id}": {
      "get": {
        "tags": [
          "Chat"
        ],
        "summary": "Get Financial Sessions by ID",
        "description": "Get Financial Sessions by ID. Requires authentication.",
        "operationId": "getChatFinancialSessionsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "delete": {
        "tags": [
          "Chat"
        ],
        "summary": "Delete Financial Sessions",
        "description": "Delete Financial Sessions. Requires authentication.",
        "operationId": "deleteChatFinancialSessionsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/chat/financial/sessions": {
      "get": {
        "tags": [
          "Chat"
        ],
        "summary": "List Financial Sessions",
        "description": "List Financial Sessions. Requires authentication.",
        "operationId": "getChatFinancialSessions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Chat"
        ],
        "summary": "Create Financial Sessions",
        "description": "Create Financial Sessions. Requires authentication.",
        "operationId": "postChatFinancialSessions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-builder/loans": {
      "get": {
        "tags": [
          "Credit Builder"
        ],
        "summary": "List Loans",
        "description": "List Loans. Requires authentication.",
        "operationId": "getCreditBuilderLoans",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-builder/progress": {
      "get": {
        "tags": [
          "Credit Builder"
        ],
        "summary": "List Progress",
        "description": "List Progress. Requires authentication.",
        "operationId": "getCreditBuilderProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-builder/recommendations": {
      "get": {
        "tags": [
          "Credit Builder"
        ],
        "summary": "List Recommendations",
        "description": "List Recommendations. Requires authentication.",
        "operationId": "getCreditBuilderRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-builder/score": {
      "get": {
        "tags": [
          "Credit Builder"
        ],
        "summary": "List Score",
        "description": "List Score. Requires authentication.",
        "operationId": "getCreditBuilderScore",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-builder/secured-cards": {
      "get": {
        "tags": [
          "Credit Builder"
        ],
        "summary": "List Secured Cards",
        "description": "List Secured Cards. Requires authentication.",
        "operationId": "getCreditBuilderSecuredCards",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-bureau/analyze": {
      "post": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postCreditBureauAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-bureau/connect": {
      "get": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "List Connect",
        "description": "List Connect. Requires authentication.",
        "operationId": "getCreditBureauConnect",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "Create Connect",
        "description": "Create Connect. Requires authentication.",
        "operationId": "postCreditBureauConnect",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-bureau/dispute": {
      "post": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "Create Dispute",
        "description": "Create Dispute. Requires authentication.",
        "operationId": "postCreditBureauDispute",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-bureau/report": {
      "get": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "List Report",
        "description": "List Report. Requires authentication.",
        "operationId": "getCreditBureauReport",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "Create Report",
        "description": "Create Report. Requires authentication.",
        "operationId": "postCreditBureauReport",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-bureau/score-history": {
      "get": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "List Score History",
        "description": "List Score History. Requires authentication.",
        "operationId": "getCreditBureauScoreHistory",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-bureau/test-import": {
      "get": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "List Test Import",
        "description": "List Test Import. Requires authentication.",
        "operationId": "getCreditBureauTestImport",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Bureau"
        ],
        "summary": "Create Test Import",
        "description": "Create Test Import. Requires authentication.",
        "operationId": "postCreditBureauTestImport",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-monitoring/alerts": {
      "get": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "List Alerts",
        "description": "List Alerts. Requires authentication.",
        "operationId": "getCreditMonitoringAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "Update Alerts",
        "description": "Update Alerts. Requires authentication.",
        "operationId": "patchCreditMonitoringAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-monitoring/history": {
      "get": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "List History",
        "description": "List History. Requires authentication.",
        "operationId": "getCreditMonitoringHistory",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-monitoring": {
      "get": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "List Credit Monitoring",
        "description": "List Credit Monitoring. Requires authentication.",
        "operationId": "getCreditMonitoring",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "Create Credit Monitoring",
        "description": "Create Credit Monitoring. Requires authentication.",
        "operationId": "postCreditMonitoring",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-monitoring/scores": {
      "get": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "List Scores",
        "description": "List Scores. Requires authentication.",
        "operationId": "getCreditMonitoringScores",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-monitoring/settings": {
      "get": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "List Settings",
        "description": "List Settings. Requires authentication.",
        "operationId": "getCreditMonitoringSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "put": {
        "tags": [
          "Credit Monitoring"
        ],
        "summary": "Update Settings",
        "description": "Update Settings. Requires authentication.",
        "operationId": "putCreditMonitoringSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/cards/{id}": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Get Cards by ID",
        "description": "Get Cards by ID. Requires authentication.",
        "operationId": "getCreditRepairCardsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Update Cards",
        "description": "Update Cards. Requires authentication.",
        "operationId": "putCreditRepairCardsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Delete Cards",
        "description": "Delete Cards. Requires authentication.",
        "operationId": "deleteCreditRepairCardsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/credit-repair/cards": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Cards",
        "description": "List Cards. Requires authentication.",
        "operationId": "getCreditRepairCards",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Cards",
        "description": "Create Cards. Requires authentication.",
        "operationId": "postCreditRepairCards",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/disputes/{id}": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Get Disputes by ID",
        "description": "Get Disputes by ID. Requires authentication.",
        "operationId": "getCreditRepairDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Update Disputes",
        "description": "Update Disputes. Requires authentication.",
        "operationId": "putCreditRepairDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Delete Disputes",
        "description": "Delete Disputes. Requires authentication.",
        "operationId": "deleteCreditRepairDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/credit-repair/disputes": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Disputes",
        "description": "List Disputes. Requires authentication.",
        "operationId": "getCreditRepairDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Disputes",
        "description": "Create Disputes. Requires authentication.",
        "operationId": "postCreditRepairDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/goodwill/{id}": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Get Goodwill by ID",
        "description": "Get Goodwill by ID. Requires authentication.",
        "operationId": "getCreditRepairGoodwillById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Update Goodwill",
        "description": "Update Goodwill. Requires authentication.",
        "operationId": "putCreditRepairGoodwillById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Delete Goodwill",
        "description": "Delete Goodwill. Requires authentication.",
        "operationId": "deleteCreditRepairGoodwillById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/credit-repair/goodwill": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Goodwill",
        "description": "List Goodwill. Requires authentication.",
        "operationId": "getCreditRepairGoodwill",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Goodwill",
        "description": "Create Goodwill. Requires authentication.",
        "operationId": "postCreditRepairGoodwill",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/impact": {
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Impact",
        "description": "Create Impact. Requires authentication.",
        "operationId": "postCreditRepairImpact",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/negotiate/{id}": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Get Negotiate by ID",
        "description": "Get Negotiate by ID. Requires authentication.",
        "operationId": "getCreditRepairNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Update Negotiate",
        "description": "Update Negotiate. Requires authentication.",
        "operationId": "putCreditRepairNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Delete Negotiate",
        "description": "Delete Negotiate. Requires authentication.",
        "operationId": "deleteCreditRepairNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/credit-repair/negotiate": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Negotiate",
        "description": "List Negotiate. Requires authentication.",
        "operationId": "getCreditRepairNegotiate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Negotiate",
        "description": "Create Negotiate. Requires authentication.",
        "operationId": "postCreditRepairNegotiate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/quick-wins": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Quick Wins",
        "description": "List Quick Wins. Requires authentication.",
        "operationId": "getCreditRepairQuickWins",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/credit-repair/reports/{id}": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Get Reports by ID",
        "description": "Get Reports by ID. Requires authentication.",
        "operationId": "getCreditRepairReportsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "delete": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Delete Reports",
        "description": "Delete Reports. Requires authentication.",
        "operationId": "deleteCreditRepairReportsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/credit-repair/reports": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Reports",
        "description": "List Reports. Requires authentication.",
        "operationId": "getCreditRepairReports",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Reports",
        "description": "Create Reports. Requires authentication.",
        "operationId": "postCreditRepairReports",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-repair/score": {
      "get": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "List Score",
        "description": "List Score. Requires authentication.",
        "operationId": "getCreditRepairScore",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Repair"
        ],
        "summary": "Create Score",
        "description": "Create Score. Requires authentication.",
        "operationId": "postCreditRepairScore",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit-report/analyze": {
      "get": {
        "tags": [
          "Credit Report"
        ],
        "summary": "List Analyze",
        "description": "List Analyze. Requires authentication.",
        "operationId": "getCreditReportAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit Report"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postCreditReportAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit/analyze": {
      "get": {
        "tags": [
          "Credit"
        ],
        "summary": "List Analyze",
        "description": "List Analyze. Requires authentication.",
        "operationId": "getCreditAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Credit"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postCreditAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/credit/factors": {
      "get": {
        "tags": [
          "Credit"
        ],
        "summary": "List Factors",
        "description": "List Factors. Requires authentication.",
        "operationId": "getCreditFactors",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/cron/check-dispute-status": {
      "get": {
        "tags": [
          "Cron"
        ],
        "summary": "List Check Dispute Status",
        "description": "List Check Dispute Status. Requires authentication.",
        "operationId": "getCronCheckDisputeStatus",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/cron/cleanup-expired-sessions": {
      "get": {
        "tags": [
          "Cron"
        ],
        "summary": "List Cleanup Expired Sessions",
        "description": "List Cleanup Expired Sessions. Requires authentication.",
        "operationId": "getCronCleanupExpiredSessions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/cron/dispute-followups": {
      "get": {
        "tags": [
          "Cron"
        ],
        "summary": "List Dispute Followups",
        "description": "List Dispute Followups. Requires authentication.",
        "operationId": "getCronDisputeFollowups",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/cron/send-reminders": {
      "get": {
        "tags": [
          "Cron"
        ],
        "summary": "List Send Reminders",
        "description": "List Send Reminders. Requires authentication.",
        "operationId": "getCronSendReminders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/csrf": {
      "get": {
        "tags": [
          "Csrf"
        ],
        "summary": "List Csrf",
        "description": "List Csrf. Requires authentication.",
        "operationId": "getCsrf",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        }
      }
    },
    "/api/disputes/{id}": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "Get Disputes by ID",
        "description": "Get Disputes by ID. Requires authentication.",
        "operationId": "getDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Disputes"
        ],
        "summary": "Update Disputes",
        "description": "Update Disputes. Requires authentication.",
        "operationId": "patchDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Disputes"
        ],
        "summary": "Delete Disputes",
        "description": "Delete Disputes. Requires authentication.",
        "operationId": "deleteDisputesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/disputes/{id}/send": {
      "patch": {
        "tags": [
          "Disputes"
        ],
        "summary": "Update Send",
        "description": "Update Send. Requires authentication.",
        "operationId": "patchDisputesByIdSend",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/disputes/generate-student-loan": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Generate Student Loan",
        "description": "List Generate Student Loan. Requires authentication.",
        "operationId": "getDisputesGenerateStudentLoan",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Disputes"
        ],
        "summary": "Create Generate Student Loan",
        "description": "Create Generate Student Loan. Requires authentication.",
        "operationId": "postDisputesGenerateStudentLoan",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/disputes/generate": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Generate",
        "description": "List Generate. Requires authentication.",
        "operationId": "getDisputesGenerate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Disputes"
        ],
        "summary": "Create Generate",
        "description": "Create Generate. Requires authentication.",
        "operationId": "postDisputesGenerate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/disputes/reasons": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Reasons",
        "description": "List Reasons. Requires authentication.",
        "operationId": "getDisputesReasons",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/disputes": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Disputes",
        "description": "List Disputes. Requires authentication.",
        "operationId": "getDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Disputes"
        ],
        "summary": "Create Disputes",
        "description": "Create Disputes. Requires authentication.",
        "operationId": "postDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Disputes"
        ],
        "summary": "Update Disputes",
        "description": "Update Disputes. Requires authentication.",
        "operationId": "patchDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Disputes"
        ],
        "summary": "Delete Disputes",
        "description": "Delete Disputes. Requires authentication.",
        "operationId": "deleteDisputes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/disputes/stats": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Stats",
        "description": "List Stats. Requires authentication.",
        "operationId": "getDisputesStats",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/disputes/strategies": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Strategies",
        "description": "List Strategies. Requires authentication.",
        "operationId": "getDisputesStrategies",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/disputes/templates": {
      "get": {
        "tags": [
          "Disputes"
        ],
        "summary": "List Templates",
        "description": "List Templates. Requires authentication.",
        "operationId": "getDisputesTemplates",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Disputes"
        ],
        "summary": "Create Templates",
        "description": "Create Templates. Requires authentication.",
        "operationId": "postDisputesTemplates",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/documents": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "List Documents",
        "description": "List Documents. Requires authentication.",
        "operationId": "getDocuments",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Documents"
        ],
        "summary": "Update Documents",
        "description": "Update Documents. Requires authentication.",
        "operationId": "patchDocuments",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Documents"
        ],
        "summary": "Delete Documents",
        "description": "Delete Documents. Requires authentication.",
        "operationId": "deleteDocuments",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/documents/share": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "List Share",
        "description": "List Share. Requires authentication.",
        "operationId": "getDocumentsShare",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Documents"
        ],
        "summary": "Create Share",
        "description": "Create Share. Requires authentication.",
        "operationId": "postDocumentsShare",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Documents"
        ],
        "summary": "Delete Share",
        "description": "Delete Share. Requires authentication.",
        "operationId": "deleteDocumentsShare",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/documents/upload": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "List Upload",
        "description": "List Upload. Requires authentication.",
        "operationId": "getDocumentsUpload",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Documents"
        ],
        "summary": "Create Upload",
        "description": "Create Upload. Requires authentication.",
        "operationId": "postDocumentsUpload",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/email/unsubscribe": {
      "get": {
        "tags": [
          "Email"
        ],
        "summary": "List Unsubscribe",
        "description": "List Unsubscribe. Requires authentication.",
        "operationId": "getEmailUnsubscribe",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        }
      },
      "post": {
        "tags": [
          "Email"
        ],
        "summary": "Create Unsubscribe",
        "description": "Create Unsubscribe. Requires authentication.",
        "operationId": "postEmailUnsubscribe",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/federal-programs": {
      "get": {
        "tags": [
          "Federal Programs"
        ],
        "summary": "List Federal Programs",
        "description": "List Federal Programs. Requires authentication.",
        "operationId": "getFederalPrograms",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Federal Programs"
        ],
        "summary": "Create Federal Programs",
        "description": "Create Federal Programs. Requires authentication.",
        "operationId": "postFederalPrograms",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/federal/check-eligibility": {
      "get": {
        "tags": [
          "Federal"
        ],
        "summary": "List Check Eligibility",
        "description": "List Check Eligibility. Requires authentication.",
        "operationId": "getFederalCheckEligibility",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Federal"
        ],
        "summary": "Create Check Eligibility",
        "description": "Create Check Eligibility. Requires authentication.",
        "operationId": "postFederalCheckEligibility",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/federal/submit-application": {
      "get": {
        "tags": [
          "Federal"
        ],
        "summary": "List Submit Application",
        "description": "List Submit Application. Requires authentication.",
        "operationId": "getFederalSubmitApplication",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Federal"
        ],
        "summary": "Create Submit Application",
        "description": "Create Submit Application. Requires authentication.",
        "operationId": "postFederalSubmitApplication",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/federal/track-application": {
      "get": {
        "tags": [
          "Federal"
        ],
        "summary": "List Track Application",
        "description": "List Track Application. Requires authentication.",
        "operationId": "getFederalTrackApplication",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Federal"
        ],
        "summary": "Create Track Application",
        "description": "Create Track Application. Requires authentication.",
        "operationId": "postFederalTrackApplication",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/accounts": {
      "get": {
        "tags": [
          "Financial - Accounts"
        ],
        "summary": "List Accounts",
        "description": "List Accounts. Requires authentication.",
        "operationId": "getFinancialAccounts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/aggregated": {
      "get": {
        "tags": [
          "Financial - Aggregated"
        ],
        "summary": "List Aggregated",
        "description": "List Aggregated. Requires authentication.",
        "operationId": "getFinancialAggregated",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Financial - Aggregated"
        ],
        "summary": "Delete Aggregated",
        "description": "Delete Aggregated. Requires authentication.",
        "operationId": "deleteFinancialAggregated",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/ai-insights": {
      "get": {
        "tags": [
          "Financial - Ai Insights"
        ],
        "summary": "List Ai Insights",
        "description": "List Ai Insights. Requires authentication.",
        "operationId": "getFinancialAiInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/bills/{id}/negotiate": {
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills Negotiate",
        "description": "Create Bills Negotiate. Requires authentication.",
        "operationId": "postFinancialBillsByIdNegotiate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/{id}/outcome": {
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills Outcome",
        "description": "Create Bills Outcome. Requires authentication.",
        "operationId": "postFinancialBillsByIdOutcome",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/{id}": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Get Bills by ID",
        "description": "Get Bills by ID. Requires authentication.",
        "operationId": "getFinancialBillsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Update Bills",
        "description": "Update Bills. Requires authentication.",
        "operationId": "patchFinancialBillsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Delete Bills",
        "description": "Delete Bills. Requires authentication.",
        "operationId": "deleteFinancialBillsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/financial/bills/analysis": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "List Bills Analysis",
        "description": "List Bills Analysis. Requires authentication.",
        "operationId": "getFinancialBillsAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/bills/detect": {
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills Detect",
        "description": "Create Bills Detect. Requires authentication.",
        "operationId": "postFinancialBillsDetect",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/negotiate/{id}": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Get Bills Negotiate by ID",
        "description": "Get Bills Negotiate by ID. Requires authentication.",
        "operationId": "getFinancialBillsNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills Negotiate",
        "description": "Create Bills Negotiate. Requires authentication.",
        "operationId": "postFinancialBillsNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Update Bills Negotiate",
        "description": "Update Bills Negotiate. Requires authentication.",
        "operationId": "patchFinancialBillsNegotiateById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/negotiate": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "List Bills Negotiate",
        "description": "List Bills Negotiate. Requires authentication.",
        "operationId": "getFinancialBillsNegotiate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills Negotiate",
        "description": "Create Bills Negotiate. Requires authentication.",
        "operationId": "postFinancialBillsNegotiate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/optimizations": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "List Bills Optimizations",
        "description": "List Bills Optimizations. Requires authentication.",
        "operationId": "getFinancialBillsOptimizations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/bills": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "List Bills",
        "description": "List Bills. Requires authentication.",
        "operationId": "getFinancialBills",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "Create Bills",
        "description": "Create Bills. Requires authentication.",
        "operationId": "postFinancialBills",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/bills/summary": {
      "get": {
        "tags": [
          "Financial - Bills"
        ],
        "summary": "List Bills Summary",
        "description": "List Bills Summary. Requires authentication.",
        "operationId": "getFinancialBillsSummary",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/budgets/{id}": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Get Budgets by ID",
        "description": "Get Budgets by ID. Requires authentication.",
        "operationId": "getFinancialBudgetsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Update Budgets",
        "description": "Update Budgets. Requires authentication.",
        "operationId": "patchFinancialBudgetsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Delete Budgets",
        "description": "Delete Budgets. Requires authentication.",
        "operationId": "deleteFinancialBudgetsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/financial/budgets/adjust": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Adjust",
        "description": "List Budgets Adjust. Requires authentication.",
        "operationId": "getFinancialBudgetsAdjust",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/budgets/alerts": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Alerts",
        "description": "List Budgets Alerts. Requires authentication.",
        "operationId": "getFinancialBudgetsAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Update Budgets Alerts",
        "description": "Update Budgets Alerts. Requires authentication.",
        "operationId": "patchFinancialBudgetsAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/budgets/analyze": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Analyze",
        "description": "List Budgets Analyze. Requires authentication.",
        "operationId": "getFinancialBudgetsAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/budgets/generate": {
      "post": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Create Budgets Generate",
        "description": "Create Budgets Generate. Requires authentication.",
        "operationId": "postFinancialBudgetsGenerate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/budgets/predict": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Predict",
        "description": "List Budgets Predict. Requires authentication.",
        "operationId": "getFinancialBudgetsPredict",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/budgets/recommendations": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Recommendations",
        "description": "List Budgets Recommendations. Requires authentication.",
        "operationId": "getFinancialBudgetsRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/budgets/rollover": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Rollover",
        "description": "List Budgets Rollover. Requires authentication.",
        "operationId": "getFinancialBudgetsRollover",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Create Budgets Rollover",
        "description": "Create Budgets Rollover. Requires authentication.",
        "operationId": "postFinancialBudgetsRollover",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Update Budgets Rollover",
        "description": "Update Budgets Rollover. Requires authentication.",
        "operationId": "patchFinancialBudgetsRollover",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/budgets": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets",
        "description": "List Budgets. Requires authentication.",
        "operationId": "getFinancialBudgets",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "Create Budgets",
        "description": "Create Budgets. Requires authentication.",
        "operationId": "postFinancialBudgets",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/budgets/summary": {
      "get": {
        "tags": [
          "Financial - Budgets"
        ],
        "summary": "List Budgets Summary",
        "description": "List Budgets Summary. Requires authentication.",
        "operationId": "getFinancialBudgetsSummary",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/context": {
      "get": {
        "tags": [
          "Financial - Context"
        ],
        "summary": "List Context",
        "description": "List Context. Requires authentication.",
        "operationId": "getFinancialContext",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Context"
        ],
        "summary": "Create Context",
        "description": "Create Context. Requires authentication.",
        "operationId": "postFinancialContext",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/context/summary": {
      "get": {
        "tags": [
          "Financial - Context"
        ],
        "summary": "List Context Summary",
        "description": "List Context Summary. Requires authentication.",
        "operationId": "getFinancialContextSummary",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/credit-builder/ai-roadmap": {
      "get": {
        "tags": [
          "Financial - Credit Builder"
        ],
        "summary": "List Credit Builder Ai Roadmap",
        "description": "List Credit Builder Ai Roadmap. Requires authentication.",
        "operationId": "getFinancialCreditBuilderAiRoadmap",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/credit-repair/ai-strategy": {
      "get": {
        "tags": [
          "Financial - Credit Repair"
        ],
        "summary": "List Credit Repair Ai Strategy",
        "description": "List Credit Repair Ai Strategy. Requires authentication.",
        "operationId": "getFinancialCreditRepairAiStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/credit/ai-insights": {
      "get": {
        "tags": [
          "Financial - Credit"
        ],
        "summary": "List Credit Ai Insights",
        "description": "List Credit Ai Insights. Requires authentication.",
        "operationId": "getFinancialCreditAiInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/credit/simulator": {
      "get": {
        "tags": [
          "Financial - Credit"
        ],
        "summary": "List Credit Simulator",
        "description": "List Credit Simulator. Requires authentication.",
        "operationId": "getFinancialCreditSimulator",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Credit"
        ],
        "summary": "Create Credit Simulator",
        "description": "Create Credit Simulator. Requires authentication.",
        "operationId": "postFinancialCreditSimulator",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/dashboard": {
      "get": {
        "tags": [
          "Financial - Dashboard"
        ],
        "summary": "List Dashboard",
        "description": "List Dashboard. Requires authentication.",
        "operationId": "getFinancialDashboard",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/debt/calculate": {
      "post": {
        "tags": [
          "Financial - Debt"
        ],
        "summary": "Create Debt Calculate",
        "description": "Create Debt Calculate. Requires authentication.",
        "operationId": "postFinancialDebtCalculate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/debt": {
      "get": {
        "tags": [
          "Financial - Debt"
        ],
        "summary": "List Debt",
        "description": "List Debt. Requires authentication.",
        "operationId": "getFinancialDebt",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Debt"
        ],
        "summary": "Create Debt",
        "description": "Create Debt. Requires authentication.",
        "operationId": "postFinancialDebt",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/disputes/ai-strategy": {
      "get": {
        "tags": [
          "Financial - Disputes"
        ],
        "summary": "List Disputes Ai Strategy",
        "description": "List Disputes Ai Strategy. Requires authentication.",
        "operationId": "getFinancialDisputesAiStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/export": {
      "get": {
        "tags": [
          "Financial - Export"
        ],
        "summary": "List Export",
        "description": "List Export. Requires authentication.",
        "operationId": "getFinancialExport",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/goals/{id}": {
      "get": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "Get Goals by ID",
        "description": "Get Goals by ID. Requires authentication.",
        "operationId": "getFinancialGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "Update Goals",
        "description": "Update Goals. Requires authentication.",
        "operationId": "patchFinancialGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "Delete Goals",
        "description": "Delete Goals. Requires authentication.",
        "operationId": "deleteFinancialGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/financial/goals/optimizations": {
      "get": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "List Goals Optimizations",
        "description": "List Goals Optimizations. Requires authentication.",
        "operationId": "getFinancialGoalsOptimizations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/goals": {
      "get": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "List Goals",
        "description": "List Goals. Requires authentication.",
        "operationId": "getFinancialGoals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Goals"
        ],
        "summary": "Create Goals",
        "description": "Create Goals. Requires authentication.",
        "operationId": "postFinancialGoals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/health-score": {
      "get": {
        "tags": [
          "Financial - Health Score"
        ],
        "summary": "List Health Score",
        "description": "List Health Score. Requires authentication.",
        "operationId": "getFinancialHealthScore",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Health Score"
        ],
        "summary": "Create Health Score",
        "description": "Create Health Score. Requires authentication.",
        "operationId": "postFinancialHealthScore",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/health-score/v2": {
      "get": {
        "tags": [
          "Financial - Health Score"
        ],
        "summary": "List Health Score V2",
        "description": "List Health Score V2. Requires authentication.",
        "operationId": "getFinancialHealthScoreV2",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Health Score"
        ],
        "summary": "Create Health Score V2",
        "description": "Create Health Score V2. Requires authentication.",
        "operationId": "postFinancialHealthScoreV2",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/income/detect": {
      "get": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "List Income Detect",
        "description": "List Income Detect. Requires authentication.",
        "operationId": "getFinancialIncomeDetect",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "Create Income Detect",
        "description": "Create Income Detect. Requires authentication.",
        "operationId": "postFinancialIncomeDetect",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/income/gig": {
      "get": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "List Income Gig",
        "description": "List Income Gig. Requires authentication.",
        "operationId": "getFinancialIncomeGig",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "Create Income Gig",
        "description": "Create Income Gig. Requires authentication.",
        "operationId": "postFinancialIncomeGig",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/income": {
      "get": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "List Income",
        "description": "List Income. Requires authentication.",
        "operationId": "getFinancialIncome",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "Create Income",
        "description": "Create Income. Requires authentication.",
        "operationId": "postFinancialIncome",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "put": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "Update Income",
        "description": "Update Income. Requires authentication.",
        "operationId": "putFinancialIncome",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Income"
        ],
        "summary": "Delete Income",
        "description": "Delete Income. Requires authentication.",
        "operationId": "deleteFinancialIncome",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/insights": {
      "get": {
        "tags": [
          "Financial - Insights"
        ],
        "summary": "List Insights",
        "description": "List Insights. Requires authentication.",
        "operationId": "getFinancialInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Insights"
        ],
        "summary": "Create Insights",
        "description": "Create Insights. Requires authentication.",
        "operationId": "postFinancialInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Financial - Insights"
        ],
        "summary": "Update Insights",
        "description": "Update Insights. Requires authentication.",
        "operationId": "patchFinancialInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/investments/ai-insights": {
      "get": {
        "tags": [
          "Financial - Investments"
        ],
        "summary": "List Investments Ai Insights",
        "description": "List Investments Ai Insights. Requires authentication.",
        "operationId": "getFinancialInvestmentsAiInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/monitoring": {
      "get": {
        "tags": [
          "Financial - Monitoring"
        ],
        "summary": "List Monitoring",
        "description": "List Monitoring. Requires authentication.",
        "operationId": "getFinancialMonitoring",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/openapi": {
      "get": {
        "tags": [
          "Financial - Openapi"
        ],
        "summary": "List Openapi",
        "description": "List Openapi. Requires authentication.",
        "operationId": "getFinancialOpenapi",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        }
      }
    },
    "/api/financial/plaid/exchange-token": {
      "post": {
        "tags": [
          "Financial - Plaid"
        ],
        "summary": "Create Plaid Exchange Token",
        "description": "Create Plaid Exchange Token. Requires authentication.",
        "operationId": "postFinancialPlaidExchangeToken",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/plaid/link-token": {
      "post": {
        "tags": [
          "Financial - Plaid"
        ],
        "summary": "Create Plaid Link Token",
        "description": "Create Plaid Link Token. Requires authentication.",
        "operationId": "postFinancialPlaidLinkToken",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/savings/analyze": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "List Savings Analyze",
        "description": "List Savings Analyze. Requires authentication.",
        "operationId": "getFinancialSavingsAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/savings/goal-recommendations": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "List Savings Goal Recommendations",
        "description": "List Savings Goal Recommendations. Requires authentication.",
        "operationId": "getFinancialSavingsGoalRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/savings/goals/{id}": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Get Savings Goals by ID",
        "description": "Get Savings Goals by ID. Requires authentication.",
        "operationId": "getFinancialSavingsGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Update Savings Goals",
        "description": "Update Savings Goals. Requires authentication.",
        "operationId": "patchFinancialSavingsGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Delete Savings Goals",
        "description": "Delete Savings Goals. Requires authentication.",
        "operationId": "deleteFinancialSavingsGoalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/financial/savings/recommendations": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "List Savings Recommendations",
        "description": "List Savings Recommendations. Requires authentication.",
        "operationId": "getFinancialSavingsRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/savings": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "List Savings",
        "description": "List Savings. Requires authentication.",
        "operationId": "getFinancialSavings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Create Savings",
        "description": "Create Savings. Requires authentication.",
        "operationId": "postFinancialSavings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/savings/rules/{id}": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Get Savings Rules by ID",
        "description": "Get Savings Rules by ID. Requires authentication.",
        "operationId": "getFinancialSavingsRulesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Update Savings Rules",
        "description": "Update Savings Rules. Requires authentication.",
        "operationId": "patchFinancialSavingsRulesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "Delete Savings Rules",
        "description": "Delete Savings Rules. Requires authentication.",
        "operationId": "deleteFinancialSavingsRulesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/financial/savings/subscriptions": {
      "get": {
        "tags": [
          "Financial - Savings"
        ],
        "summary": "List Savings Subscriptions",
        "description": "List Savings Subscriptions. Requires authentication.",
        "operationId": "getFinancialSavingsSubscriptions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/ai-insights": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Ai Insights",
        "description": "List Spending Ai Insights. Requires authentication.",
        "operationId": "getFinancialSpendingAiInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/analysis": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Analysis",
        "description": "List Spending Analysis. Requires authentication.",
        "operationId": "getFinancialSpendingAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/analyze": {
      "post": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "Create Spending Analyze",
        "description": "Create Spending Analyze. Requires authentication.",
        "operationId": "postFinancialSpendingAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/spending/anomalies": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Anomalies",
        "description": "List Spending Anomalies. Requires authentication.",
        "operationId": "getFinancialSpendingAnomalies",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/cashflow": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Cashflow",
        "description": "List Spending Cashflow. Requires authentication.",
        "operationId": "getFinancialSpendingCashflow",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/forecast": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Forecast",
        "description": "List Spending Forecast. Requires authentication.",
        "operationId": "getFinancialSpendingForecast",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "Create Spending Forecast",
        "description": "Create Spending Forecast. Requires authentication.",
        "operationId": "postFinancialSpendingForecast",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/spending/insights": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Insights",
        "description": "List Spending Insights. Requires authentication.",
        "operationId": "getFinancialSpendingInsights",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending",
        "description": "List Spending. Requires authentication.",
        "operationId": "getFinancialSpending",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/summary": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Summary",
        "description": "List Spending Summary. Requires authentication.",
        "operationId": "getFinancialSpendingSummary",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/spending/trends": {
      "get": {
        "tags": [
          "Financial - Spending"
        ],
        "summary": "List Spending Trends",
        "description": "List Spending Trends. Requires authentication.",
        "operationId": "getFinancialSpendingTrends",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/financial/tax/retirement": {
      "get": {
        "tags": [
          "Financial - Tax"
        ],
        "summary": "List Tax Retirement",
        "description": "List Tax Retirement. Requires authentication.",
        "operationId": "getFinancialTaxRetirement",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Financial - Tax"
        ],
        "summary": "Create Tax Retirement",
        "description": "Create Tax Retirement. Requires authentication.",
        "operationId": "postFinancialTaxRetirement",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/financial/transactions": {
      "get": {
        "tags": [
          "Financial - Transactions"
        ],
        "summary": "List Transactions",
        "description": "List Transactions. Requires authentication.",
        "operationId": "getFinancialTransactions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/gamification/achievements": {
      "get": {
        "tags": [
          "Gamification"
        ],
        "summary": "List Achievements",
        "description": "List Achievements. Requires authentication.",
        "operationId": "getGamificationAchievements",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Gamification"
        ],
        "summary": "Create Achievements",
        "description": "Create Achievements. Requires authentication.",
        "operationId": "postGamificationAchievements",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/gamification/badges": {
      "get": {
        "tags": [
          "Gamification"
        ],
        "summary": "List Badges",
        "description": "List Badges. Requires authentication.",
        "operationId": "getGamificationBadges",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Gamification"
        ],
        "summary": "Create Badges",
        "description": "Create Badges. Requires authentication.",
        "operationId": "postGamificationBadges",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/gamification/events": {
      "post": {
        "tags": [
          "Gamification"
        ],
        "summary": "Create Events",
        "description": "Create Events. Requires authentication.",
        "operationId": "postGamificationEvents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/gamification/leaderboard": {
      "get": {
        "tags": [
          "Gamification"
        ],
        "summary": "List Leaderboard",
        "description": "List Leaderboard. Requires authentication.",
        "operationId": "getGamificationLeaderboard",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/gamification/progress": {
      "get": {
        "tags": [
          "Gamification"
        ],
        "summary": "List Progress",
        "description": "List Progress. Requires authentication.",
        "operationId": "getGamificationProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Gamification"
        ],
        "summary": "Create Progress",
        "description": "Create Progress. Requires authentication.",
        "operationId": "postGamificationProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/gamification/quests": {
      "get": {
        "tags": [
          "Gamification"
        ],
        "summary": "List Quests",
        "description": "List Quests. Requires authentication.",
        "operationId": "getGamificationQuests",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Gamification"
        ],
        "summary": "Create Quests",
        "description": "Create Quests. Requires authentication.",
        "operationId": "postGamificationQuests",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "summary": "List Health",
        "description": "List Health. Requires authentication.",
        "operationId": "getHealth",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/alerts": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Alerts",
        "description": "List Alerts. Requires authentication.",
        "operationId": "getInvestmentsAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Alerts",
        "description": "Create Alerts. Requires authentication.",
        "operationId": "postInvestmentsAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Investments"
        ],
        "summary": "Delete Alerts",
        "description": "Delete Alerts. Requires authentication.",
        "operationId": "deleteInvestmentsAlerts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/allocation-analysis": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Allocation Analysis",
        "description": "List Allocation Analysis. Requires authentication.",
        "operationId": "getInvestmentsAllocationAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Allocation Analysis",
        "description": "Create Allocation Analysis. Requires authentication.",
        "operationId": "postInvestmentsAllocationAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/analytics/correlation": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Analytics Correlation",
        "description": "List Analytics Correlation. Requires authentication.",
        "operationId": "getInvestmentsAnalyticsCorrelation",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/analytics/diversification": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Analytics Diversification",
        "description": "List Analytics Diversification. Requires authentication.",
        "operationId": "getInvestmentsAnalyticsDiversification",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/analytics/performance": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Analytics Performance",
        "description": "List Analytics Performance. Requires authentication.",
        "operationId": "getInvestmentsAnalyticsPerformance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/analytics/rebalance": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Analytics Rebalance",
        "description": "List Analytics Rebalance. Requires authentication.",
        "operationId": "getInvestmentsAnalyticsRebalance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/analytics/risk": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Analytics Risk",
        "description": "List Analytics Risk. Requires authentication.",
        "operationId": "getInvestmentsAnalyticsRisk",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/analyze/{symbol}/fundamental": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Analyze Fundamental by ID",
        "description": "Get Analyze Fundamental by ID. Requires authentication.",
        "operationId": "getInvestmentsAnalyzeBySymbolFundamental",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ]
      }
    },
    "/api/investments/analyze/{symbol}/recommendation": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Analyze Recommendation by ID",
        "description": "Get Analyze Recommendation by ID. Requires authentication.",
        "operationId": "getInvestmentsAnalyzeBySymbolRecommendation",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ]
      }
    },
    "/api/investments/analyze/{symbol}": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Analyze by ID",
        "description": "Get Analyze by ID. Requires authentication.",
        "operationId": "getInvestmentsAnalyzeBySymbol",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postInvestmentsAnalyzeBySymbol",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/analyze/{symbol}/sentiment": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Analyze Sentiment by ID",
        "description": "Get Analyze Sentiment by ID. Requires authentication.",
        "operationId": "getInvestmentsAnalyzeBySymbolSentiment",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ]
      }
    },
    "/api/investments/analyze/{symbol}/technical": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Analyze Technical by ID",
        "description": "Get Analyze Technical by ID. Requires authentication.",
        "operationId": "getInvestmentsAnalyzeBySymbolTechnical",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "symbol",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The symbol of the resource"
          }
        ]
      }
    },
    "/api/investments/comprehensive-analysis": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Comprehensive Analysis",
        "description": "List Comprehensive Analysis. Requires authentication.",
        "operationId": "getInvestmentsComprehensiveAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Comprehensive Analysis",
        "description": "Create Comprehensive Analysis. Requires authentication.",
        "operationId": "postInvestmentsComprehensiveAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/crypto/{coinId}": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Crypto by ID",
        "description": "Get Crypto by ID. Requires authentication.",
        "operationId": "getInvestmentsCryptoByCoinId",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "coinId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The coinId of the resource"
          }
        ]
      }
    },
    "/api/investments/crypto/{coinId}/sentiment": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Crypto Sentiment by ID",
        "description": "Get Crypto Sentiment by ID. Requires authentication.",
        "operationId": "getInvestmentsCryptoByCoinIdSentiment",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "coinId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The coinId of the resource"
          }
        ]
      }
    },
    "/api/investments/crypto/trending": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Crypto Trending",
        "description": "List Crypto Trending. Requires authentication.",
        "operationId": "getInvestmentsCryptoTrending",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/holdings/{id}": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Holdings by ID",
        "description": "Get Holdings by ID. Requires authentication.",
        "operationId": "getInvestmentsHoldingsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Investments"
        ],
        "summary": "Update Holdings",
        "description": "Update Holdings. Requires authentication.",
        "operationId": "patchInvestmentsHoldingsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Investments"
        ],
        "summary": "Delete Holdings",
        "description": "Delete Holdings. Requires authentication.",
        "operationId": "deleteInvestmentsHoldingsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/investments/holdings": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Holdings",
        "description": "List Holdings. Requires authentication.",
        "operationId": "getInvestmentsHoldings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Holdings",
        "description": "Create Holdings. Requires authentication.",
        "operationId": "postInvestmentsHoldings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/patterns": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Patterns",
        "description": "List Patterns. Requires authentication.",
        "operationId": "getInvestmentsPatterns",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Patterns",
        "description": "Create Patterns. Requires authentication.",
        "operationId": "postInvestmentsPatterns",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/portfolio-analysis": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Portfolio Analysis",
        "description": "List Portfolio Analysis. Requires authentication.",
        "operationId": "getInvestmentsPortfolioAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Portfolio Analysis",
        "description": "Create Portfolio Analysis. Requires authentication.",
        "operationId": "postInvestmentsPortfolioAnalysis",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/portfolio/analyze": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Portfolio Analyze",
        "description": "List Portfolio Analyze. Requires authentication.",
        "operationId": "getInvestmentsPortfolioAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Portfolio Analyze",
        "description": "Create Portfolio Analyze. Requires authentication.",
        "operationId": "postInvestmentsPortfolioAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/portfolio": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Portfolio",
        "description": "List Portfolio. Requires authentication.",
        "operationId": "getInvestmentsPortfolio",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/recommendations": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Recommendations",
        "description": "List Recommendations. Requires authentication.",
        "operationId": "getInvestmentsRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Recommendations",
        "description": "Create Recommendations. Requires authentication.",
        "operationId": "postInvestmentsRecommendations",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/signals/{id}": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "Get Signals by ID",
        "description": "Get Signals by ID. Requires authentication.",
        "operationId": "getInvestmentsSignalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "patch": {
        "tags": [
          "Investments"
        ],
        "summary": "Update Signals",
        "description": "Update Signals. Requires authentication.",
        "operationId": "patchInvestmentsSignalsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/investments/signals/active": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Signals Active",
        "description": "List Signals Active. Requires authentication.",
        "operationId": "getInvestmentsSignalsActive",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/signals/performance": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Signals Performance",
        "description": "List Signals Performance. Requires authentication.",
        "operationId": "getInvestmentsSignalsPerformance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/investments/signals": {
      "get": {
        "tags": [
          "Investments"
        ],
        "summary": "List Signals",
        "description": "List Signals. Requires authentication.",
        "operationId": "getInvestmentsSignals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Investments"
        ],
        "summary": "Create Signals",
        "description": "Create Signals. Requires authentication.",
        "operationId": "postInvestmentsSignals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/marketplace/products/{id}": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Get Products by ID",
        "description": "Get Products by ID. Requires authentication.",
        "operationId": "getMarketplaceProductsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/marketplace/products/categories": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Products Categories",
        "description": "List Products Categories. Requires authentication.",
        "operationId": "getMarketplaceProductsCategories",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/marketplace/products": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Products",
        "description": "List Products. Requires authentication.",
        "operationId": "getMarketplaceProducts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Create Products",
        "description": "Create Products. Requires authentication.",
        "operationId": "postMarketplaceProducts",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/marketplace/products/search": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Products Search",
        "description": "List Products Search. Requires authentication.",
        "operationId": "getMarketplaceProductsSearch",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/marketplace/providers/{id}": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Get Providers by ID",
        "description": "Get Providers by ID. Requires authentication.",
        "operationId": "getMarketplaceProvidersById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/marketplace/providers": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Providers",
        "description": "List Providers. Requires authentication.",
        "operationId": "getMarketplaceProviders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/marketplace/providers/search": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Providers Search",
        "description": "List Providers Search. Requires authentication.",
        "operationId": "getMarketplaceProvidersSearch",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/marketplace/reviews/{id}/helpful": {
      "post": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Create Reviews Helpful",
        "description": "Create Reviews Helpful. Requires authentication.",
        "operationId": "postMarketplaceReviewsByIdHelpful",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/marketplace/reviews/{id}": {
      "post": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Create Reviews",
        "description": "Create Reviews. Requires authentication.",
        "operationId": "postMarketplaceReviewsById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/marketplace/reviews": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Reviews",
        "description": "List Reviews. Requires authentication.",
        "operationId": "getMarketplaceReviews",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Create Reviews",
        "description": "Create Reviews. Requires authentication.",
        "operationId": "postMarketplaceReviews",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/marketplace/tradelines/{id}": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "Get Tradelines by ID",
        "description": "Get Tradelines by ID. Requires authentication.",
        "operationId": "getMarketplaceTradelinesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/marketplace/tradelines": {
      "get": {
        "tags": [
          "Marketplace"
        ],
        "summary": "List Tradelines",
        "description": "List Tradelines. Requires authentication.",
        "operationId": "getMarketplaceTradelines",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/ml/predict-success": {
      "get": {
        "tags": [
          "Ml"
        ],
        "summary": "List Predict Success",
        "description": "List Predict Success. Requires authentication.",
        "operationId": "getMlPredictSuccess",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Ml"
        ],
        "summary": "Create Predict Success",
        "description": "Create Predict Success. Requires authentication.",
        "operationId": "postMlPredictSuccess",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ml/predict-timeline": {
      "get": {
        "tags": [
          "Ml"
        ],
        "summary": "List Predict Timeline",
        "description": "List Predict Timeline. Requires authentication.",
        "operationId": "getMlPredictTimeline",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Ml"
        ],
        "summary": "Create Predict Timeline",
        "description": "Create Predict Timeline. Requires authentication.",
        "operationId": "postMlPredictTimeline",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/monitoring/errors": {
      "post": {
        "tags": [
          "Monitoring"
        ],
        "summary": "Create Errors",
        "description": "Create Errors. Requires authentication.",
        "operationId": "postMonitoringErrors",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/monitoring/events": {
      "get": {
        "tags": [
          "Monitoring"
        ],
        "summary": "List Events",
        "description": "List Events. Requires authentication.",
        "operationId": "getMonitoringEvents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/monitoring/health": {
      "get": {
        "tags": [
          "Monitoring"
        ],
        "summary": "List Health",
        "description": "List Health. Requires authentication.",
        "operationId": "getMonitoringHealth",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Monitoring"
        ],
        "summary": "Create Health",
        "description": "Create Health. Requires authentication.",
        "operationId": "postMonitoringHealth",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/monitoring/history": {
      "get": {
        "tags": [
          "Monitoring"
        ],
        "summary": "List History",
        "description": "List History. Requires authentication.",
        "operationId": "getMonitoringHistory",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Monitoring"
        ],
        "summary": "Delete History",
        "description": "Delete History. Requires authentication.",
        "operationId": "deleteMonitoringHistory",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/notifications/preferences": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List Preferences",
        "description": "List Preferences. Requires authentication.",
        "operationId": "getNotificationsPreferences",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Create Preferences",
        "description": "Create Preferences. Requires authentication.",
        "operationId": "postNotificationsPreferences",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "put": {
        "tags": [
          "Notifications"
        ],
        "summary": "Update Preferences",
        "description": "Update Preferences. Requires authentication.",
        "operationId": "putNotificationsPreferences",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/notifications/push/schedule": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List Push Schedule",
        "description": "List Push Schedule. Requires authentication.",
        "operationId": "getNotificationsPushSchedule",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Create Push Schedule",
        "description": "Create Push Schedule. Requires authentication.",
        "operationId": "postNotificationsPushSchedule",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Notifications"
        ],
        "summary": "Delete Push Schedule",
        "description": "Delete Push Schedule. Requires authentication.",
        "operationId": "deleteNotificationsPushSchedule",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/notifications/push/send": {
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Create Push Send",
        "description": "Create Push Send. Requires authentication.",
        "operationId": "postNotificationsPushSend",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/notifications/push/subscribe": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List Push Subscribe",
        "description": "List Push Subscribe. Requires authentication.",
        "operationId": "getNotificationsPushSubscribe",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Create Push Subscribe",
        "description": "Create Push Subscribe. Requires authentication.",
        "operationId": "postNotificationsPushSubscribe",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Notifications"
        ],
        "summary": "Delete Push Subscribe",
        "description": "Delete Push Subscribe. Requires authentication.",
        "operationId": "deleteNotificationsPushSubscribe",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/notifications/push/vapid-key": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List Push Vapid Key",
        "description": "List Push Vapid Key. Requires authentication.",
        "operationId": "getNotificationsPushVapidKey",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/notifications": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List Notifications",
        "description": "List Notifications. Requires authentication.",
        "operationId": "getNotifications",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Create Notifications",
        "description": "Create Notifications. Requires authentication.",
        "operationId": "postNotifications",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Notifications"
        ],
        "summary": "Update Notifications",
        "description": "Update Notifications. Requires authentication.",
        "operationId": "patchNotifications",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Notifications"
        ],
        "summary": "Delete Notifications",
        "description": "Delete Notifications. Requires authentication.",
        "operationId": "deleteNotifications",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/onboarding/progress": {
      "get": {
        "tags": [
          "Onboarding"
        ],
        "summary": "List Progress",
        "description": "List Progress. Requires authentication.",
        "operationId": "getOnboardingProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Onboarding"
        ],
        "summary": "Create Progress",
        "description": "Create Progress. Requires authentication.",
        "operationId": "postOnboardingProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/payment/billing/plan": {
      "post": {
        "tags": [
          "Payment"
        ],
        "summary": "Create Billing Plan",
        "description": "Create Billing Plan. Requires authentication.",
        "operationId": "postPaymentBillingPlan",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/payment/billing": {
      "get": {
        "tags": [
          "Payment"
        ],
        "summary": "List Billing",
        "description": "List Billing. Requires authentication.",
        "operationId": "getPaymentBilling",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/payment/checkout": {
      "post": {
        "tags": [
          "Payment"
        ],
        "summary": "Create Checkout",
        "description": "Create Checkout. Requires authentication.",
        "operationId": "postPaymentCheckout",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/payment/webhook": {
      "post": {
        "tags": [
          "Payment"
        ],
        "summary": "Create Webhook",
        "description": "Create Webhook. Requires authentication.",
        "operationId": "postPaymentWebhook",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/performance": {
      "get": {
        "tags": [
          "Performance"
        ],
        "summary": "List Performance",
        "description": "List Performance. Requires authentication.",
        "operationId": "getPerformance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Performance"
        ],
        "summary": "Delete Performance",
        "description": "Delete Performance. Requires authentication.",
        "operationId": "deletePerformance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/profile": {
      "get": {
        "tags": [
          "Profile"
        ],
        "summary": "List Profile",
        "description": "List Profile. Requires authentication.",
        "operationId": "getProfile",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Profile"
        ],
        "summary": "Update Profile",
        "description": "Update Profile. Requires authentication.",
        "operationId": "patchProfile",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/servicers/analyze": {
      "get": {
        "tags": [
          "Servicers"
        ],
        "summary": "List Analyze",
        "description": "List Analyze. Requires authentication.",
        "operationId": "getServicersAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Servicers"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postServicersAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/servicers/detect-errors": {
      "get": {
        "tags": [
          "Servicers"
        ],
        "summary": "List Detect Errors",
        "description": "List Detect Errors. Requires authentication.",
        "operationId": "getServicersDetectErrors",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Servicers"
        ],
        "summary": "Create Detect Errors",
        "description": "Create Detect Errors. Requires authentication.",
        "operationId": "postServicersDetectErrors",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/settings": {
      "get": {
        "tags": [
          "Settings"
        ],
        "summary": "List Settings",
        "description": "List Settings. Requires authentication.",
        "operationId": "getSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Settings"
        ],
        "summary": "Update Settings",
        "description": "Update Settings. Requires authentication.",
        "operationId": "patchSettings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/strategies/recommend": {
      "get": {
        "tags": [
          "Strategies"
        ],
        "summary": "List Recommend",
        "description": "List Recommend. Requires authentication.",
        "operationId": "getStrategiesRecommend",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Strategies"
        ],
        "summary": "Create Recommend",
        "description": "Create Recommend. Requires authentication.",
        "operationId": "postStrategiesRecommend",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/student-loans/analyze": {
      "get": {
        "tags": [
          "Student Loans"
        ],
        "summary": "List Analyze",
        "description": "List Analyze. Requires authentication.",
        "operationId": "getStudentLoansAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Student Loans"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postStudentLoansAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/student-loans": {
      "get": {
        "tags": [
          "Student Loans"
        ],
        "summary": "List Student Loans",
        "description": "List Student Loans. Requires authentication.",
        "operationId": "getStudentLoans",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/student-loans/strategy": {
      "get": {
        "tags": [
          "Student Loans"
        ],
        "summary": "List Strategy",
        "description": "List Strategy. Requires authentication.",
        "operationId": "getStudentLoansStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Student Loans"
        ],
        "summary": "Create Strategy",
        "description": "Create Strategy. Requires authentication.",
        "operationId": "postStudentLoansStrategy",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/tax/analyze": {
      "post": {
        "tags": [
          "Tax"
        ],
        "summary": "Create Analyze",
        "description": "Create Analyze. Requires authentication.",
        "operationId": "postTaxAnalyze",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/tax/documents": {
      "get": {
        "tags": [
          "Tax"
        ],
        "summary": "List Documents",
        "description": "List Documents. Requires authentication.",
        "operationId": "getTaxDocuments",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "delete": {
        "tags": [
          "Tax"
        ],
        "summary": "Delete Documents",
        "description": "Delete Documents. Requires authentication.",
        "operationId": "deleteTaxDocuments",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/tax/documents/upload": {
      "post": {
        "tags": [
          "Tax"
        ],
        "summary": "Create Documents Upload",
        "description": "Create Documents Upload. Requires authentication.",
        "operationId": "postTaxDocumentsUpload",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/test-db": {
      "get": {
        "tags": [
          "Test Db"
        ],
        "summary": "List Test Db",
        "description": "List Test Db. Requires authentication.",
        "operationId": "getTestDb",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/agents": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Agents",
        "description": "List Agents. Requires authentication.",
        "operationId": "getTradingAgents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Agents",
        "description": "Create Agents. Requires authentication.",
        "operationId": "postTradingAgents",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/backtest": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Backtest",
        "description": "List Backtest. Requires authentication.",
        "operationId": "getTradingBacktest",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Backtest",
        "description": "Create Backtest. Requires authentication.",
        "operationId": "postTradingBacktest",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/compliance": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Compliance",
        "description": "List Compliance. Requires authentication.",
        "operationId": "getTradingCompliance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Compliance",
        "description": "Create Compliance. Requires authentication.",
        "operationId": "postTradingCompliance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/ise/rankings": {
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Ise Rankings",
        "description": "Create Ise Rankings. Requires authentication.",
        "operationId": "postTradingIseRankings",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/ise": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Ise",
        "description": "List Ise. Requires authentication.",
        "operationId": "getTradingIse",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Ise",
        "description": "Create Ise. Requires authentication.",
        "operationId": "postTradingIse",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/journal/{id}/close": {
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Journal Close",
        "description": "Create Journal Close. Requires authentication.",
        "operationId": "postTradingJournalByIdClose",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/journal/{id}": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "Get Journal by ID",
        "description": "Get Journal by ID. Requires authentication.",
        "operationId": "getTradingJournalById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Trading"
        ],
        "summary": "Update Journal",
        "description": "Update Journal. Requires authentication.",
        "operationId": "putTradingJournalById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Trading"
        ],
        "summary": "Delete Journal",
        "description": "Delete Journal. Requires authentication.",
        "operationId": "deleteTradingJournalById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/trading/journal": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Journal",
        "description": "List Journal. Requires authentication.",
        "operationId": "getTradingJournal",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Journal",
        "description": "Create Journal. Requires authentication.",
        "operationId": "postTradingJournal",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/journal/stats": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Journal Stats",
        "description": "List Journal Stats. Requires authentication.",
        "operationId": "getTradingJournalStats",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/modes/circuit-breakers": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Modes Circuit Breakers",
        "description": "List Modes Circuit Breakers. Requires authentication.",
        "operationId": "getTradingModesCircuitBreakers",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/modes/downgrade": {
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Modes Downgrade",
        "description": "Create Modes Downgrade. Requires authentication.",
        "operationId": "postTradingModesDowngrade",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/modes/graduate": {
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Modes Graduate",
        "description": "Create Modes Graduate. Requires authentication.",
        "operationId": "postTradingModesGraduate",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/modes/permissions": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Modes Permissions",
        "description": "List Modes Permissions. Requires authentication.",
        "operationId": "getTradingModesPermissions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/modes/progress": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Modes Progress",
        "description": "List Modes Progress. Requires authentication.",
        "operationId": "getTradingModesProgress",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/modes": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Modes",
        "description": "List Modes. Requires authentication.",
        "operationId": "getTradingModes",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/orders": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Orders",
        "description": "List Orders. Requires authentication.",
        "operationId": "getTradingOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Orders",
        "description": "Create Orders. Requires authentication.",
        "operationId": "postTradingOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Trading"
        ],
        "summary": "Delete Orders",
        "description": "Delete Orders. Requires authentication.",
        "operationId": "deleteTradingOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/paper/orders": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Paper Orders",
        "description": "List Paper Orders. Requires authentication.",
        "operationId": "getTradingPaperOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Paper Orders",
        "description": "Create Paper Orders. Requires authentication.",
        "operationId": "postTradingPaperOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Trading"
        ],
        "summary": "Delete Paper Orders",
        "description": "Delete Paper Orders. Requires authentication.",
        "operationId": "deleteTradingPaperOrders",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/paper/performance": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Paper Performance",
        "description": "List Paper Performance. Requires authentication.",
        "operationId": "getTradingPaperPerformance",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/paper/positions": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Paper Positions",
        "description": "List Paper Positions. Requires authentication.",
        "operationId": "getTradingPaperPositions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/trading/paper/reset": {
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Paper Reset",
        "description": "Create Paper Reset. Requires authentication.",
        "operationId": "postTradingPaperReset",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/paper": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Paper",
        "description": "List Paper. Requires authentication.",
        "operationId": "getTradingPaper",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Paper",
        "description": "Create Paper. Requires authentication.",
        "operationId": "postTradingPaper",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/positions": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Positions",
        "description": "List Positions. Requires authentication.",
        "operationId": "getTradingPositions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Positions",
        "description": "Create Positions. Requires authentication.",
        "operationId": "postTradingPositions",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/risk": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Risk",
        "description": "List Risk. Requires authentication.",
        "operationId": "getTradingRisk",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Risk",
        "description": "Create Risk. Requires authentication.",
        "operationId": "postTradingRisk",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/signals": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Signals",
        "description": "List Signals. Requires authentication.",
        "operationId": "getTradingSignals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Signals",
        "description": "Create Signals. Requires authentication.",
        "operationId": "postTradingSignals",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/trading/strategies/{id}": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "Get Strategies by ID",
        "description": "Get Strategies by ID. Requires authentication.",
        "operationId": "getTradingStrategiesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      },
      "put": {
        "tags": [
          "Trading"
        ],
        "summary": "Update Strategies",
        "description": "Update Strategies. Requires authentication.",
        "operationId": "putTradingStrategiesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Trading"
        ],
        "summary": "Delete Strategies",
        "description": "Delete Strategies. Requires authentication.",
        "operationId": "deleteTradingStrategiesById",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "404": {
            "description": "Resource not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "The id of the resource"
          }
        ]
      }
    },
    "/api/trading/strategies": {
      "get": {
        "tags": [
          "Trading"
        ],
        "summary": "List Strategies",
        "description": "List Strategies. Requires authentication.",
        "operationId": "getTradingStrategies",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Trading"
        ],
        "summary": "Create Strategies",
        "description": "Create Strategies. Requires authentication.",
        "operationId": "postTradingStrategies",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/user/analytics": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "List Analytics",
        "description": "List Analytics. Requires authentication.",
        "operationId": "getUserAnalytics",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/voice/synthesize": {
      "get": {
        "tags": [
          "Voice"
        ],
        "summary": "List Synthesize",
        "description": "List Synthesize. Requires authentication.",
        "operationId": "getVoiceSynthesize",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Voice"
        ],
        "summary": "Create Synthesize",
        "description": "Create Synthesize. Requires authentication.",
        "operationId": "postVoiceSynthesize",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    },
    "/api/ws/market-data": {
      "get": {
        "tags": [
          "Ws"
        ],
        "summary": "List Market Data",
        "description": "List Market Data. Requires authentication.",
        "operationId": "getWsMarketData",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      },
      "post": {
        "tags": [
          "Ws"
        ],
        "summary": "Create Market Data",
        "description": "Create Market Data. Requires authentication.",
        "operationId": "postWsMarketData",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "201": {
            "description": "Resource created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          },
          "401": {
            "description": "Unauthorized"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        }
      }
    }
  }
} as unknown as OpenAPISpec;
