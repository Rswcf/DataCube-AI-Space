import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Legal notice / Impressum for DataCube AI Space',
  robots: { index: false, follow: true },
}

export default function ImpressumPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Impressum / Legal Notice</h1>
        <p className="mt-2 text-sm text-gray-600">
          <a href="/" className="underline hover:no-underline">
            &larr; Zur Startseite / Back to Home
          </a>
        </p>
      </header>

      {/* German Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Impressum (Deutsch)</h2>
        <p className="text-sm text-gray-600 mb-4">Angaben gemäß DDG §5 und MStV §18</p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Betreiber der Website</h3>
            <p className="leading-relaxed">
              [Name des Betreibers]<br />
              [Straße und Hausnummer]<br />
              [PLZ Ort]<br />
              Deutschland
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Kontakt</h3>
            <p className="leading-relaxed">
              E-Mail: [E-Mail-Adresse]<br />
              Telefon: [Telefonnummer]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Verantwortlich für den Inhalt nach MStV §18 Abs. 2
            </h3>
            <p className="leading-relaxed">
              [Name der verantwortlichen Person]<br />
              [Straße und Hausnummer]<br />
              [PLZ Ort]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Umsatzsteuer-Identifikationsnummer</h3>
            <p className="leading-relaxed">
              USt-IdNr. gemäß §27a Umsatzsteuergesetz: [USt-IdNr.]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Haftungsausschluss</h3>
            <h4 className="font-semibold mt-3 mb-1">Haftung für Inhalte</h4>
            <p className="leading-relaxed text-sm">
              Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die
              Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
              Gewähr übernehmen. Als Diensteanbieter sind wir gemäß DDG §7 Abs. 1 für eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach DDG
              §§8 bis 10 sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
              oder gespeicherte fremde Informationen zu überwachen.
            </p>
            <h4 className="font-semibold mt-3 mb-1">Haftung für Links</h4>
            <p className="leading-relaxed text-sm">
              Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der
              jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Eine permanente
              inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer
              Rechtsverletzung nicht zumutbar.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Urheberrecht</h3>
            <p className="leading-relaxed text-sm">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>
        </div>
      </section>

      {/* English Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Legal Notice (English)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Information pursuant to DDG §5 and MStV §18 (German Digital Services Act and Interstate Media Treaty)
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Site Operator</h3>
            <p className="leading-relaxed">
              [Operator Name]<br />
              [Street and Number]<br />
              [Postal Code City]<br />
              Germany
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Contact</h3>
            <p className="leading-relaxed">
              Email: [Email Address]<br />
              Phone: [Phone Number]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Responsible for Content (MStV §18 Para. 2)
            </h3>
            <p className="leading-relaxed">
              [Name of Responsible Person]<br />
              [Street and Number]<br />
              [Postal Code City]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">VAT Identification Number</h3>
            <p className="leading-relaxed">
              VAT ID pursuant to §27a of the German VAT Act: [VAT ID No.]
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Disclaimer</h3>
            <h4 className="font-semibold mt-3 mb-1">Liability for Content</h4>
            <p className="leading-relaxed text-sm">
              The contents of this website have been created with the utmost care. However, we
              cannot guarantee the accuracy, completeness, or timeliness of the content. As a
              service provider, we are responsible for our own content on these pages in
              accordance with DDG §7 Para. 1. However, pursuant to DDG §§8-10, we are not
              obligated to monitor transmitted or stored third-party information.
            </p>
            <h4 className="font-semibold mt-3 mb-1">Liability for Links</h4>
            <p className="leading-relaxed text-sm">
              This website contains links to external third-party websites over whose content we
              have no influence. The respective provider or operator of the linked pages is
              always responsible for their content. Permanent monitoring of linked pages for
              potential legal violations is not reasonable without concrete evidence of
              infringement.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Copyright</h3>
            <p className="leading-relaxed text-sm">
              The content and works created by the site operators on these pages are subject to
              German copyright law. Reproduction, editing, distribution, and any form of
              utilization beyond the limits of copyright law require the written consent of the
              respective author or creator.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-12 border-t border-gray-200 pt-6">
        <div className="flex gap-4 text-sm">
          <a href="/" className="underline hover:no-underline">Startseite / Home</a>
          <span className="text-gray-400">|</span>
          <a href="/datenschutz" className="underline hover:no-underline">Datenschutz / Privacy</a>
        </div>
      </footer>
    </article>
  )
}
