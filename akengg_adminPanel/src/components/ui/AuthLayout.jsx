// Shell for the two unauthenticated pages (login, forgot password). Keeps them
// visually consistent with the rest of the admin: same card language, same
// control styling, just centred on the viewport instead of inside the sidebar.
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src="/assets/LogoRemoveBG.png" alt="A K Engineering" className="h-16" />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>

          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthLayout;
