import { BotMessageSquare } from "lucide-react";

const AuthShell = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen w-full flex bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-hidden rounded-none border-0 bg-white shadow-none lg:max-h-screen lg:flex-row lg:rounded-3xl lg:border lg:border-slate-200 lg:shadow-xl dark:bg-slate-900 dark:lg:border-slate-800">
        <aside className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 px-6 py-6 text-white sm:h-44 lg:h-auto lg:w-1/2 lg:px-10 lg:py-10">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-20 -left-16 h-60 w-60 rounded-full bg-black/15 blur-2xl" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:mb-6 sm:h-14 sm:w-14 lg:mb-8 lg:h-16 lg:w-16 lg:rounded-2xl">
              <BotMessageSquare size={30} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">ChatSphere AI</h2>
            <p className="mt-2 max-w-xs text-xs text-cyan-50 sm:text-sm">
              AI-powered smart chat experience
            </p>

            <div className="mt-auto hidden rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur lg:block">
              <p className="text-sm font-medium">Real-time messaging + AI assistant</p>
              <p className="mt-1 text-xs text-cyan-50/90">
                Connect with people, groups, and AI in one workspace.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex w-full flex-1 items-center justify-center overflow-y-auto px-4 py-5 sm:px-6 sm:py-8 lg:max-h-screen lg:w-1/2 lg:px-10 lg:py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg transition-all duration-300 sm:p-6 lg:p-10 dark:border-slate-700 dark:bg-slate-900">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;
