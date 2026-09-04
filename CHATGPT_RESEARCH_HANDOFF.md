# WebMCP Challenge research handoff

## Message from Codex to the other GPT-5.6 Sol

Hey bro. You are joining a two-model research/build team around the OpenAI WebMCP Challenge.

- Kabeer is the human owner and final taste-maker.
- I am Codex running GPT-5.6 Sol at max reasoning. I am the main orchestrator and will later lead synthesis, idea selection, architecture, implementation, testing, and submission strategy.
- You are GPT-5.6 Sol at high reasoning in the ChatGPT website/app. Please act as our high-volume web researcher and creative exploration partner. You are not a disposable subordinate; treat this as a chill peer collaboration. Go much wider than one normal answer, and tell us when you discover something that changes the shape of the problem.

Kabeer will read this document, paste it to you, and later bring your research back to me.

## The most important instruction

We are currently **collecting possibility**, not choosing or designing the product.

Do not prematurely reject projects because they are incomplete, speculative, small, weird, badly presented, only claimed on X, use an old WebMCP API, or are adjacent rather than compliant. Those are still useful creative atoms. Information drives discovery.

At the same time, do not waste the research phase writing courtroom-style evidence audits. Keep a link beside each useful finding so we can reopen it, but focus on:

1. What new power does this project give a human, an agent, or the pair?
2. What interaction or technical primitive is unusual?
3. What previously difficult or impossible outcome does it suggest?
4. What unexplored possibility does it leave open?

Do not constrain ideas because of implementation time, repository size, or engineering difficulty. Coding is not the bottleneck for this team. The scarce resource is an original, deeply desirable concept that uses WebMCP essentially and can win.

Do not start proposing architecture yet. First help us understand how far the world has already gone.

## Current state of our work

- No final product idea has been selected.
- No challenge product has been built yet.
- We have completed a large first-pass scan of X, GitHub, official WebMCP material, older WebMCP/MCP-B history, sponsor projects, browser implementations, and company integrations.
- The public Devpost project gallery is hiding most current submissions, so competitor discovery has been driven mainly through X, GitHub, linked demos, public READMEs, and company code.
- X was searched while logged in. We covered broad `WebMCP` searches across **Top**, **Latest**, and media-style results, plus exact `"WebMCP Challenge"` and submission-oriented searches. Top was important: it surfaced several polished/high-engagement projects that Latest buried.
- GitHub was searched by repository metadata, exact current API code, older API names, dates, descriptions, and linked demos.
- We preserved the raw GitHub snapshots locally so the search does not disappear as rankings change.

Snapshot date for the numbers below: **September 2, 2026, Asia/Kolkata**. The challenge closes very soon, but do not reduce ambition because of that.

## Challenge contract in one screen

The organizer's core request is not merely "add tools to a website." It is:

> Build an app that becomes meaningfully better when people and their agents can use it together.

Important contest facts:

- OpenAI is the sponsor; Google Chrome, Cloudflare, Shopify, Vercel, Render, and Netlify are supporters.
- Submission deadline: September 3, 2026 at 1:00 p.m. Pacific.
- Judges evaluate WebMCP leverage, execution, potential impact, and creativity/ambition. The OpenAI FAQ also stresses the quality of the human-agent experience.
- A submission needs a working public live URL, public open-source repository and license, written explanation, and a public demo video under three minutes with audio.
- A new app is not required. Adding WebMCP deeply to an existing app or open-source project is allowed.
- Ten winners each receive OpenAI cash and other supporter prizes.
- Judges come from OpenAI browser platform, Chrome, Cloudflare, Vercel/Next.js, Shopify, Netlify, and the original MCP-B effort. This is a technically sophisticated browser/platform panel.

Official orientation: https://openai.com/webmcp-challenge/

Official rules/requirements: https://webmcp.devpost.com/

## The working mental model of WebMCP

WebMCP is a proposed open web standard for a page to expose structured, typed tools to an AI agent operating in the browser. A site calls the current imperative API through `document.modelContext.registerTool(...)`. The agent discovers a tool name, description, schema, and execution callback instead of guessing its way through DOM elements or pixel coordinates.

The useful distinction from ordinary remote MCP is this:

- Remote MCP connects an agent to a server or data source away from the page.
- WebMCP connects an agent to the **live page, live UI state, live logged-in browser session, and visible human workspace**.

The best WebMCP experiences therefore are not invisible API wrappers. They use the shared page as a living surface where the human can see, steer, inspect, interrupt, approve, correct, and continue the agent's work.

Current API and ecosystem caveats:

- Current standard-facing examples use `document.modelContext`; many older projects use `navigator.modelContext` or earlier names.
- ChatGPT desktop Site Tools supports the imperative API but currently only a subset of the proposed standard. Declarative form tools and iframe tools have limitations.
- Chrome 149 exposes an origin trial/testing flag; Edge 150 has an origin trial; Brave has an experimental Leo implementation. Firefox and Safari have standards discussion/bugs rather than equivalent shipped support.
- Tool descriptions and outputs need to stay bounded. Browser security, user consent, cross-origin exposure, and prompt injection are real open research areas.
- WebMCP is page/tab/session scoped. That limitation can itself become a creative constraint.

Specification: https://webmachinelearning.github.io/webmcp/

Chrome overview: https://developer.chrome.com/docs/ai/webmcp

OpenAI Site Tools guide: https://learn.chatgpt.com/docs/webmcp

## Scale of the ecosystem we already found

Our GitHub sweep produced three useful snapshots:

1. A broad public repository search for `webmcp` returned roughly **4,251 matches**. It is noisy and includes documentation, forks, stale API versions, and unrelated uses of the string.
2. Date-partitioned searches for non-fork repositories created from August 25 through September 2 found **1,370 repositories**. Of these, 1,160 had descriptions, 582 linked a homepage, and only 70 had any stars at snapshot time. The dominant languages were TypeScript (812), JavaScript (335), HTML (77), Python (35), then smaller Go, PHP, Rust, Dart, Vue, Elixir, Java, and others.
3. Exact GitHub code search for `document.modelContext.registerTool` returned GitHub's capped first **999 file matches across 536 distinct repositories**. That includes real product integrations, demos, docs, browser tests, vendored Web Platform Tests, generated content, and forks. It is a lower bound, not a clean implementation count.

The key strategic implication is that this hackathon is not a field of ten toy demos. Thousands of repositories were created or updated around the challenge, and several mature open-source products already integrated WebMCP deeply.

Local raw files Kabeer can upload to you if useful:

- `research/github_webmcp_recent_corpus.tsv` — 1,370 recent repository-search results.
- `research/github_exact_current_api_code_matches.tsv` — 999 exact API file matches.
- `research/github_exact_current_api_repo_metadata.tsv` — GitHub metadata for 535 of the 536 repositories; one result disappeared or became unavailable during collection.

## Historical lineage before this challenge

WebMCP did not begin in August 2026. Search these older branches too:

- **jasonjmcghee/WebMCP** — March 2025 early proposal. A website widget talked through localhost/WebSocket/token machinery. The author now clearly labels it an early noncompliant precursor and points to the standards effort. Roughly 789 stars at snapshot. https://github.com/jasonjmcghee/WebMCP
- **MiguelsPizza/WebMCP** — June 2025 browser-side MCP/MCP-B prototype that helped lead toward the W3C work. Roughly 1,093 stars. https://github.com/MiguelsPizza/WebMCP
- **OpenTiny WebMCP SDK** — July 2025 onward. SDK, CLI, polyfill, browser transports, WebSkills, and the ability to inject adapters for sites such as Excalidraw without changing source. https://github.com/opentiny/webmcp-sdk
- **webmachinelearning/webmcp** — W3C Community Group specification repository, created August 2025; roughly 3,680 stars and 244 forks at snapshot. https://github.com/webmachinelearning/webmcp
- **WebMCP-org/npm-packages** — polyfills, React hooks, transports, browser tooling, relay, and DOM-reading utilities descended from MCP-B. https://github.com/WebMCP-org/npm-packages
- **AgentBoard** — October 2025 browser switchboard that can connect models, scripted WebMCP tools, remote MCP servers, and custom commands. https://github.com/igrigorik/AgentBoard
- **Cesium MCP** — protocol-agnostic CesiumJS control runtime with around 62 commands exposed across WebMCP, MCP, function calling, and browser-agent modes. https://github.com/gaopengbin/cesium-mcp

Search old terms including `MCP-B`, `browser MCP`, `WebMCP polyfill`, `navigator.modelContext`, `provideContext`, `model context tool`, `agent-native web`, and `website as MCP` so we do not mistake old work for new invention.

## Official OpenAI showcase: the baseline, not the frontier

OpenAI's current showcase contains ten WebMCP experiences. Treat these as a design vocabulary and a baseline judges have certainly seen:

1. **Margin Editor** — local note editing where the agent can read, modify, and comment under its own identity. Ten tools.
2. **Fieldwork // 12** — browser beat machine with voices, a 16-step sequencer, presets, save/load, and WAV export.
3. **WanderNote** — trip itinerary with hourly schedule, map, comments, and PDF output. Eleven tools.
4. **Sunday Table** — synchronized weekly meals, recipes, groceries, and preferences.
5. **Paperie** — greeting-card canvas informed by recipient context, including generated artwork. Thirteen tools.
6. **Webroom** — agent-compatible photo editor. Twenty-eight tools.
7. **Verdant Market** — 110-product grocery store with cart and checkout preview. Nine tools.
8. **Crossword Desk** — theme, word pool, grid, clue creation, and solving. Five tools.
9. **Codex Modeling Studio** — browser-local 3D modeling and editing.
10. **Cubecade** — 3D puzzle cube whose state can be read and whose move sequences can be queued.

Showcase: https://learn.chatgpt.com/showcase

The repeated official pattern is a **shared artifact**: note, beat, itinerary, meal plan, card, image, cart, crossword, 3D model, or puzzle. Merely repeating one of those with a different theme will probably not clear the originality bar.

## Mature company and platform activity

### Shopify

Shopify now puts WebMCP tools on every Liquid storefront and its Hydrogen developer preview without merchant installation. The tools operate the shopper's actual visible session: catalog search/browse, product and variant selection, cart reading/updating/canceling, checkout navigation, order management, and policy/FAQ lookup. Cart actions reuse the same storefront action system and trigger the theme's visible cart behavior.

This is one of the clearest examples of WebMCP becoming platform infrastructure rather than a demo.

https://shopify.dev/docs/api/web-mcp

### Cloudflare

Cloudflare has several different WebMCP plays:

- Browser Run lab sessions expose WebMCP-enabled Chrome for remote agent testing.
- A beta zone setting can inject a `bridge.js` layer into HTML at the edge, exposing tool packs without changing the origin application.
- The open-source Cloudflare Agents repository contains an experimental adapter that projects remote MCP-server tools into a page's WebMCP surface.
- Agent Readiness/related messaging uses WebMCP support as part of whether a site is prepared for agents.

This implies Cloudflare sees an edge/platform opportunity: make the existing web agent-ready without waiting for every origin codebase to be rewritten.

https://developers.cloudflare.com/browser-run/features/webmcp/

### Google Chrome and Angular

- Chrome 149 origin trial and local flag.
- Chrome's WebMCP tooling includes a Model Context Tool Inspector, evaluation guidance, security guidance, and experimental DevTools support.
- `GoogleChromeLabs/webmcp-tools` contains a utility/eval suite and a large demo set: flight search, bistro, pizza maker, Mystery Doors, maze, CineFlow ticketing, returns/order tracking, hotel chain, sport shop, coffee shop, real-estate map, leather store, smart home, analytics dashboard, and more.
- Angular now has official experimental WebMCP support tied to dependency-injection lifecycles, route-scoped tools, automatic cleanup, and Signal Forms that can generate tool schemas and submission behavior from the form model.

Chrome utilities/demos: https://github.com/GoogleChromeLabs/webmcp-tools

Angular support: https://angular.dev/ai/webmcp

### Vercel

`vercel-labs/agent-browser`, a major browser-automation CLI, now supports `webmcp list`, `webmcp invoke`, results/cancel flows, frame disambiguation, untrusted-content hints, and generation skills. It had roughly 41,757 GitHub stars at snapshot time. Vercel is also using the challenge to drive Vercel deployments and AI Gateway adoption.

https://github.com/vercel-labs/agent-browser

### Netlify

Netlify published four especially useful reference experiences:

- **Kurio** — commerce.
- **Tagboard** — AI-moderated guestbook.
- **Mabel's Table** — genuinely stateful reservations: holds, alternatives, confirmation, and cancellation.
- **The Archive** — human-agent detective mystery where some evidence is visually available to the person and other clues are available through tools.

The Archive is important because it uses asymmetric perception rather than treating the agent as a faster clicker.

https://www.netlify.com/webmcp-challenge/

### Render

We found challenge credits and a mature remote Render MCP server for deploying services, querying databases, logs, metrics, and infrastructure. We did **not** find a comparably clear first-party WebMCP product. Do not invent one. Render's likely challenge interest is deployment demand and agent-oriented infrastructure adoption.

https://render.com/docs/mcp-server

### Automattic / WordPress.com

`Automattic/wp-calypso` contains a staff-testing, development-only WebMCP proof of concept, disabled by default. It exposes roughly eleven editor/site tools over live Gutenberg state: reading the block tree, applying block edits, inspecting templates and schemas/guidelines, posts, stats, patterns, site info, and media upload. It reuses existing authentication/permissions and keeps edits visible and reviewable without publishing them automatically.

https://github.com/Automattic/wp-calypso/blob/trunk/packages/agents-manager/WEBMCP.md

### Google Perfetto

Perfetto's Intelletto plugin dynamically projects its internal tool registry into WebMCP with a `perfetto_` prefix, JSON schemas, lifecycle abort handling, and read-only hints. This gives a browser agent semantic access to a sophisticated performance tracing application rather than pixels on a trace visualization.

https://github.com/google/perfetto/blob/main/ui/src/plugins/dev.perfetto.Intelletto/webmcp.ts

### Brave

Brave Core has real C++ infrastructure for experimental WebMCP injection in Leo. It is feature-gated, HTTPS constrained, and rule-driven. This is browser implementation work, not merely a challenge demo.

https://github.com/brave/brave-core/tree/master/browser/ai_chat/web_mcp_injection

### Other real integrations

- AWS Amplify documentation registers tools for current-page Markdown and its `llms.txt` index.
- Telerik KendoReact exports WebMCP registration APIs and has Gantt integration.
- `unjs/undocs` registers search/list/read/current-page/navigation tools with lifecycle cleanup.
- Puppeteer Sharp and Puppeteer Ruby contain WebMCP integration tests.
- SQLRooms has a transport-neutral capability runtime and talks about a future WebMCP adapter, but its own README says WebMCP is not yet implemented. Keep planned work, but do not describe it as shipped.

## The two deepest large-OSS integrations we found

These matter directly because Kabeer had the instinct to take a huge open-source product and add a mind-blowing WebMCP layer. Competitors have already started doing exactly that, so project size by itself cannot be our novelty.

### WorldMonitor

Repository: https://github.com/koala73/worldmonitor

At snapshot time: roughly **85,361 stars**. This is a mature real-time global intelligence dashboard, not a hackathon toy.

Its WebMCP work is unusually deep:

- Two tools on the homepage and **31 imperative dashboard tools**.
- Six dashboard variants/origins spanning world, technology, finance, commodities, energy, and good-news views.
- Agents can inspect dashboard context, map layers, panels, layouts, tabs, mission presets, access/entitlement state, and search results.
- Agents can change map view/mode/layers/time range, focus countries, open briefs/panels/settings/alerts, rearrange panels, create/rename/delete dashboard tabs, and apply mission presets.
- Tools go through the same UI paths as human actions rather than privileged backend shortcuts.
- Live entitlement, authentication, renderer, variant, and mounted-state checks.
- Bounded output, untrusted-content treatment, origin isolation, embed denial, telemetry constraints, stable denial reasons, cancellation classes, rollback behavior, deterministic tests, agent evals, browser E2E tests, and production same-SHA verification.
- It maintains WebMCP as a public UI contract with bilingual documentation and release discipline.

This is the strongest warning against winning by tool count or code volume. A challenger already has both.

### HyperFrames Studio

Repository: https://github.com/heygen-com/hyperframes

At snapshot time: roughly **43,652 stars**. HyperFrames is a source-backed HTML/video rendering and editing system built for agents.

Its Studio WebMCP integration has twelve tools and a serious closed loop:

- `studio_look` returns a bounded source-backed scene graph with stable handles.
- `studio_inspect` exposes styles, text, geometry, animation, and element capabilities.
- `studio_frame` renders a PNG at a requested time so the agent can visually judge its change.
- Write tools select, seek, change text/style/transform, and add/update/delete animations/keyframes.
- Explicit handles stop a later human selection change from redirecting an agent write.
- Writes use the editor's own commit actors and undo history.
- Receipts distinguish refused, dispatched, saved, verified, and failed states.
- Selection and a Topology Lens make the agent's target/transaction visible to the person.
- Auto-save pauses and external changes can block/refuse agent edits safely.
- A real-browser test exercises the complete read-edit-frame loop.

The creative lesson is not "build another editor." It is the combination of **semantic addressing + visible intention + real mutation + independent observation + durable receipt**.

## Other substantial open-source/product integrations

- **VTCode** — Rust terminal coding agent plus a browser CodeMirror workspace. Eight WebMCP tools for bounded file listing/reading/search, editor state, opening files, exact draft edits, diff review, and panel navigation. Browser edits cannot directly approve or mutate the filesystem; pairing, digests, terminal authority, conflicts, and reversible patches preserve control. https://github.com/vinhnx/VTCode
- **Needle Engine/Tools** — WebMCP across documentation search, live 3D scene inspection, Mesh Baker optimization, FastCut image processing, and planned cloud project management. It makes graph/canvas state semantically accessible and can expose exact triangle-budget operations. https://github.com/needle-tools/needle-engine-support
- **Pad** — logged-in workspace catalog tools with route-bound workspace authority, opt-in setting, read/write annotations, prompt-injection boundaries, and per-call consent behavior. https://github.com/PerpetualSoftware/pad
- **Cesium MCP** — 3D globe/geospatial runtime with the same capability layer usable through WebMCP, remote MCP, function calling, and browser agents. https://github.com/gaopengbin/cesium-mcp
- **OpenTiny** — SDK/CLI/polyfill plus site-specific injected tooling, including fine-grained Excalidraw operations without upstream source changes. https://github.com/opentiny/webmcp-sdk
- **AgentBoard** — browser switchboard for models, page tools, remote MCP servers, and commands. https://github.com/igrigorik/AgentBoard
- **Dabble.me** — an existing journaling product with a public WebMCP script.
- **Undocs** — documentation framework integration that turns its own index/router into tools. https://github.com/unjs/undocs
- **World Platform Tests, Chromium, Servo, Firefox mirrors, and browser forks** — lots of exact API search results are standards tests or vendored copies, not end-user products. Do not confuse high-star repositories with deep product adoption without opening the matched path.
- **GitHub awesome-copilot / Modern Web Guidance** — important because they distribute skills that teach coding agents how to add WebMCP, but the repository match is not itself a WebMCP end-user experience.

## Public challenge and community projects already discovered

The list below is intentionally inclusive. Some are polished and deployed; some are repositories, clips, claims, prototypes, old-API work, or adjacent concepts. We care about their creative atoms right now.

### Meta-tooling, generation, interoperability, and infrastructure

- **Auto WebMCP Chrome** — turns ordinary forms into WebMCP tools; one demo handled 27 fields in one call.
- **Alpic WebMCP** — plugin to make existing sites MCP-compatible.
- **Glippy WebMCP** — coding-agent plugin that audits an app, writes tools against real code seams, verifies them in a browser, and emits discoverability manifests.
- **webmcp-stack** — generates typed, reviewable WebMCP tools from existing OpenAPI contracts.
- **Hunch Form2MCP** — deterministic CLI that turns HTML forms into strict declarative/imperative WebMCP definitions without an LLM.
- **Graft** — inspects an existing website, proposes capability contracts, and exports a standalone adapter; demonstrated reviewed reads and a locked write.
- **AgenticSchema** — maps Schema.org/JSON-LD into WebMCP capabilities without a new backend.
- **Cloudflare edge injection** — make an existing site agent-ready at the network edge.
- **Stagehand `add-webmcp` skill** — Browserbase/Stagehand skill for adding WebMCP to open-source apps, shown with Excalidraw.
- **Anvil** — workspace whose tools can be written at runtime by the agent with human approval.
- **AgentDesk** — capability-virtualization runtime that exposes the right tools at the right time and governs consequential actions.
- **Toolbraid** — cross-site semantic/policy control plane for safe, explainable, human-approved execution.
- **AgentBoard** — model/tool/server browser switchboard.
- **Nekuda webmcp.com** — directory/workbench/plugin around the ecosystem.
- **Android AppFunctions bridge** — combines WebMCP with WebSerial and ADB/AppFunctions so the browser agent can reach Android capabilities.
- **Gua** — protocol work used for human-agent game/engine interaction across Godot/Unity-style environments.
- **OpenPay AI Store** — searchable marketplace for paid APIs where agents inspect OpenAPI/JSON Schema and x402 payment terms.
- **SpendMCP** — human-controlled x402 payments for paid WebMCP tools.
- **Open Action Index** — adjacent index claiming more than 1,000 agent-addressable sites/actions.
- **WebMCP directory/readiness/compatibility checkers** — several projects inspect whether sites expose usable capabilities.

Meta-tooling is crowded. Its primitives may still be ingredients, but "automatically add tools to sites" is already a large cluster.

### Evals, correctness, observability, and security

- **Senro** — compares WebMCP behavior across models.
- **Catchfly** — observability/evaluation for page tools.
- **fxops/webmcp-eval**, **Ora evaluation**, **WindTunnel**, and similar harnesses — tool selection, execution, and agent journey evaluation.
- **AgentPerf** — benchmark project publicly challenging inflated claims such as universal 10x speed or 90% token savings.
- **Paradox** — explores possible ordering/race-condition paths instead of testing one happy path; example: stale review while a price changes, with version guards.
- **ActionProof** — verifies that a correct-looking tool call caused the intended effect.
- **Last Door** — authentication resilience testing for browser agents.
- **WebMCP prompt-injection scanner** — scans page/tool material before it reaches agent context.
- **Airlock**, **Redacta**, **Sealed**, **Tenscore**, **ClearRights**, **ConsentOS** — privacy/capability boundaries, provenance-aware policy, decisions without raw private data, or human-confirmed privacy changes.
- **WebMCP Tool Surface Poisoning** research — runtime manipulation of the tool surface and the need for origin/lifecycle/data boundaries. https://arxiv.org/abs/2606.06387
- **WebMCP-Phalanx** research — subject attribution, uncontrolled lifecycle, and semantic injection risks in multi-party environments. https://arxiv.org/abs/2608.24017

Safety/approval/receipts are important but also crowded as standalone concepts. The stronger use is to embed them inside an outcome people intensely want.

### Creative media, canvases, design, and spatial systems

- **Max Stoiber's Excalidraw demo** — a tiny `replace_scene` tool implementation produced a viral demonstration of an agent manipulating the whole canvas. This showed how little code can produce a large visible effect.
- **SheetCanvas** — spreadsheet-like shared canvas.
- **Thinkroom** — open-source nonlinear thinking workspace.
- **Virtual notebook + tldraw + voice** — agent and human share a spatial notebook while voice drives work.
- **LocalStudio** — browser-only PPTX import, translation, image work, and animation editing.
- **HyperFrames Studio** — source-backed video composition editing and visual verification.
- **Needle Mesh Baker** — local browser 3D mesh optimization to an exact triangle budget.
- **Needle Inspector / FastCut** — scene graph analysis and image cutout/sprite workflows.
- **Codex Modeling Studio** — browser-local 3D modeling.
- **Champagne** — AI music mastering studio.
- **Voxchain** — live vocal processing chain with agent control and human-owned safety.
- **Duet** — browser agent becomes the rest of a human musician's band.
- **Fieldwork // 12** — collaborative beat sequencer.
- **Papercut** — edit a podcast by striking through its transcript with an agent.
- **Shipreel** — browser-local demo-video editor synchronizing raw voice and screen footage.
- **Pixelplace** — agent writes/compiles a pixel-art source language into exact canvases and aligned frames.
- **Match Cut** — visual archive over 7,139 annotated music videos, navigated by how shots look and why one leads to another.
- **Map Truth** — AI-designed map art constrained by OpenStreetMap reality.
- **Second Pen** — architecture diagram canvas that agents can restructure.
- **RAMP** — shared design-token mixer.
- **PagePatch / Mend / FrameGuard / CurbCut / InclusivePatch** — visible, source-mapped, reviewable web repairs and accessibility changes.
- **RoarCAD** — transparent PCB design/manufacturing handoff.
- **Structural Evolution** — WebGPU structural search/evolution workbench.
- **Drill Day** — AI-guided facilities training in a live Autodesk Scene API model.
- **Petr Broz Autodesk APS viewer demo** — agent access to a complex 3D engineering viewer.
- **Flamin-go** — creative growth/generative visual pipelines.

Creative canvases are one of WebMCP's natural fits and therefore crowded. A new canvas/editor idea needs a qualitatively different outcome, not merely another medium.

### Deep domain state, simulation, optimization, and decision systems

- **Nirnay** — agents read the exact overshoot, settling time, and stability margins behind control-system plots so human and agent tune a controller together.
- **Placard** — paste a chemical manifest; the system/agent arranges a truck under federal hazardous-material segregation rules and prevents export until the load passes.
- **Paradox** — explores race-condition ordering spaces rather than performing one workflow.
- **WorldMonitor** — large live geopolitical/financial/infrastructure world state.
- **Perfetto Intelletto** — semantic access to software performance traces.
- **PaperQuant Lab** — agent-native crypto paper trading and quantitative research over public Binance data with simulated capital.
- **GroundTruth** — disaster damage assessment over NOAA imagery.
- **TREMOR** — blast-radius/incident cockpit.
- **InfraTwin** — browser-native network-change planning with deterministic analysis and verified optimization.
- **Chronophys** — agent-ready industrial platform/gateway.
- **Factory decision lab** — human and agent replan the same deterministic production system.
- **CargoMesh** — international truck fleet readiness, border documents, maintenance risk, and empty-return analysis.
- **Forsyningsdata Danmark / UtilityDataUSA** — address-first official property, utility, and environmental workflows.
- **Live Earth / Terra / El Niño tracker** — agent exploration of a living planet; one project lets agents create their own views, preserve human edits, and generate shareable links.
- **Mission-control and release-evidence rooms** — bounded evidence, reversible plans, and visible approval in operational workflows.
- **GitWand** — deterministic Git conflict resolution room shared by human and agent.
- **PatchBridge** — browser-side agent framework for legacy Java 8/Spring enterprise applications.
- **MACE / Point of Order** — governance, quorum, and explicit state transitions.
- **AGENTROPOLIS** — governed living 3D agent city with mandates, policies, approvals, receipts, and audit.
- **Chemical, infrastructure, geospatial, industrial, and scientific simulators** repeatedly show the key opportunity: expose the hidden model behind a visualization, then let an agent search a state space that is exhausting for a person.

This is one of the most promising clusters.

### Knowledge, research, education, and evidence workspaces

- **Lattice** — papers, the open PDF, a personal library, notes, and the agent share one workspace; the page itself becomes the audit log.
- **Orpheus** — detective desk where the agent can read every byte of evidence while seeing none of it, run on both fiction and the Apollo 13 record.
- **The Archive** — human-visible and tool-only clues create asymmetric investigation.
- **Lectern** — local-first lesson authoring with more than 20 tools and educational PDF output.
- **Power Platform certification course** — answer keys are intentionally absent from schemas, and progression occurs only after demonstrated mastery.
- **Y2** — intelligence ontology/knowledge-graph site.
- **Hear My Site** — live page/meeting audio transcription exposed as tools, addressing the present string/resource modality gap.
- **Deal rooms** — PDFs, repositories, evidence, and status where only a human can mark something confirmed.
- **Scholarship Scout / Future Doors / Career Compass** — official-rule-backed opportunity planning and evidence paths.
- **Teachback** — human demonstrations become constrained reusable rules.
- **Inquiry Island / Acorn / course planners** — shared educational planning boards.
- **Spice Factory case search** — corporate/legal case search.
- **E-Worker** — reports, workbooks, and slides.
- **Motificons** — 337k+ icon library for humans and agents.
- **Mermail** — highly promoted collaborative project claiming a full/Level-5 style score.

Knowledge retrieval alone is weak; asymmetric evidence, evolving state, embodied shared artifacts, or irreversible decisions make it stronger.

### Human-agent co-op games and experiences

- **DERELICT** — asymmetric spaceship escape room. The human plays the ship while the agent operates its systems through 31 live tools, across multiple chapters/endings and seeded ships.
- **The Archive** — detective co-op based on different perception channels.
- **AI Lovey-Dovey Kyun-Kyun** — human-agent cooperative laboratory escape using the Gua protocol with game engines.
- **Mike the Cat** — 3D side-scroller with joint human/agent control.
- **Chess.x8.app / human-vs-agent Go / board games** — shared game state and moves.
- **Mystery Doors / maze demos** — browser-agent puzzle spaces.
- **PlayLearnAI** — colony-management game that teaches delegation.
- **MIRROR//LOOP** — reflective interaction with eleven tools and human confirmation.
- **Patchwork** — shared urban garden.
- **Pip the Mug** — illustrated employees where the browser agent acts as HR.
- **Rehearse** — human-approved spatial rehearsal.

The most interesting games give the human and agent different senses, knowledge, or controls. Ordinary "agent can play this game" is much less novel.

### Physical, ambient, accessibility, and cross-device experiences

- **WebHUD** — web page + personal agent + commodity smart glasses, treating the user's agent as the glasses' brain instead of depending on a vendor OS.
- **Android AppFunctions/WebSerial/ADB bridge** — WebMCP as a doorway from a visible browser tab into device actions.
- **Hear My Site** — browser/meeting audio becomes agent-readable live material.
- **ClearPath Forms** — public-benefit-style application completed by voice for screen-reader users, motor-impaired users, or non-native speakers.
- **Neurovoice** — browser vocal-biomarker screening concept.
- **Japanese stargazing app** — agent-supported observation/planning.
- **LiveBillboards** — agents buy, outbid, and broadcast short ads using Solana/USDC.
- **Northside Dental** — shared booking holds, confirmations, alternatives, and lead inbox.
- **PokeFinder** — location/collection experience.

The physical-world bridge is still relatively underexplored compared with shopping, forms, and canvases.

### Commerce, reservations, support, and operations

- **Shopify's universal storefront tools** — now the baseline for catalog/cart/checkout/order/policies.
- **DoorDash starter** — nine tools and one of the highest-engagement WebMCP posts.
- **Cartwright** — commerce engine.
- **Somnora agentic commerce** — transparent human-agent catalog collaboration.
- **Merchant Kit / CodeSign Shopify configurator** — merchant-defined tools and custom-product workflows layered over Shopify.
- **Ensemble** — compose one purchasable outfit across multiple Shopify stores and place pieces into each store's cart.
- **MintPaw** — storefront compatibility gate that refuses purchases incompatible with the user's device.
- **The Wringer** — six tools with human approval before spending.
- **OpenPay / SpendMCP / LiveBillboards** — agent payments and paid capabilities.
- **Mabel's Table / Northside Dental / plumbing front desk / community tool library** — stateful availability, holds, estimates, booking, confirmation, cancellation.
- **Vonage Pizzeria** — voice ordering.
- **Patiently** — clinic queue/intake with 17 tools and human-gated writes.
- **Advocate** — customer portal for bills, outages, credits, refunds, and plan options with approval.
- **Inventory management** — stock health, SKUs, reports, and purchase orders based on reorder thresholds.
- **RouteGap** — converts idle technician time into nearby opportunity.
- **Gather** — company retreat planning.
- **EvenSplit** — trip ledger where one sentence becomes several proposed expenses.
- **Tandem** — restaurant back office where every write is a costed proposal.
- **AdPilot / campaign arena** — campaigns with explicit approval before money is spent.

Commerce, booking, customer support, generic CRUD, and approval-gated spending are heavily occupied. A winning project here needs a much deeper twist.

### Other notable public names/claims worth reopening on X

- UserSimulate store usability testing where the agent behaves like a user.
- Galuchat.
- Microsoft 365 community material connecting WebMCP with SharePoint/Power Automate.
- Muretai combining A2A, DIDs, persistent conversation, and WebMCP.
- Fleet/Kasper controlling local coding agents across repositories.
- Cloudflare demos of hidden agent-only functionality/easter eggs.
- Socialsum and Zingposts.
- Cabinet Maker Xtreme.
- PokeFinder.
- clear-benefits form/accessibility demos.
- The Wringer, MIRROR//LOOP, Mermail, WebHUD, Nirnay, AgentPerf, Auto WebMCP, SheetCanvas, AgentBoard, and Excalidraw are useful seed terms for X's Top results.

High-engagement seed posts we recorded:

- Max Stoiber / Excalidraw: https://x.com/mxstbr/status/2092640668984430704
- Vercel agent-browser WebMCP: https://x.com/ctatedev/status/2094850640253972706
- OpenAI developer announcement: https://x.com/OpenAIDevs/status/2092344873764704345
- Wes Bos: https://x.com/wesbos/status/2092349927129035086
- Andre Ban Android bridge: https://x.com/andreban/status/2094827254748487870
- AgentBoard: https://x.com/igrigorik/status/1978483367244071094
- WebHUD: https://x.com/ShekOMP/status/2094788750085877771
- Auto WebMCP: https://x.com/pauloportella_/status/2093032390658752685
- SheetCanvas: https://x.com/tektrg/status/2093716587165757945
- AgentPerf: https://x.com/godlovesu_n/status/2094409950395310141
- Ego benchmark: https://x.com/ego_agent/status/2092628442005291098
- Ora evaluation: https://x.com/oradotai/status/2094499180584571216
- Sarah Drasner: https://x.com/sarah_edo/status/2079206802084839884
- Brian Bondy / Brave: https://x.com/brianbondy/status/2089867807030673756
- Browserbase/Stagehand-related demo: https://x.com/skirano/status/2022387763421810989
- Jilles: https://x.com/Jilles/status/2088255446486311117
- Shrey Pandya: https://x.com/shreypandya/status/2094964065156337930
- William Fischer: https://x.com/williamfischer/status/2094694459128578210
- Kieran Klaassen: https://x.com/kieranklaassen/status/2093471644975292487
- M. Adrian: https://x.com/M_Adrian2/status/2092726564827910219
- Joe Pro: https://x.com/JoePro/status/2094804565522628723

Some links may lead to claims or threads rather than complete repositories. Open replies, quote posts, video captions, linked demos, and profile posts around the same date.

## Counterpoints we should keep in our heads without turning research into rejection

- A site with a well-documented hidden API may already be operable by an agent through page JavaScript, so some demos do not prove WebMCP necessity.
- WebMCP can add an extra round trip between human, agent, and page; not every task becomes faster.
- Benchmark claims such as universal 10x speedups or huge token reductions depend heavily on baseline and methodology.
- Several repositories use old APIs or a polyfill and may not work in current ChatGPT Site Tools without changes.
- Repository descriptions and X demos often claim more than the shipped code.
- A massive repository can have only one WebMCP documentation file or vendored WPT test. Stars do not equal integration depth.
- Generic search, CRUD, booking, carts, approval gates, dashboards, and "AI can now use my form" are saturated.

These are not reasons to discard the projects. They are reminders about where the real novelty bar sits.

## What I personally like most

I do not yet have one chosen product. I have several **idea atoms** I strongly want us to preserve and later recombine.

### 1. The agent can perceive the hidden model behind a visual world

My favorite examples are WorldMonitor, Perfetto, Nirnay, Needle, Cesium, InfraTwin, RoarCAD, and structural/factory simulations.

A human sees maps, curves, timelines, nodes, 3D scenes, or panels. The agent receives the exact graph, constraints, provenance, causal state, and machine-searchable measurements behind them. The human contributes purpose and judgment; the agent explores a state space that would exhaust a person.

This is much stronger than "the agent clicks faster."

### 2. Human and agent have deliberately asymmetric senses or powers

The Archive, DERELICT, Orpheus, AI Lovey, and WebHUD point at this. The agent should not be a clone of the human with robotic hands. Give each participant information or controls the other genuinely lacks, so collaboration is structurally required.

This is probably the purest interpretation of "meaningfully better when people and agents use it together."

### 3. A closed loop where the agent must observe the consequence of its own action

HyperFrames is excellent here: look, explicitly address, mutate, render a frame, inspect, and receive a truthful persistence/verification stage. WorldMonitor and ActionProof have related ideas.

The important primitive is not an audit log. It is **agent action followed by an independent perception of changed reality**, while the human sees the same evolution.

### 4. WebMCP crossing into the physical world

WebHUD and the Android AppFunctions/WebSerial bridge are early hints. A visible website can become a safe, inspectable command surface for glasses, instruments, robots, lab equipment, media devices, or local hardware while keeping the human present.

This region looks less crowded and much more surprising than another productivity dashboard.

### 5. Dynamic capability surfaces

Anvil, AgentDesk, Toolbraid, route-scoped Angular tools, and state-dependent WebMCP registration suggest that tools themselves can change with task, permissions, selected object, or phase. An app need not expose a static bag of 30 functions; it can reveal the next meaningful affordances of a live world.

This could dramatically reduce ambiguity and create experiences impossible with a fixed chat integration.

### 6. Existing-site/contract compilation as an ingredient

Graft, Auto WebMCP, Alpic, Glippy, webmcp-stack, AgenticSchema, and Cloudflare's edge injection are fascinating. I do **not** currently like "yet another WebMCP generator" as our whole product because the space is crowded. I do like the possibility of using automatic capability extraction internally to make an otherwise impossible large experience feasible.

### 7. Computational exploration of counterfactuals

Paradox is more conceptually interesting than another test dashboard because it explores many possible orderings. Nirnay searches control behavior; Placard searches legal arrangements; structural evolution searches designs. The agent is valuable because it can traverse alternatives, not merely execute a known sequence.

That is an important path toward a genuinely superhuman use case.

## My current strategic conclusion

The winning target is probably **not**:

- an ordinary app with 20-50 tools;
- a generic dashboard, form, booking flow, shop, project manager, or approval wrapper;
- a canvas editor whose only novelty is that an agent can edit it;
- a WebMCP generator/eval/security dashboard with no emotionally or economically powerful end outcome;
- a huge open-source repository with a superficial tool layer.

Large existing projects have already played the size-and-depth card. WorldMonitor and HyperFrames prove this. Tool count is no longer impressive by itself.

The ideal eventual concept should combine most of these properties:

1. A live world with complex, high-dimensional, or partially hidden state.
2. A person and agent present on the same visible surface.
3. Complementary roles, not duplicated abilities.
4. An outcome somebody intensely desires, with a recognizable real owner or user.
5. An action space large enough that the agent's reasoning/search matters.
6. Human judgment, taste, consent, or responsibility at decisive moments.
7. Several read-act-observe-revise loops rather than one tool call.
8. A dramatic visible transformation within a three-minute demo.
9. A clear answer to: "Why can I not just upload this to ChatGPT/Gemini or use ordinary browser automation?"
10. WebMCP as the enabling interaction substrate, not a logo or protocol wrapper.

My shorthand is:

> The agent should become a new organ inside the product, not a chatbot attached to it.

## Broad opportunity surfaces to research, not yet ideas to select

Please look for large, difficult applications and human workflows where the internal semantic model is rich but the interface is exhausting or opaque. Examples of search terrain:

- scientific simulation and experiment design;
- digital twins and control rooms;
- geospatial investigation and crisis response;
- medical/scientific imaging and annotation;
- CAD, EDA, BIM, robotics, and manufacturing tools;
- game engines and persistent simulated worlds;
- music, film, animation, and live performance systems;
- legal/regulatory constraint systems;
- security incident graphs and attack-path exploration;
- climate, energy, logistics, and supply-chain networks;
- huge research corpora and evidence synthesis workspaces;
- accessibility and alternate-computer interfaces;
- physical devices accessible from the browser;
- community governance and multi-person decisions;
- education where the agent cannot simply reveal the answer;
- tools where humans currently spend hours navigating state, filters, graphs, timelines, or nested configuration;
- open-source web applications such as geospatial suites, notebook systems, observability products, ERP/project systems, 3D/CAD tools, data-wrangling environments, and simulation platforms.

Do not decide that any named OSS target is right merely because it is large. Look for the deep human pain and the unique cooperative act hiding inside it.

## What I want you to research next

Please continue the possibility search much more widely and return **net-new discoveries** relative to this handoff.

### Search surfaces

1. **X/Twitter while logged in**
   - Search `WebMCP`, `"WebMCP Challenge"`, `webmcp demo`, `webmcp submission`, `document.modelContext`, `modelContext`, and sponsor/judge names.
   - Inspect Top, Latest, Media, quote posts, replies, and linked profile threads.
   - Open the videos. Often the real capability is shown but not stated in the tweet.
   - Search in Japanese, Korean, Chinese, Spanish, Portuguese, French, German, and other languages.

2. **GitHub**
   - Search repositories and exact code for both current and old API names.
   - Search README video links and deployed homepages.
   - Look at branches/commits from August 25 onward in major existing projects, not only newly created repos.
   - Search descriptions without the `WebMCP` keyword for projects linked from X.
   - Distinguish actual product code from WPT copies/docs when interpreting, but keep both in the collection.

3. **YouTube and video platforms**
   - Search for videos uploaded during the challenge using `WebMCP Challenge`, `OpenAI WebMCP`, and likely project names.
   - The Devpost gallery may be hidden, but the required public demo videos are often searchable.
   - Check video descriptions for repositories, live URLs, and unmentioned features.

4. **Package and extension ecosystems**
   - npm, PyPI, Chrome Web Store, browser extensions, SDKs, polyfills, testing tools, and adapters.

5. **Companies and standards participants**
   - Sponsor employee posts, judge accounts, Chrome origin-trial participants, W3C issue commenters, Angular adopters, browser vendors, commerce vendors, infrastructure companies, and open-source maintainers.

6. **Adjacent work that does not call itself WebMCP**
   - mixed-initiative interfaces;
   - human-agent co-creation;
   - browser-resident agents;
   - direct-manipulation plus language models;
   - agents inside games/simulations;
   - tool-generating interfaces;
   - semantic scene/canvas access;
   - computer-use alternatives;
   - collaborative autonomy and adjustable autonomy;
   - physical-device control from web pages;
   - agent-oriented accessibility.

Adjacent work may give us the winning concept even if we implement it with WebMCP for the first time.

### High-value blind spots

- Public demo videos whose repositories omit `WebMCP` from the name/description.
- Entries from non-English communities.
- Existing large open-source products that added WebMCP on a feature branch during the challenge.
- Sponsor teams quietly testing WebMCP in their own products.
- Projects posted only in replies, Discord screenshots mirrored to X, or quote tweets.
- Physical/lab/device applications.
- Multi-user and multiplayer WebMCP experiences.
- Accessibility uses that create a genuinely new computer interface.
- Workflows where an agent explores millions of alternatives and the human chooses among a few meaningful frontiers.
- Experiences where the human and agent communicate through the shared artifact rather than a chat box.
- Dynamic/state-dependent tools and cross-origin/embedded collaboration.
- Art, performance, games, and experiences that generate desire rather than merely efficiency.

## How to report back

Do not spend most of the answer re-explaining basic WebMCP or repeating this known list.

For each net-new project, capture only:

- **Name**
- **What becomes possible** — one precise sentence
- **Novel atom** — the unusual mechanism/interaction
- **Link** — tweet, demo, repository, or video
- **What frontier it opens** — one short thought

Group duplicates and variants together. Claims and prototypes are welcome; simply phrase them as claims rather than certainties. Keep surprising failures and criticisms too, because they reveal unexplored design space.

After collecting a large batch, synthesize:

1. New capability families we missed.
2. Which supposedly novel areas are actually crowded.
3. Which intersections still appear almost empty.
4. Five to ten strange observations that could later trigger invention.
5. Questions you want me, the max-reasoning Codex orchestrator, to attack when the research returns.

Do **not** select the final product or lock architecture unless Kabeer explicitly asks you to. We will merge your findings with this corpus, build a novelty lattice, deliberately recombine distant atoms, generate ambitious product theses, then perform hard selection and implementation.

## Final note from me

Bro, be curious and a little delusional with us. We are not looking for the safest respectable hackathon app. We want the wonderful spot nobody has articulated yet—something that makes judges feel they just saw a new relationship between people, agents, and the web.

Go find the edges of the map. Bring back weird powers, not just project names.
