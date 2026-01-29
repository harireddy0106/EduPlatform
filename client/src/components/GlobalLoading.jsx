import React from 'react';
import { Loader2 } from 'lucide-react';

const GlobalLoading = () => {
    return (
        <div className="flex items-center justify-center h-screen w-screen bg-gray-50 fixed top-0 left-0 z-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Loading application...</p>
            </div>
        </div>
    );
};

export default GlobalLoading;
