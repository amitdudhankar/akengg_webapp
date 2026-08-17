import Seo from "../Components/Seo";
import { SITE } from "../config/site";

// NOTE: Generic starter terms. Replace with text reviewed for your jurisdiction.
const Terms = () => {
  return (
    <div className="bg-white">
      <Seo
        title="Terms & Conditions"
        description={`The terms governing your use of the ${SITE.name} website and services.`}
        path="/terms"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#234B97] mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: 14 June 2026</p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            By accessing this website you agree to these terms. If you do not
            agree, please discontinue use of the site.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Use of the site
            </h2>
            <p>
              The content on this site is provided for general information about
              {` ${SITE.name}`} and its services. It may be updated at any time
              without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Intellectual property
            </h2>
            <p>
              All content, branding and images on this site are the property of
              {` ${SITE.name}`} unless otherwise stated, and may not be reused
              without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Enquiries &amp; quotations
            </h2>
            <p>
              Enquiries submitted through this site do not constitute a binding
              contract. Project scope, pricing and timelines are confirmed
              separately in writing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Limitation of liability
            </h2>
            <p>
              {SITE.name} is not liable for any indirect or consequential loss
              arising from use of this website or reliance on its content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              Questions about these terms? Email{" "}
              <a className="text-[#234B97] underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
