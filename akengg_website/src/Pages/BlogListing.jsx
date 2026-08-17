import React, { useState, useEffect } from "react";
import { FaComment, FaHeart } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getBlogs } from "../api/api";
import Seo from "../Components/Seo";

const FALLBACK_POSTS = [
  {
    id: 1,
    image: "/assets/Blog1.jpg",
    title: "Choosing the Right Industrial Boiler for Your Business",
    author: "A K Engineering",
    date: "13th Dec",
    likes: 15,
    comments: 4,
    description:
      "Selecting the right industrial boiler is crucial for efficiency, safety, and long-term cost savings. From IBR to non-IBR systems, understanding capacity, fuel type, and operational requirements helps industries achieve optimal performance and reliability.",
  },
  {
    id: 2,
    image: "/assets/Blog2.jpg", // replace with your image
    title: "Industrial Chimneys: Ensuring Safe Emission Control",
    author: "A K Engineering",
    date: "13th Dec",
    likes: 15,
    comments: 4,
    description:
      "Industrial chimneys play a critical role in safely releasing gases and maintaining environmental compliance. Proper design, height, and material selection ensure efficient draft, reduced pollution, and safe plant operations.",
  },
  {
    id: 3,
    image: "/assets/Blog3.jpg", // replace with your image
    title: "Why Quality Fabrication Matters in Industrial Projects",
    author: "A K Engineering",
    date: "22nd Dec",
    likes: 18,
    comments: 5,
    description:
      "High-quality fabrication ensures structural integrity and operational efficiency in industrial setups. From precise welding to material selection, every step impacts the durability and performance of fabricated components.",
  },
];
const BlogListing = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState(FALLBACK_POSTS);

  useEffect(() => {
    getBlogs({ limit: 50 })
      .then((res) => {
        const blogs = res?.blogs;
        if (Array.isArray(blogs) && blogs.length) {
          setPosts(
            blogs.map((b) => ({
              id: b.id,
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
              likes: 0,
              comments: 0,
              description: b.descrip,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const postsPerPage = 12;

  const totalPages = Math.ceil(posts.length / postsPerPage);

  const startIndex = (currentPage - 1) * postsPerPage;
  const currentPosts = posts.slice(startIndex, startIndex + postsPerPage);
  return (
    <div>
      <Seo
        title="Blog"
        description="Insights and updates from A K Engineering on industrial boilers, fabrication, water treatment and pollution control."
        path="/blogs"
      />
      <section className="relative h-[200px] md:h-[300px] flex items-center text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/AboutBanner.jpg')" }} // replace with your image
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">
            Our Blogs
          </h1>
        </div>
      </section>
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
            {currentPosts.map((post) => (
              <div
                key={post.id}
                className="group bg-[#252932] border border-gray-700 overflow-hidden hover:border-[#F4C542] transition duration-300"
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
                  <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
                    <span>{post.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FaHeart className="text-[#F4C542]" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaComment className="text-[#F4C542]" /> {post.comments}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-3 leading-snug group-hover:text-[#F4C542] transition cursor-pointer">
                    {post.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {post.description}
                  </p>

                  {/* Read More */}
                  <Link to={`/blogs/${post.id}`}>
                    <span className="text-[#F4C542] text-sm font-medium hover:underline">
                      Read More →
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex justify-center items-center mt-16 gap-2 flex-wrap">
            {/* Prev Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:border-[#F4C542] hover:text-[#F4C542] transition"
            >
              Prev
            </button>

            {/* Page Numbers */}
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 text-sm border transition ${
                    currentPage === page
                      ? "bg-[#F4C542] text-[#1c1f26] border-[#F4C542]"
                      : "border-gray-600 text-gray-300 hover:border-[#F4C542] hover:text-[#F4C542]"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:border-[#F4C542] hover:text-[#F4C542] transition"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogListing;
