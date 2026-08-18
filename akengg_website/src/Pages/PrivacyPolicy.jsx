import Seo from "../Components/Seo";
import { SITE } from "../config/site";

// NOTE: This is a generic starter privacy policy. Replace the copy below with
// text reviewed for your jurisdiction before relying on it.
const PrivacyPolicy = () => {
  return (
    <div className="bg-white">
      <Seo
        title="Privacy Policy"
        description={`How ${SITE.name} collects, uses and protects the information you share with us.`}
        path="/privacy-policy"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#234B97] mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: 14 June 2026</p>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            {SITE.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
            privacy. This policy explains what information we collect through
            this website and how we use it.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Information we collect
            </h2>
            <p>
              When you submit an enquiry or subscribe to updates, we collect the
              details you provide — such as your name, phone number, email
              address and message. We may also collect basic, non-identifying
              usage data to improve the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              How we use your information
            </h2>
            <p>
              We use your information solely to respond to your enquiry, provide
              the services you request, and send updates you have opted into. We
              do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Data retention &amp; security
            </h2>
            <p>
              We retain enquiry data only as long as necessary to serve you and
              meet legal obligations, and we apply reasonable measures to protect
              it from unauthorised access.
            </p>
          </section>

          {/* Keep this in sync with src/utils/cookieConsent.js — if an
              analytics tag is ever added, the categories described here and the
              ones the banner asks about have to match. */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cookies</h2>
            <p>
              We use only the storage strictly necessary to make this website
              work, such as remembering your cookie choice itself. We do not
              currently run advertising or third-party tracking cookies.
            </p>
            <p className="mt-3">
              If we add analytics to understand how the site is used, it will
              only run after you accept it on the cookie banner. You can change
              your mind at any time using the{" "}
              <span className="font-medium">Cookie settings</span> link at the
              bottom of any page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact</h2>
            <p>
              For any privacy questions or to request deletion of your data,
              contact us at{" "}
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

export default PrivacyPolicy;
