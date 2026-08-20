import { useEffect, useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/ui/Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users/Users";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import { Toaster } from "react-hot-toast";
import AddUser from "./pages/Users/AddUser";
import EditUser from "./pages/Users/EditUsers";
import ContactLeads from "./pages/Contact/ContactLeads";
import EditContact from "./pages/Contact/EditContact";
import ForgotPassword from "./pages/ForgotPassword";
import BlogsList from "./pages/Blogs/BlogsList";
import AddBlog from "./pages/Blogs/AddBlog";
import UpdateBlog from "./pages/Blogs/UpdateBlog";
import ServicesList from "./pages/Services/ServicesList";
import ServiceForm from "./pages/Services/ServiceForm";
import ProjectsList from "./pages/Projects/ProjectsList";
import ProjectForm from "./pages/Projects/ProjectForm";
import IndustriesList from "./pages/Industries/IndustriesList";
import IndustryForm from "./pages/Industries/IndustryForm";
import IndustryStatsList from "./pages/IndustryStats/IndustryStatsList";
import IndustryStatForm from "./pages/IndustryStats/IndustryStatForm";
import TestimonialsList from "./pages/Testimonials/TestimonialsList";
import TestimonialForm from "./pages/Testimonials/TestimonialForm";
import TeamList from "./pages/Team/TeamList";
import TeamForm from "./pages/Team/TeamForm";
import NewsletterList from "./pages/Newsletter/NewsletterList";
import SettingsPage from "./pages/Settings/SettingsPage";
import SellerProfilePage from "./pages/SellerProfile/SellerProfilePage";
import PartiesList from "./pages/Parties/PartiesList";
import PartyForm from "./pages/Parties/PartyForm";
import CatalogList from "./pages/Catalog/CatalogList";
import CatalogForm from "./pages/Catalog/CatalogForm";
import DocumentsList from "./pages/Documents/DocumentsList";
import DocumentBuilder from "./pages/Documents/DocumentBuilder";
import LeadsList from "./pages/Leads/LeadsList";
import LeadDetail from "./pages/Leads/LeadDetail";
import FollowupsPage from "./pages/Followups/FollowupsPage";
import LeadReports from "./pages/Reports/LeadReports";

function App() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      {!isLoggedIn ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <div className="min-h-screen bg-gray-100 lg:flex">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-3 py-3 shadow-sm lg:hidden">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="rounded-md p-2 text-gray-700 transition hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="text-lg font-semibold text-gray-900">
                A K Engg Admin Panel
              </div>
              <div className="w-10" aria-hidden="true" />
            </header>

            <main className="flex-1 p-3 sm:p-4 lg:p-6">
              <Routes>
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <PrivateRoute>
                      <Users />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/add-users"
                  element={
                    <PrivateRoute>
                      <AddUser />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/edit-users/:id"
                  element={
                    <PrivateRoute>
                      <EditUser />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/contact-leads"
                  element={
                    <PrivateRoute>
                      <ContactLeads />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/edit-contact/:id"
                  element={
                    <PrivateRoute>
                      <EditContact />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/blogs"
                  element={
                    <PrivateRoute>
                      <BlogsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/add-blog"
                  element={
                    <PrivateRoute>
                      <AddBlog />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/edit-blog/:id"
                  element={
                    <PrivateRoute>
                      <UpdateBlog />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <PrivateRoute>
                      <ServicesList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/services/add"
                  element={
                    <PrivateRoute>
                      <ServiceForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/services/edit/:id"
                  element={
                    <PrivateRoute>
                      <ServiceForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <PrivateRoute>
                      <ProjectsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/projects/add"
                  element={
                    <PrivateRoute>
                      <ProjectForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/projects/edit/:id"
                  element={
                    <PrivateRoute>
                      <ProjectForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industries"
                  element={
                    <PrivateRoute>
                      <IndustriesList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industries/add"
                  element={
                    <PrivateRoute>
                      <IndustryForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industries/edit/:id"
                  element={
                    <PrivateRoute>
                      <IndustryForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industry-stats"
                  element={
                    <PrivateRoute>
                      <IndustryStatsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industry-stats/add"
                  element={
                    <PrivateRoute>
                      <IndustryStatForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/industry-stats/edit/:id"
                  element={
                    <PrivateRoute>
                      <IndustryStatForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/testimonials"
                  element={
                    <PrivateRoute>
                      <TestimonialsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/testimonials/add"
                  element={
                    <PrivateRoute>
                      <TestimonialForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/testimonials/edit/:id"
                  element={
                    <PrivateRoute>
                      <TestimonialForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <PrivateRoute>
                      <TeamList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/team/add"
                  element={
                    <PrivateRoute>
                      <TeamForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/team/edit/:id"
                  element={
                    <PrivateRoute>
                      <TeamForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/newsletter"
                  element={
                    <PrivateRoute>
                      <NewsletterList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PrivateRoute>
                      <SettingsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/seller-profile"
                  element={
                    <PrivateRoute>
                      <SellerProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/parties"
                  element={
                    <PrivateRoute>
                      <PartiesList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/parties/add"
                  element={
                    <PrivateRoute>
                      <PartyForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/parties/edit/:id"
                  element={
                    <PrivateRoute>
                      <PartyForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/catalog"
                  element={
                    <PrivateRoute>
                      <CatalogList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/catalog/add"
                  element={
                    <PrivateRoute>
                      <CatalogForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/catalog/edit/:id"
                  element={
                    <PrivateRoute>
                      <CatalogForm />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <PrivateRoute>
                      <DocumentsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/documents/:type/new"
                  element={
                    <PrivateRoute>
                      <DocumentBuilder />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/documents/:type/edit/:id"
                  element={
                    <PrivateRoute>
                      <DocumentBuilder />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <PrivateRoute>
                      <LeadsList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/leads/:id"
                  element={
                    <PrivateRoute>
                      <LeadDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/followups"
                  element={
                    <PrivateRoute>
                      <FollowupsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reports/leads"
                  element={
                    <PrivateRoute>
                      <LeadReports />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
