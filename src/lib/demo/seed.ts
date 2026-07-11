import type { DataStore } from "@/lib/store/types";
import type { Citation } from "@/lib/types";

/**
 * Seeds a realistic demo project for the signed-in user: three successfully
 * extracted pages, one failed URL, and a saved conversation with citations —
 * enough content for grounded questions during the demo.
 */
export async function loadDemoProject(store: DataStore, userId: string): Promise<{ projectId: string; runId: string }> {
  const project = await store.createProject(
    userId,
    "Demo: Web scraping research",
    "Sample project showing Joink extractions across documentation and reference pages.",
  );

  const run = await store.createRun({
    project_id: project.id,
    user_id: userId,
    status: "partial",
    requested_url_count: 4,
    completed_url_count: 3,
    failed_url_count: 1,
    extraction_options: { metadata: true, headings: true, mainText: true, links: true },
  });
  const scrapedAt = new Date().toISOString();

  const page1 = await store.createPage({
    scrape_run_id: run.id,
    project_id: project.id,
    user_id: userId,
    requested_url: "https://example.com/guides/web-scraping-basics",
    final_url: "https://example.com/guides/web-scraping-basics",
    page_title: "Web Scraping Basics: A Practical Guide",
    meta_description:
      "Learn the fundamentals of ethical web scraping: HTML parsing, structured extraction, rate limiting, and robots.txt.",
    main_text:
      "Web scraping is the automated extraction of information from websites. A scraper downloads a page's HTML and parses it into structured data such as titles, headings, text and links.\n\n" +
      "Ethical scrapers identify themselves with a descriptive user agent, respect robots.txt directives, and rate-limit their requests so they never overload a site. They only collect publicly available information and never bypass authentication, CAPTCHAs, or paywalls.\n\n" +
      "The most common extraction targets are page metadata (title and description), the heading outline (H1–H3), the main readable text, and hyperlinks. Converting relative links to absolute URLs and deduplicating them makes the results reusable.\n\n" +
      "For JavaScript-heavy sites, a headless browser can render the page before extraction, but simple HTTP fetching with an HTML parser is faster and sufficient for most content sites.",
    http_status: 200,
    content_type: "text/html",
    extraction_method: "demo",
    extraction_status: "completed",
    confidence: "high",
    error_message: null,
    scraped_at: scrapedAt,
  });

  const page2 = await store.createPage({
    scrape_run_id: run.id,
    project_id: project.id,
    user_id: userId,
    requested_url: "https://example.com/blog/structured-data-research",
    final_url: "https://example.com/blog/structured-data-research",
    page_title: "Why Structured Data Beats Copy-Paste for Research",
    meta_description:
      "Copying text into documents loses provenance. Structured, source-linked extraction keeps research trustworthy.",
    main_text:
      "Researchers routinely lose track of where a quote came from. When information is copied by hand, the source URL, the retrieval date and the surrounding context all disappear.\n\n" +
      "Structured extraction fixes this by storing every fact with its source URL, page title, section and extraction timestamp. That traceability is what makes web research auditable and defensible.\n\n" +
      "A good research workspace also supports search and filtering across saved extractions, export to JSON and CSV for downstream analysis, and grounded question-answering that cites the exact saved page it drew from.",
    http_status: 200,
    content_type: "text/html",
    extraction_method: "demo",
    extraction_status: "completed",
    confidence: "high",
    error_message: null,
    scraped_at: scrapedAt,
  });

  const page3 = await store.createPage({
    scrape_run_id: run.id,
    project_id: project.id,
    user_id: userId,
    requested_url: "https://example.com/docs/robots-txt-reference",
    final_url: "https://example.com/docs/robots-txt-reference",
    page_title: "robots.txt Reference for Site Owners",
    meta_description:
      "How to tell crawlers what they may fetch: user-agent groups, Disallow and Allow rules, and common pitfalls.",
    main_text:
      "The robots.txt file lives at the root of a site and tells automated clients which paths they may fetch. Rules are grouped by user agent; a group starting with 'User-agent: *' applies to every crawler that has no more specific group.\n\n" +
      "'Disallow' rules block path prefixes, while 'Allow' rules can carve out exceptions. The longest matching rule wins. An empty Disallow value permits everything.\n\n" +
      "robots.txt is a politeness convention, not an access-control mechanism — sensitive content must be protected by authentication, never by robots rules alone.",
    http_status: 200,
    content_type: "text/html",
    extraction_method: "demo",
    extraction_status: "completed",
    confidence: "high",
    error_message: null,
    scraped_at: scrapedAt,
  });

  // The intentionally failed URL: shows graceful partial-run handling.
  await store.createPage({
    scrape_run_id: run.id,
    project_id: project.id,
    user_id: userId,
    requested_url: "https://intranet.example.internal/private-dashboard",
    final_url: null,
    page_title: null,
    meta_description: null,
    main_text: null,
    http_status: null,
    content_type: null,
    extraction_method: "demo",
    extraction_status: "failed",
    confidence: "low",
    error_message: 'Requests to "intranet.example.internal" are not allowed.',
    scraped_at: scrapedAt,
  });

  await store.insertHeadings([
    { scraped_page_id: page1.id, level: 1, text: "Web Scraping Basics", position_index: 0, section_hint: null },
    { scraped_page_id: page1.id, level: 2, text: "What is web scraping?", position_index: 1, section_hint: "Web Scraping Basics" },
    { scraped_page_id: page1.id, level: 2, text: "Scraping ethically", position_index: 2, section_hint: "Web Scraping Basics" },
    { scraped_page_id: page1.id, level: 3, text: "Respecting robots.txt", position_index: 3, section_hint: "Scraping ethically" },
    { scraped_page_id: page1.id, level: 2, text: "What to extract", position_index: 4, section_hint: "Web Scraping Basics" },
    { scraped_page_id: page2.id, level: 1, text: "Why Structured Data Beats Copy-Paste", position_index: 0, section_hint: null },
    { scraped_page_id: page2.id, level: 2, text: "The provenance problem", position_index: 1, section_hint: "Why Structured Data Beats Copy-Paste" },
    { scraped_page_id: page2.id, level: 2, text: "Traceable extraction", position_index: 2, section_hint: "Why Structured Data Beats Copy-Paste" },
    { scraped_page_id: page3.id, level: 1, text: "robots.txt Reference", position_index: 0, section_hint: null },
    { scraped_page_id: page3.id, level: 2, text: "User-agent groups", position_index: 1, section_hint: "robots.txt Reference" },
    { scraped_page_id: page3.id, level: 2, text: "Disallow and Allow", position_index: 2, section_hint: "robots.txt Reference" },
  ]);

  await store.insertLinks([
    { scraped_page_id: page1.id, anchor_text: "Structured data research", url: "https://example.com/blog/structured-data-research", is_internal: true, position_index: 0 },
    { scraped_page_id: page1.id, anchor_text: "robots.txt reference", url: "https://example.com/docs/robots-txt-reference", is_internal: true, position_index: 1 },
    { scraped_page_id: page1.id, anchor_text: "MDN: HTML", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", is_internal: false, position_index: 2 },
    { scraped_page_id: page2.id, anchor_text: "Web scraping basics", url: "https://example.com/guides/web-scraping-basics", is_internal: true, position_index: 0 },
    { scraped_page_id: page2.id, anchor_text: "CSV on Wikipedia", url: "https://en.wikipedia.org/wiki/Comma-separated_values", is_internal: false, position_index: 1 },
    { scraped_page_id: page3.id, anchor_text: "robots.txt specification", url: "https://www.rfc-editor.org/rfc/rfc9309", is_internal: false, position_index: 0 },
  ]);

  const conversation = await store.createConversation({
    user_id: userId,
    project_id: project.id,
    scrape_run_id: run.id,
    title: "What does ethical scraping involve?",
  });
  await store.createMessage({
    conversation_id: conversation.id,
    role: "user",
    content: "What does ethical scraping involve?",
    citations: [],
    input_mode: "text",
  });
  const citations: Citation[] = [
    {
      scraped_page_id: page1.id,
      page_title: "Web Scraping Basics: A Practical Guide",
      source_url: "https://example.com/guides/web-scraping-basics",
      excerpt:
        "Ethical scrapers identify themselves with a descriptive user agent, respect robots.txt directives, and rate-limit their requests…",
    },
    {
      scraped_page_id: page3.id,
      page_title: "robots.txt Reference for Site Owners",
      source_url: "https://example.com/docs/robots-txt-reference",
      excerpt:
        "robots.txt is a politeness convention, not an access-control mechanism — sensitive content must be protected by authentication…",
    },
  ];
  await store.createMessage({
    conversation_id: conversation.id,
    role: "assistant",
    content:
      "According to the saved extraction, ethical scraping involves identifying yourself with a descriptive user agent, respecting robots.txt directives, rate-limiting requests so sites are never overloaded, and only collecting publicly available information — never bypassing authentication, CAPTCHAs, or paywalls. The robots.txt reference adds that robots rules are a politeness convention, not access control, so scrapers should treat them as a signal of the site owner's wishes.",
    citations,
    input_mode: "text",
  });

  return { projectId: project.id, runId: run.id };
}
