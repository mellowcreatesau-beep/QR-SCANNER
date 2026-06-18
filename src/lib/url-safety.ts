export type Severity = "safe" | "caution" | "danger" | "info";
export type Verdict = "safe" | "caution" | "danger" | "not-url";

export interface SafetyCheck {
  id: string;
  label: string;
  severity: Severity;
  passed: boolean;
  detail: string;
}

export interface SafetyReport {
  verdict: Verdict;
  url: URL | null;
  rawValue: string;
  checks: SafetyCheck[];
}

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "lnkd.in",
  "shorte.st", "adf.ly", "bl.ink", "snip.ly", "su.pr", "trib.al", "qr.ae",
]);

const SUSPICIOUS_TLDS = new Set([
  "zip", "mov", "top", "xyz", "tk", "ml", "ga", "cf", "gq", "work",
  "click", "country", "kim", "loan", "men", "gdn", "racing", "review",
]);

const BRAND_KEYWORDS = [
  "paypal", "apple", "microsoft", "google", "amazon", "facebook", "instagram",
  "netflix", "bank", "chase", "wellsfargo", "secure", "login", "verify",
  "account", "support", "appleid", "icloud",
];

const IP_REGEX = /^\d{1,3}(\.\d{1,3}){3}$|^\[?[0-9a-fA-F:]+\]?$/;

function isIp(host: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.startsWith("[") && host.endsWith("]")) return true;
  return false;
}

function hasMixedScript(host: string): boolean {
  const latin = /[a-zA-Z]/.test(host);
  const nonLatin = /[^\u0000-\u007F]/.test(host);
  return latin && nonLatin;
}

function getRegistrableDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

export function analyzeUrl(rawValue: string): SafetyReport {
  const trimmed = rawValue.trim();
  const checks: SafetyCheck[] = [];

  // Dangerous schemes first
  if (/^javascript:/i.test(trimmed)) {
    return {
      verdict: "danger",
      url: null,
      rawValue: trimmed,
      checks: [{
        id: "scheme-js",
        label: "JavaScript URI",
        severity: "danger",
        passed: false,
        detail: "This QR code runs JavaScript directly. Do not open.",
      }],
    };
  }
  if (/^data:/i.test(trimmed)) {
    return {
      verdict: "danger",
      url: null,
      rawValue: trimmed,
      checks: [{
        id: "scheme-data",
        label: "Data URI",
        severity: "danger",
        passed: false,
        detail: "Embeds inline content (often used to hide payloads). Do not open.",
      }],
    };
  }

  let url: URL | null = null;
  try {
    // Add scheme if missing so URL parses
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    url = new URL(candidate);
  } catch {
    return { verdict: "not-url", url: null, rawValue: trimmed, checks: [] };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { verdict: "not-url", url: null, rawValue: trimmed, checks: [] };
  }

  const host = url.hostname;

  // HTTPS
  checks.push({
    id: "https",
    label: "Uses HTTPS",
    severity: url.protocol === "https:" ? "safe" : "caution",
    passed: url.protocol === "https:",
    detail: url.protocol === "https:"
      ? "Connection is encrypted."
      : "Plain HTTP — traffic isn't encrypted and can be intercepted.",
  });

  // IP address
  const ip = isIp(host);
  checks.push({
    id: "ip",
    label: "Domain name (not raw IP)",
    severity: ip ? "danger" : "safe",
    passed: !ip,
    detail: ip
      ? "Points directly to an IP address. Legitimate services almost never do this."
      : "Uses a normal domain name.",
  });

  // Credentials in URL
  const hasCreds = !!url.username || !!url.password;
  checks.push({
    id: "creds",
    label: "No embedded credentials",
    severity: hasCreds ? "danger" : "safe",
    passed: !hasCreds,
    detail: hasCreds
      ? "Embeds a username/password in the URL — classic obfuscation trick."
      : "No credentials in the URL.",
  });

  // @ symbol obfuscation (after scheme, before path)
  const atObfuscation = /^https?:\/\/[^/]*@/i.test(trimmed) && !hasCreds;
  if (atObfuscation) {
    checks.push({
      id: "at-symbol",
      label: "No '@' obfuscation",
      severity: "danger",
      passed: false,
      detail: "Contains '@' before the path — the real host is what comes after.",
    });
  }

  // Punycode / mixed script
  const puny = host.split(".").some((p) => p.startsWith("xn--"));
  const mixed = hasMixedScript(host);
  checks.push({
    id: "punycode",
    label: "No lookalike characters",
    severity: puny || mixed ? "danger" : "safe",
    passed: !(puny || mixed),
    detail: puny
      ? "Domain uses punycode (xn--). Letters may look like a familiar brand but aren't."
      : mixed
      ? "Domain mixes Latin and non-Latin characters — possible homograph attack."
      : "Standard characters only.",
  });

  // URL shortener
  const shortened = SHORTENERS.has(host.toLowerCase());
  if (shortened) {
    checks.push({
      id: "shortener",
      label: "Not a URL shortener",
      severity: "caution",
      passed: false,
      detail: `${host} is a URL shortener — the real destination is hidden until you open it.`,
    });
  } else {
    checks.push({
      id: "shortener",
      label: "Not a URL shortener",
      severity: "safe",
      passed: true,
      detail: "Destination is the actual host, not a redirect.",
    });
  }

  // Suspicious TLD
  const tld = host.split(".").pop()?.toLowerCase() ?? "";
  const badTld = SUSPICIOUS_TLDS.has(tld);
  if (badTld) {
    checks.push({
      id: "tld",
      label: "Common top-level domain",
      severity: "caution",
      passed: false,
      detail: `.${tld} is commonly abused for spam or phishing.`,
    });
  }

  // Subdomain depth
  const parts = host.split(".");
  if (!ip && parts.length > 4) {
    checks.push({
      id: "subdomains",
      label: "Normal subdomain depth",
      severity: "caution",
      passed: false,
      detail: `${parts.length - 2} subdomain levels — phishing pages often nest brand names this way.`,
    });
  }

  // Brand keyword in subdomain but not registrable domain
  if (!ip && parts.length >= 3) {
    const registrable = getRegistrableDomain(host).toLowerCase();
    const sub = parts.slice(0, -2).join(".").toLowerCase();
    const brand = BRAND_KEYWORDS.find((b) => sub.includes(b) && !registrable.includes(b));
    if (brand) {
      checks.push({
        id: "brand-spoof",
        label: "No brand spoofing",
        severity: "caution",
        passed: false,
        detail: `"${brand}" appears in the subdomain but the real domain is ${registrable}.`,
      });
    }
  }

  // Non-standard port
  if (url.port && url.port !== "80" && url.port !== "443") {
    checks.push({
      id: "port",
      label: "Standard port",
      severity: "caution",
      passed: false,
      detail: `Uses non-standard port :${url.port}.`,
    });
  }

  // Length / params informational
  if (trimmed.length > 200 || url.searchParams.toString().length > 150) {
    checks.push({
      id: "length",
      label: "URL length",
      severity: "info",
      passed: true,
      detail: "URL is unusually long — review parameters before opening.",
    });
  }

  const hasDanger = checks.some((c) => !c.passed && c.severity === "danger");
  const hasCaution = checks.some((c) => !c.passed && c.severity === "caution");
  const verdict: Verdict = hasDanger ? "danger" : hasCaution ? "caution" : "safe";

  return { verdict, url, rawValue: trimmed, checks };
}