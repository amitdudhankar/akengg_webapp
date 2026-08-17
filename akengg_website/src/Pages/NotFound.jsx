import { Link } from "react-router-dom";
import Seo from "../Components/Seo";

const NotFound = () => {
  return (
    <div className="bg-white">
      <Seo
        title="Page Not Found"
        description="The page you are looking for could not be found."
        path="/404"
        noindex
      />
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-[#F4C542] text-6xl font-extrabold">404</p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-[#234B97]">
          Page not found
        </h1>
        <p className="mt-3 text-gray-600">
          Sorry, the page you&rsquo;re looking for doesn&rsquo;t exist or has
          been moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-lg bg-[#234B97] px-6 py-3 text-white font-medium transition hover:bg-[#1c3c79]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
