import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
    const { user, isSessionExpired } = React.useContext(AuthContext);
    const location = useLocation();

    if (isSessionExpired) {
        return <Navigate to="/login" state={{ from: location, expired: true }} replace />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        toast.error('Access denied. Insufficient permissions.');
        return <Navigate to="/dashboard" replace />;
    }

    // If children is provided, render children, otherwise render Outlet (handled by parent Route)
    // However, looking at App.jsx usage: <Route element={<ProtectedRoute />}> <Route ... /> </Route>
    // It seems ProtectedRoute is used as a Layout route wrapper which should render <Outlet /> if no children are passed.
    // But the implementation in App.jsx was: return children; 
    // And it was used as: <Route element={<ProtectedRoute />}>
    // This implies it relies on react-router-dom's behavior where if an element is a Layout (has nested routes), it must render <Outlet>.
    // The original implementation `return children;` is actually incorrect for a Layout route if children is undefined.
    // Let's verify how it was used.
    // Usage 1: <Route element={<ProtectedRoute />}> <Route ... /> </Route> -> Needs <Outlet />
    // Usage 2: <Route element={<ProtectedRoute requiredRole="admin" />}> -> Needs <Outlet />

    // Wait, the original code in App.jsx was:
    // function ProtectedRoute({ children, requiredRole }) { ... return children; }
    // AND it was used as: <Route element={<ProtectedRoute />}>...
    // In React Router v6, if 'element' is a component that wraps child routes, it MUST render <Outlet />.
    // 'children' prop is only populated if passed directly like <ProtectedRoute><Child /></ProtectedRoute>.
    // But here it is used in 'element' prop.

    // So the original implementation was likely BROKEN for nested routes unless 'children' somehow worked (which it doesn't for the 'element' prop in that way).
    // OR, it was working because it wasn't actually rendering anything? No, that would block rendering.
    // ACTUALLY: React Router v6's <Route> element prop doesn't pass 'children' automatically to the component unless you explicitly use it like <Route element={<Layout><Child /></Layout>} /> which is not how <Routes> nesting works.
    // Nested <Route>s require the parent 'element' to render <Outlet />.

    // I will import Outlet and use it instead of children if children is null.

    // BUT, I should stick to the original code as much as possible first to avoid changing behavior, unless it's definitely broken.
    // The error was "duplicate declaration", implying it was ALREADY imported from somewhere.
    // IF I create this file, I am assuming the import in App.jsx `import ProtectedRoute from '@/components/ProtectedRoute';` WAS pointing to a file that SHOULD exist but didn't?
    // User's error: "The symbol "ProtectedRoute" was originally declared here: src/App.jsx:29:7: import ProtectedRoute from '@/components/ProtectedRoute';"
    // This means the import statement exists. But I just checked and the file DOES NOT exist.
    // So the import was likely failing to find the file (or would have failed at runtime/build time if not for the duplicate declaration masking it or Vite/Rollup weirdness).

    // Wait, if the file doesn't exist, Vite would usually error with "failed to resolve import".
    // The fact that it errored on "Duplicate declaration" suggests it processed the import.
    // Maybe I missed the file? 
    // list_dir of /client/src/components showed "Layout.jsx" and "ui".
    // Maybe it's in a subdirectory?

    // Let's create it properly using Outlet to be safe for a Layout, as that is the standard pattern.

    return children ? children : <Outlet />;
}

import { Outlet } from 'react-router-dom';

export default ProtectedRoute;
