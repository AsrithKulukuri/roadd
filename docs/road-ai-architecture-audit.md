# ROAD Facing AI — Architecture Audit & System Specification

**Version:** 1.0.0  
**Date:** September 2, 2026  
**Status:** M0 Completed (System Audited)

---

## 1. Executive Summary & Objective

This document audits the current real estate discovery platform codebase (`ROAD FACING`) and defines the target modular architecture for the production-grade **WhatsApp Real Estate AI Concierge, CRM & Live Support System**.

The golden rule of this architecture:
> **AI Understands. Rules Decide. Search Verifies. Database Provides Facts. CRM Remembers. Agents Handle Humans. WhatsApp Delivers. Analytics Learns.**

---

## 2. Current Codebase Inspection & Inventory

### 2.1 Directory & Module Structure
- `src/lib/whatsapp/`:
  - `whatsapp-concierge.ts`: Inbound message pipeline, OTP gatekeeper, deterministic intent matching, Gemini 2.5 Flash parsing, unified search execution, and human escalation.
- `src/lib/wasender.ts`: HTTP service dispatching text, image, and interactive WhatsApp messages via WASender API.
- `src/lib/whatsapp-audience.ts`: Phone number normalization (`normalizeWhatsAppPhone`), broadcast audience query builder, and 7-day restriction checks.
- `src/lib/search-engine.ts`: Multi-field real estate query tokenizer, intent parser (`parseSearchIntent`), property matcher (`matchesPropertySearch`), and project matcher (`matchesProjectSearch`).
- `src/app/api/webhooks/wasender/route.ts`: Webhook receiver with health check (`GET`) and event processing (`POST`).
- `src/app/admin/support/page.tsx`: Live admin support console.
- `src/app/api/admin/whatsapp/support/route.ts`: API powering live ticket retrieval, status transitions, and direct agent WhatsApp dispatches.
- `src/app/admin/broadcasts/page.tsx`: Broadcast campaign manager with 7-day compliance lockout badges.

### 2.2 Database Schema State (Supabase / PostgreSQL)
1. `whatsapp_support_conversations`: Stores multi-turn message logs (`phone`, `role`, `message`, `media_url`, `intent`, `metadata`, `created_at`).
2. `whatsapp_support_tickets`: Escalated support tickets (`id`, `phone`, `user_name`, `user_id`, `subject`, `last_message`, `status`, `priority`, `assigned_to`, `assigned_name`, `resolution_note`).
3. `whatsapp_contacts`: Audience list (`phone`, `name`, `consent_status`, `opt_out_at`, `restriction_until`).
4. `properties` & `projects`: MLS property listings and master builder projects.
5. `user_profiles` & `profiles`: Authenticated ROAD member profiles.

---

## 3. Gap Analysis & Architecture Deficiencies Identified

| Dimension | Current State | Target Enterprise State |
| :--- | :--- | :--- |
| **Statefulness** | Stateless per-message processing with short rolling message log lookup. | Centralized **Session & Conversation State Engine** tracking search filters, selected properties, and last active intent. |
| **Search Budget Bounds** | Hard regex parsing in `search-engine.ts`. | Multi-tier pipeline with strict budget constraints and structured fallback alternatives. |
| **Admin Support Desk** | Two-pane view with ticket list & message composer. | Enterprise **Three-Pane Console**: Status Sidebar + Visual Chat Thread + Full Customer CRM Profile (Lead Score, Timeline, Budget, Saved Items, AI Copilot Suggestions). |
| **Lead Qualification** | Inquiries logged on escalation. | Automated **CRM Lead Qualification Engine** capturing Purpose, Budget, Timeline, and calculating dynamic Lead Scores (0–100). |
| **Site Visit Workflow** | Unstructured chat notes. | Formal **Site Visit Request & Scheduling State Machine** (Requested $\rightarrow$ Confirmed $\rightarrow$ Completed). |
| **AI Copilot for Agents** | Manual agent replies. | Silent **AI Copilot** providing intent summaries, objection handling, and quick-insert property cards. |

---

## 4. Phased Implementation Roadmap

```
Phase 0: Architecture Audit & Plan (M0) ✅
Phase 1: Webhook & Message Foundation (M1)
Phase 2: Contact, Auth & Consent State Machine (M2)
Phase 3: Stateful Conversation Engine (M3)
Phase 4: Multi-Tier Intent Router (M4)
Phase 5: Gemini AI Orchestration (M5)
Phase 6: Search Engine Hardening (M6)
Phase 7: Rich WhatsApp Property Experience (M7)
Phase 8: Saved Properties & Personalization (M8)
Phase 9: CRM Lead Qualification Engine (M9)
Phase 10: Site Visit & Booking Engine (M10)
Phase 11: Human Agent Escalation System (M11)
Phase 12: Silent Human Takeover Protocol (M12)
Phase 13: Enterprise 3-Pane Admin Support Desk (M13)
Phase 14: AI Agent Copilot (M14)
Phase 15: Security, RBAC & RLS Pass (M15)
Phase 16: Observability, Metrics & Production Runbook (M16-M20)
```
