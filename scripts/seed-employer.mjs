// Seed a hand-recruited pilot employer (M10). Creates a verified employer account +
// profile + one active listing via the service-role key. Run once per real, consented
// employer. Reads Supabase creds from .env.local (or the process env in a deploy shell).
//
// Usage:
//   node scripts/seed-employer.mjs \
//     --email owner@business.com --password "TempPass123" \
//     --business "Café Ballkoni" [--business-type cafe] [--phone +38344...] [--contact-email hr@...] \
//     [--description "..."] \
//     --title "Barista" --category barista --pay-min 3.50 [--pay-max 4.00] \
//     --pay-period hourly --job-type part_time [--experience none]
//
// Pay is in EUROS (decimal) and stored as integer cents. Categories/business-types are
// matched by slug (see the categories/business_types tables). Idempotent on email.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(resolve(process.cwd(), "package.json"));
const { createClient } = require("@supabase/supabase-js");

// ---- args ----
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const val = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : "true";
    args[key] = val;
  }
}
function req(name) {
  if (!args[name]) {
    console.error(`Missing required --${name}. See the header of this file for usage.`);
    process.exit(1);
  }
  return args[name];
}
const eurosToCents = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid pay value: ${v}`);
  return Math.round(n * 100);
};

// ---- env ----
const envPath = resolve(process.cwd(), ".env.local");
let env = { ...process.env };
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] ||= line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (in .env.local or env).");
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const email = req("email");
  const password = req("password");
  const business = req("business");
  const jobType = args["job-type"] ?? "part_time";
  const experience = args["experience"] ?? "none";
  const payPeriod = args["pay-period"] ?? "hourly";
  const payMin = eurosToCents(req("pay-min"));
  const payMax = args["pay-max"] ? eurosToCents(args["pay-max"]) : null;
  if (payMax != null && payMax < payMin) throw new Error("pay-max < pay-min");

  // 1. Auth user (role clamped to employer server-side) + verify.
  let userId;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: "employer", city_id: "", locale: "sq" },
  });
  userId = created?.user?.id;
  if (cErr) {
    if (!/already/i.test(cErr.message)) throw new Error(`createUser: ${cErr.message}`);
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list.users.find((u) => u.email === email)?.id;
    if (!userId) throw new Error("could not resolve existing user");
    console.log(`(user ${email} already existed — reusing)`);
  }
  await admin.from("users").update({ email_verified_at: new Date().toISOString(), status: "active" }).eq("id", userId);

  // 2. Resolve city (Ferizaj), category, optional business type.
  const { data: city } = await admin.from("cities").select("id").eq("name", "Ferizaj").single();
  const { data: cat, error: catErr } = await admin.from("categories").select("id").eq("slug", req("category")).maybeSingle();
  if (catErr || !cat) throw new Error(`category slug '${args.category}' not found`);
  let businessTypeId = null;
  if (args["business-type"]) {
    const { data: bt } = await admin.from("business_types").select("id").eq("slug", args["business-type"]).maybeSingle();
    businessTypeId = bt?.id ?? null;
    if (!businessTypeId) console.warn(`(business-type '${args["business-type"]}' not found — leaving null)`);
  }

  // 3. Employer profile (upsert-ish).
  let { data: ep } = await admin.from("employer_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!ep) {
    const r = await admin.from("employer_profiles").insert({
      user_id: userId, business_name: business, business_type_id: businessTypeId,
      description: args.description ?? null,
      contact_phone: args.phone ?? null, contact_email: args["contact-email"] ?? null,
    }).select("id").single();
    if (r.error) throw new Error(`employer_profile: ${r.error.message}`);
    ep = r.data;
  }

  // 4. Listing.
  const { data: listing, error: lErr } = await admin.from("listings").insert({
    employer_profile_id: ep.id, city_id: city.id, category_id: cat.id,
    title: req("title"), description: args.description ?? null,
    job_type: jobType, required_experience: experience,
    pay_min: payMin, pay_max: payMax, pay_period: payPeriod, status: "active",
  }).select("id").single();
  if (lErr) throw new Error(`listing: ${lErr.message}`);

  console.log(JSON.stringify({
    ok: true, email, userId, employerProfileId: ep.id, listingId: listing.id,
    payCents: { min: payMin, max: payMax }, note: "share the temp password; they reset it.",
  }, null, 2));
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
