workspace "Polaris" "Self-hosted C4 model of this repository — source of truth for architecture/diagram.png. Update this file (and re-run `npm run diagram`) whenever a container, external dependency, or major relationship changes." {

    model {
        engineer = person "Engineer" "Describes a system's functional and non-functional requirements and gets back an interactive, editable C4 diagram."

        polaris = softwareSystem "Polaris" "Turns requirements into an interactive, navigable C4 architecture diagram (Context -> Container -> Component -> Code), with every element tied back to the requirement that drove it." {
            webClient = container "Web Client" "Landing page, requirements intake, and the interactive React Flow diagram canvas: composite dagre auto-layout, skeleton loading while a level generates, PNG/SVG/Structurizr DSL export." "Next.js App Router (React), React Flow, Tailwind CSS"
            generationApi = container "Generation API" "Validates requirements, calls Claude with prompt caching enabled, and returns a typed C4 graph (Zod-validated). Requires a signed-in session." "Next.js Route Handlers"
            proxyMiddleware = container "Proxy / Middleware" "Refreshes the Clerk session on every request." "Next.js Proxy (src/proxy.ts)"
        }

        anthropic = softwareSystem "Anthropic Claude API" "Generates the C4 model as structured, schema-validated JSON from a requirements prompt (generateObject, Vercel AI SDK)." {
            tags "External System"
        }
        clerk = softwareSystem "Clerk" "Hosted sign-in/sign-up UI, session issuance, and user identity." {
            tags "External System"
        }
        posthog = softwareSystem "PostHog" "Product analytics, session replay, and error tracking, client- and server-side." {
            tags "External System"
        }

        engineer -> webClient "Describes requirements; explores, edits, and exports the resulting diagram" "HTTPS"
        engineer -> clerk "Signs in / signs up" "HTTPS, hosted UI"

        webClient -> generationApi "Requests Context+Container, Component, and Code generation" "fetch / JSON"
        webClient -> clerk "Session state, sign-in/sign-up components (SignInButton, UserButton)" "Clerk SDK"
        webClient -> posthog "Client-side product events, session replay, identify() / reset()" "HTTPS"

        proxyMiddleware -> clerk "Refreshes the session" "Clerk SDK"

        generationApi -> anthropic "Generates a structured C4 model, with prompt caching on the system prompt" "HTTPS, AI SDK"
        generationApi -> clerk "Verifies the signed-in user (auth())" "Clerk SDK"
        generationApi -> posthog "Server-side generation events (captureServerEvent)" "HTTPS"
    }

    views {
        systemContext polaris "Context" "Polaris in relation to the people and external systems it depends on." {
            include *
            autoLayout lr
        }

        container polaris "Containers" "The three pieces that make up the Polaris deployment, and what each talks to." {
            include *
            autoLayout lr
        }

        styles {
            element "Person" {
                shape Person
                background #4f46e5
                color #ffffff
                fontSize 22
            }
            element "Software System" {
                background #0e7490
                color #ffffff
            }
            element "External System" {
                background #64748b
                color #ffffff
            }
            element "Container" {
                background #0891b2
                color #ffffff
            }
        }
    }

}
