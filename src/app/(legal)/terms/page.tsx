import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Terms of Service · SwipeJobs" };

// Starter terms for the Ferizaj pilot. Review with counsel before public launch.
export default async function TermsPage() {
  const locale = await getLocale();
  return locale === "sq" ? <Sq /> : <En />;
}

function En() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p>By creating an account you agree to these terms. If you do not agree, do not use SwipeJobs.</p>

      <h2>The service</h2>
      <p>
        SwipeJobs is a platform that helps hourly and shift workers and local businesses in Ferizaj
        find each other. We facilitate introductions and chat; we are not a party to any employment
        arrangement and do not guarantee jobs, hires, or the conduct of other users.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must provide accurate information and be legally able to work or hire.</li>
        <li>Keep your credentials secure; you are responsible for activity on your account.</li>
        <li>One account per person or business.</li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>No harassment, hate speech, spam, scams, or impersonation.</li>
        <li>No fake listings or profiles; no discrimination prohibited by law.</li>
        <li>No scraping, automated access, or misuse of other users&apos; contact details.</li>
        <li>Use another party&apos;s revealed contact details only to arrange the specific role.</li>
      </ul>

      <h2>Moderation</h2>
      <p>
        Photos are reviewed before they appear. We may remove content and suspend or delete accounts
        that violate these terms. You can report users, listings, or messages in the app.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided &quot;as is&quot; for the pilot. To the extent permitted by law, we are not
        liable for interactions or agreements between users. You use the service at your own risk.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the Republic of Kosovo.</p>
    </>
  );
}

function Sq() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Kushtet e Shërbimit</h1>
      <p>Duke krijuar një llogari, ti pranon këto kushte. Nëse nuk pajtohesh, mos e përdor SwipeJobs.</p>

      <h2>Shërbimi</h2>
      <p>
        SwipeJobs është një platformë që ndihmon punëtorët me orar dhe bizneset lokale në Ferizaj të
        gjejnë njëri-tjetrin. Ne lehtësojmë njohjet dhe bisedën; nuk jemi palë në asnjë marrëveshje
        punësimi dhe nuk garantojmë vende pune, punësime ose sjelljen e përdoruesve të tjerë.
      </p>

      <h2>Llogaria jote</h2>
      <ul>
        <li>Duhet të japësh informacion të saktë dhe të kesh të drejtën ligjore për të punuar ose punësuar.</li>
        <li>Ruaji të dhënat e hyrjes të sigurta; je përgjegjës për aktivitetin në llogarinë tënde.</li>
        <li>Një llogari për person ose biznes.</li>
      </ul>

      <h2>Përdorimi i pranueshëm</h2>
      <ul>
        <li>Pa ngacmim, gjuhë urrejtjeje, spam, mashtrime ose imitim identiteti.</li>
        <li>Pa shpallje ose profile të rreme; pa diskriminim të ndaluar me ligj.</li>
        <li>Pa scraping, qasje të automatizuar ose keqpërdorim të të dhënave të kontaktit të të tjerëve.</li>
        <li>Përdor të dhënat e kontaktit të shfaqura të një pale vetëm për të organizuar pozitën përkatëse.</li>
      </ul>

      <h2>Moderimi</h2>
      <p>
        Fotot shqyrtohen para se të shfaqen. Mund të heqim përmbajtje dhe të pezullojmë ose fshijmë
        llogari që shkelin këto kushte. Mund të raportosh përdorues, shpallje ose mesazhe në aplikacion.
      </p>

      <h2>Përgjegjësia</h2>
      <p>
        Shërbimi ofrohet &quot;siç është&quot; për fazën pilot. Në masën e lejuar me ligj, ne nuk jemi
        përgjegjës për ndërveprimet ose marrëveshjet mes përdoruesve. E përdor shërbimin me përgjegjësinë tënde.
      </p>

      <h2>Ligji në fuqi</h2>
      <p>Këto kushte rregullohen nga ligjet e Republikës së Kosovës.</p>
    </>
  );
}
