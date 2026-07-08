import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Privacy Policy · SwipeJobs" };

// Starter privacy policy for the Ferizaj pilot (Kosovo LPPD / GDPR-aligned). Review
// with counsel before public launch. Bilingual; content chosen by cookie locale.
export default async function PrivacyPage() {
  const locale = await getLocale();
  return locale === "sq" ? <Sq /> : <En />;
}

function En() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p>
        SwipeJobs connects hourly and shift workers with local businesses in Ferizaj, Kosovo. This
        policy explains what we collect, why, and your rights under the Law on Protection of Personal
        Data (LPPD) and equivalent standards.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account: email, role (worker or business), city, and password (stored hashed).</li>
        <li>Profile: first and last name, a short bio or business description, categories, languages,
          availability, an optional phone number, and an optional photo you upload.</li>
        <li>Activity: the listings and candidates you swipe, matches, and chat messages.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run the matching service: showing relevant listings, letting employers review
        interested workers, creating matches, and enabling chat. We do not sell your data.
      </p>

      <h2>What others can see (the golden rule)</h2>
      <p>
        Before a match, other users never see your surname, phone, or email — only your first name
        and last initial. Contact details are revealed only after you and the other party match.
        Uploaded photos are reviewed before they appear, and location metadata (EXIF/GPS) is stripped.
      </p>

      <h2>Retention &amp; deletion</h2>
      <p>
        We keep your data while your account is active. You can permanently delete your account and
        all associated data at any time from your profile — this erases your profile, matches,
        messages, and photos. You may also request access to your data by contacting us.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Access is restricted by row-level security so you
        only ever reach your own data and the conversations you are part of.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or data requests: <a className="text-primary hover:underline" href="mailto:privacy@swipejobs.example">privacy@swipejobs.example</a>.
      </p>
    </>
  );
}

function Sq() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Politika e Privatësisë</h1>
      <p>
        SwipeJobs i lidh punëtorët me orar me bizneset lokale në Ferizaj, Kosovë. Kjo politikë
        shpjegon çfarë mbledhim, pse, dhe të drejtat e tua sipas Ligjit për Mbrojtjen e të Dhënave
        Personale (LMDHP) dhe standardeve ekuivalente.
      </p>

      <h2>Çfarë mbledhim</h2>
      <ul>
        <li>Llogaria: email, roli (punëtor ose biznes), qyteti dhe fjalëkalimi (i ruajtur i hash-uar).</li>
        <li>Profili: emri dhe mbiemri, një bio e shkurtër ose përshkrim biznesi, kategoritë, gjuhët,
          disponueshmëria, një numër telefoni opsional dhe një foto opsionale që ngarkon.</li>
        <li>Aktiviteti: shpalljet dhe kandidatët që rrëshqet, përputhjet dhe mesazhet e bisedës.</li>
      </ul>

      <h2>Si i përdorim</h2>
      <p>
        Vetëm për të ofruar shërbimin e përputhjes: shfaqjen e shpalljeve përkatëse, mundësinë e
        punëdhënësve për të shqyrtuar punëtorët e interesuar, krijimin e përputhjeve dhe bisedën.
        Ne nuk i shesim të dhënat e tua.
      </p>

      <h2>Çfarë shohin të tjerët (rregulli i artë)</h2>
      <p>
        Para një përputhjeje, përdoruesit e tjerë nuk e shohin kurrë mbiemrin, telefonin ose email-in
        tënd — vetëm emrin dhe shkronjën e parë të mbiemrit. Të dhënat e kontaktit shfaqen vetëm pasi
        ti dhe pala tjetër përputheni. Fotot shqyrtohen para se të shfaqen dhe metadata e vendndodhjes
        (EXIF/GPS) hiqet.
      </p>

      <h2>Ruajtja &amp; fshirja</h2>
      <p>
        I mbajmë të dhënat sa është aktive llogaria jote. Mund ta fshish përgjithmonë llogarinë dhe
        të gjitha të dhënat e lidhura në çdo kohë nga profili — kjo fshin profilin, përputhjet,
        mesazhet dhe fotot. Mund të kërkosh gjithashtu qasje në të dhënat e tua duke na kontaktuar.
      </p>

      <h2>Siguria</h2>
      <p>
        Të dhënat janë të enkriptuara në transit dhe në ruajtje. Qasja kufizohet me siguri në nivel
        rreshti, kështu që arrin vetëm te të dhënat e tua dhe bisedat ku je pjesë.
      </p>

      <h2>Kontakti</h2>
      <p>
        Pyetje ose kërkesa për të dhëna: <a className="text-primary hover:underline" href="mailto:privacy@swipejobs.example">privacy@swipejobs.example</a>.
      </p>
    </>
  );
}
