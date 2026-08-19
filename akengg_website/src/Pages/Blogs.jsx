import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBlogs } from "../api/api";

// Fallback shown until the API responds (or if it is unreachable).
const FALLBACK_POSTS = [
  {
    id: 1,
    image: "/assets/Blog1.jpg",
    title: "Choosing the Right Industrial Boiler for Your Business",
    author: "A K Engineering",
    date: "13th Dec",
    description:
      "Selecting the right industrial boiler is crucial for efficiency, safety, and long-term cost savings. From IBR to non-IBR systems, understanding capacity, fuel type, and operational requirements helps industries achieve optimal performance and reliability.",
  },
  {
    id: 2,
    image: "/assets/Blog2.jpg", // replace with your image
    title: "Industrial Chimneys: Ensuring Safe Emission Control",
    author: "A K Engineering",
    date: "13th Dec",
    description:
      "Industrial chimneys play a critical role in safely releasing gases and maintaining environmental compliance. Proper design, height, and material selection ensure efficient draft, reduced pollution, and safe plant operations.",
  },
  {
    id: 3,
    image: "/assets/Blog3.jpg", // replace with your image
    title: "Why Quality Fabrication Matters in Industrial Projects",
    author: "A K Engineering",
    date: "22nd Dec",
    description:
      "High-quality fabrication ensures structural integrity and operational efficiency in industrial setups. From precise welding to material selection, every step impacts the durability and performance of fabricated components.",
  },
];

export default function Blogs() {
  const [posts, setPosts] = useState(FALLBACK_POSTS);

  useEffect(() => {
    // Latest three real posts; linked by slug (see BlogListing for the same
    // pattern on the full listing page).
    getBlogs({ limit: 3 })
      .then((res) => {
        const blogs = res?.blogs;
        if (Array.isArray(blogs) && blogs.length) {
          setPosts(
            blogs.map((b) => ({
              id: b.id,
              slug: b.slug,
              image: b.image,
              title: b.title,
              author: "A K Engineering",
              date: b.created_at
                ? new Date(b.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "",
              description: b.descrip,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-20 bg-[#1c1f26] text-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-[32px] sm:text-[40px] md:text-[50px] font-semibold">
            Latest Insights & Articles
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-sm sm:text-base">
            Stay updated with industrial trends, engineering insights, and
            innovations in boiler systems and fabrication.
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {posts.map((post) => (
            // The whole card is the link — clicking the image, title or body
            // navigates, not just "Read More".
            <Link
              key={post.id}
              to={`/blogs/${post.slug || post.id}`}
              className="group block bg-[#252932] border border-gray-700 overflow-hidden hover:border-[#F4C542] transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C542]"
            >
              {/* Image */}
              <div className="overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-56 object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Meta */}
                <div className="flex items-center text-gray-400 text-xs mb-3">
                  <span>{post.date}</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-3 leading-snug group-hover:text-[#F4C542] transition">
                  {post.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed">
                  {post.description}
                </p>

                {/* Affordance only — the card itself is the link, so this must
                    not be a nested <Link>. */}
                <span className="mt-4 inline-block text-[#F4C542] text-sm font-medium group-hover:underline">
                  Read More →
                </span>
              </div>
            </Link>
          ))}
        </div>
        {/* View All Button */}
        <div className="flex justify-center mt-12">
          <a
            href="/blogs"
            className="bg-[#F4C542] text-[#1c1f26] px-10 py-3 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
          >
            VIEW ALL BLOGS
          </a>
        </div>
      </div>
    </section>
  );
}
