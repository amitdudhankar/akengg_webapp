import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBlog } from "../api/api";
import Seo from "../Components/Seo";
import JsonLd from "../Components/JsonLd";
import { toSafeHtml, toExcerpt } from "../utils/blogContent";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

// Fallback post used when the fetch fails or returns null (preserves the
// original hardcoded content so the page never renders blank).
const FALLBACK_POSTS = [
  {
    id: "1",
    slug: "choosing-the-right-industrial-boiler-for-your-business",
    title: "Choosing the Right Industrial Boiler for Your Business",
    image: "/assets/Blog1.jpg",
    date: "13th Dec",
    content: `
Selecting the right industrial boiler is crucial for ensuring efficiency, safety, and long-term operational success.

Industries must consider factors such as steam capacity, fuel type, pressure requirements, and compliance with IBR regulations. A properly selected boiler improves productivity, reduces downtime, and optimizes fuel consumption.

At A K Engineering, we provide both IBR and Non-IBR boiler systems tailored to your industrial needs. Our solutions are designed for durability, efficiency, and compliance with safety standards.

Investing in the right boiler is not just a purchase — it’s a long-term operational decision that impacts your entire production system.
      `,
  },
];

const BlogDetail = () => {
  // Route param is the slug; the API also resolves legacy numeric ids so
  // old /blogs/12 links (bookmarks, search results) still load.
  const { slug } = useParams();
  const navigate = useNavigate();

  const matchesFallback = (p) => p.slug === slug || p.id === slug;
  const fallbackPost = FALLBACK_POSTS.find(matchesFallback) || null;

  const [post, setPost] = useState(fallbackPost);

  useEffect(() => {
    setPost(FALLBACK_POSTS.find(matchesFallback) || null);
    getBlog(slug)
      .then((d) => {
        if (d) {
          // Reached via a legacy id URL — swap in the canonical slug URL.
          if (d.slug && d.slug !== slug) {
            navigate(`/blogs/${d.slug}`, { replace: true });
            return;
          }
          setPost({
            id: d.id,
            slug: d.slug,
            title: d.title,
            image: d.image,
            date: d.created_at
              ? new Date(d.created_at).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "",
            content: d.content || d.descrip || "",
            // Plain-text summary — a better meta description than the article
            // body, which is HTML.
            descrip: d.descrip || "",
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!post) {
    return (
      <section className="min-h-[80vh] flex items-center justify-center bg-[#1c1f26] text-white px-4">
        <div className="text-center max-w-xl">
          {/* Image */}
          <img
            src="/assets/404.jpg" // add your custom image here
            alt="Blog Not Found"
            className="w-64 sm:w-80 mx-auto mb-8 opacity-90"
          />

          {/* Accent Line */}
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6"></div>

          {/* Heading */}
          <h1 className="text-[28px] sm:text-[36px] font-semibold mb-4">
            Blog Not Found
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed">
            The article you are looking for might have been removed, renamed, or
            is temporarily unavailable.
          </p>

          {/* CTA */}
          <Link
            to="/blogs"
            className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-3 text-sm font-semibold hover:bg-[#e0b837] transition"
          >
            BACK TO BLOGS
          </Link>
        </div>
      </section>
    );
  }

  // Per-post meta description — avoids every blog sharing the generic site
  // description. Prefer the plain-text summary; fall back to the article body
  // with its markup stripped (raw tags must never reach a meta tag).
  const excerpt = toExcerpt(post.descrip) || toExcerpt(post.content);

  // Sanitized HTML for the article body (see utils/blogContent.js).
  const contentHtml = toSafeHtml(post.content);

  return (
    <section className="bg-[#1c1f26] text-white py-16">
      <Seo
        title={post?.title}
        description={excerpt}
        path={`/blogs/${post?.slug || slug}`}
        type="article"
        image={post?.image}
      />
      {post && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            image: post.image,
            description: excerpt,
            mainEntityOfPage: `https://www.akengg.in/blogs/${post?.slug || slug}`,
          }}
        />
      )}
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link
          to="/blogs"
          className="text-[#F4C542] text-sm mb-6 inline-block hover:underline"
        >
          ← Back to Blogs
        </Link>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-semibold leading-tight mb-6">
          {post.title}
        </h1>

        {/* Meta */}
        <p className="text-gray-400 text-sm mb-6">
          Published on {post.date} • A K Engineering
        </p>

        {/* Featured Image */}
        <div className="overflow-hidden mb-8">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-[300px] md:h-[400px] object-cover"
          />
        </div>

        {/* Content — rich HTML from the admin editor, sanitized before it is
            injected. Styling lives in the .blog-content rules in index.css. */}
        <div
          className="blog-content text-[15px] sm:text-[16px]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* CTA */}
        <div className="mt-12 border-t border-gray-700 pt-8 text-center">
          <p className="text-gray-400 mb-4">
            Need help with industrial solutions?
          </p>
          <RequestQuoteCta
            className="bg-[#F4C542] text-[#1c1f26] px-8 py-3 text-sm font-semibold hover:bg-[#e0b837] transition"
            onClick={() =>
              trackEvent("quote_request_started", { context: "blog_detail" })
            }
          >
            REQUEST A QUOTE
          </RequestQuoteCta>
        </div>
      </div>
    </section>
  );
};

export default BlogDetail;
