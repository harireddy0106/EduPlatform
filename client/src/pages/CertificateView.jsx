import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    Loader2,
    Download,
    Share2,
    CheckCircle,
    AlertCircle,
    Eye,
    FileDown,
    Award,
    ArrowLeft,
    Copy,
    Check
} from 'lucide-react';
import { toast } from 'sonner';

// Config
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CertificateView = () => {
    const { code } = useParams();

    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState('view'); // 'view' or 'download'
    const certificateRef = useRef(null);
    const exportRef = useRef(null);

    // Check if certificate exists in localStorage
    useEffect(() => {
        if (code) {
            const savedCertificate = localStorage.getItem(`certificate_${code}`);
            if (savedCertificate) {
                setCertificate(JSON.parse(savedCertificate));
                setLoading(false);
            } else {
                fetchCertificate();
            }
        }
    }, [code]);

    const fetchCertificate = async () => {
        try {
            const response = await axios.get(`${API}/certificates/${code}`);
            if (response.data.data) {
                const certData = response.data.data;
                setCertificate(certData);
                // Save to localStorage for offline access
                localStorage.setItem(`certificate_${code}`, JSON.stringify(certData));
            }
        } catch (err) {
            console.error("Certificate load error:", err);
            if (err.response?.status === 404) {
                setError("Certificate not found. It may have been removed or the link is incorrect.");
            } else {
                setError("Failed to load certificate. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };



    const handleDownloadPDF = async () => {
        if (!certificateRef.current) {
            toast.error("Certificate not ready for download");
            return;
        }

        setGeneratingPdf(true);
        setDownloading(true);

        try {
            const canvas = await html2canvas(exportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

            const fileName = `Certificate_${certificate.student_name}_${certificate.course_name}_${certificate.verification_code}.pdf`
                .replace(/\s+/g, '_')
                .replace(/[^\w\s]/gi, '');

            pdf.save(fileName);

            // Track download in localStorage
            const downloadHistory = JSON.parse(localStorage.getItem('certificate_downloads') || '[]');
            downloadHistory.push({
                certificate_id: certificate.id,
                code: certificate.verification_code,
                downloaded_at: new Date().toISOString(),
                file_name: fileName
            });
            localStorage.setItem('certificate_downloads', JSON.stringify(downloadHistory));

            toast.success("Certificate downloaded successfully!");
        } catch (err) {
            console.error("PDF Export Error:", err);
            toast.error("Failed to generate PDF");
        } finally {
            setGeneratingPdf(false);
            setDownloading(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!certificateRef.current) return;

        setDownloading(true);

        try {
            const canvas = await html2canvas(exportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            });

            const link = document.createElement('a');
            link.download = `Certificate_${certificate.student_name}_${certificate.verification_code}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast.success("Certificate image downloaded!");
        } catch (err) {
            console.error("Image download error:", err);
            toast.error("Failed to download image");
        } finally {
            setDownloading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                setCopied(true);
                toast.success("Certificate link copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error("Copy failed:", err);
                toast.error("Failed to copy link");
            });
    };



    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `My Certificate - ${certificate.course_name}`,
                    text: `I completed ${certificate.course_name} on EduPlatform!`,
                    url: window.location.href,
                });
                toast.success("Certificate shared!");
            } catch {
                console.log('Sharing cancelled or failed');
            }
        } else {
            handleCopyLink();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Certificate</h2>
                    <p className="text-gray-600">Verifying and loading your achievement...</p>
                </div>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Certificate Not Found</h1>
                    <p className="text-gray-600 mb-8">{error || "The certificate you're looking for doesn't exist or has been removed."}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/dashboard"
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go to Dashboard
                        </Link>
                        <Link
                            to="/courses"
                            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300"
                        >
                            Browse Courses
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <Award className="w-8 h-8 text-indigo-600" />
                            <h1 className="text-2xl font-bold text-gray-900">Certificate of Completion</h1>
                        </div>
                        <p className="text-gray-600">
                            This certificate verifies that <span className="font-semibold text-indigo-700">{certificate.student_name}</span> has successfully completed <span className="font-semibold">{certificate.course_name}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setViewMode('view')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'view' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Eye className="w-4 h-4" />
                            View
                        </button>
                        <button
                            onClick={() => setViewMode('download')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'download' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            <FileDown className="w-4 h-4" />
                            Download Options
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </Link>
                            <div className="hidden sm:block w-px h-6 bg-gray-200"></div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Verified Certificate</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                Share
                            </button>
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Download Options Panel */}
                {viewMode === 'download' && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Certificate</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-lg">
                                        <FileDown className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">High-Quality PDF</h4>
                                        <p className="text-gray-600 text-sm mb-4">Best for printing and professional use</p>
                                        <button
                                            onClick={handleDownloadPDF}
                                            disabled={generatingPdf}
                                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {generatingPdf ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Generating PDF...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Download PDF
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-5 hover:border-indigo-300 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <FileDown className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">PNG Image</h4>
                                        <p className="text-gray-600 text-sm mb-4">Quick download for sharing online</p>
                                        <button
                                            onClick={handleDownloadImage}
                                            disabled={downloading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {downloading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Downloading...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Download PNG
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Certificate Preview */}
                <div className={`${viewMode === 'download' ? 'hidden' : 'block'}`}>
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-3xl mx-auto">
                        {/* Certificate Container */}
                        <div
                            ref={certificateRef}
                            className="relative bg-gradient-to-b from-white to-gray-50 p-6 border-[8px] border-double border-indigo-900 w-full aspect-[1.414/1] flex flex-col items-center justify-between text-center select-none"
                            style={{ minHeight: '350px' }}
                        >
                            {/* Background Pattern */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                                <div className="transform -rotate-12 text-[6rem] font-black text-indigo-900 whitespace-nowrap">
                                    EDUPLATFORM
                                </div>
                            </div>

                            {/* Watermark */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[4rem] font-bold text-indigo-900">
                                    CERTIFIED
                                </div>
                            </div>

                            {/* Certificate Content */}
                            <div className="absolute top-3 right-3 z-20">
                                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full border border-green-200 shadow-sm print:shadow-none">
                                    <CheckCircle className="w-3 h-3" />
                                    <span className="font-bold tracking-wide text-[10px] uppercase">Verified</span>
                                </div>
                            </div>

                            <div className="w-full flex flex-col items-center z-10">
                                {/* Platform Logo & Name */}
                                <div className="mb-2">
                                    <div className="flex flex-col items-center justify-center mb-1">
                                        <div className="mb-0.5 relative drop-shadow-md">
                                            <img
                                                src={`data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M30 60 L20 95 L50 90 L80 95 L70 60 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="1" /><circle cx="50" cy="50" r="38" fill="#fcd34d" stroke="#b45309" stroke-width="2" /><circle cx="50" cy="50" r="32" fill="none" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2" /><defs><linearGradient id="medalGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef3c7" /><stop offset="50%" stop-color="#fcd34d" /><stop offset="100%" stop-color="#d97706" /></linearGradient></defs><circle cx="50" cy="50" r="28" fill="url(#medalGradient)" /></svg>')}`}
                                                width="40"
                                                height="40"
                                                alt="Award Ribbon"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h2 className="text-lg font-black text-indigo-950 tracking-tight leading-none mb-0">EduPlatform</h2>
                                            <p className="text-gray-600 font-light text-[9px]">Academy of Excellence</p>
                                        </div>
                                    </div>

                                    <div className="h-0.5 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-2"></div>

                                    <div className="uppercase tracking-[0.2em] text-indigo-700 text-[10px] font-semibold mb-0.5">
                                        Academic Excellence Award
                                    </div>

                                    <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-wider mb-0.5 uppercase font-serif">
                                        Certificate
                                    </h1>

                                    <div className="text-xs md:text-sm text-gray-500 font-light tracking-[0.3em] uppercase mb-2">
                                        of Completion
                                    </div>
                                </div>

                                {/* Student Info */}
                                <div className="w-full max-w-xl">
                                    <p className="text-gray-500 italic text-[11px] mb-1">
                                        This is to officially certify that
                                    </p>

                                    <h2 className="text-xl md:text-2xl font-bold text-indigo-900 mb-2 font-serif px-4">
                                        {certificate.student_name}
                                    </h2>

                                    <p className="text-gray-500 italic text-[11px] mb-1">
                                        has successfully met all the academic requirements for
                                    </p>

                                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 leading-tight px-6">
                                        "{certificate.course_name}"
                                    </h3>

                                    <p className="text-[10px] text-gray-500 font-medium mb-1 bg-gray-50 inline-block px-3 py-0.5 rounded-full border border-gray-100">
                                        Course Duration: {new Date(new Date(certificate.issued_at).setMonth(new Date(certificate.issued_at).getMonth() - 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {new Date(certificate.issued_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Section */}
                            <div className="w-full flex justify-between items-end mt-auto pt-3 border-t border-gray-100 relative z-10">
                                {/* Instructor Signature */}
                                <div className="flex flex-col items-start w-1/3">
                                    <div className="font-signature text-base text-indigo-800 mb-0" style={{ fontFamily: 'cursive' }}>
                                        {certificate.instructor_name}
                                    </div>
                                    <div className="h-px w-20 bg-gray-400 mb-0.5"></div>
                                    <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">Lead Instructor</p>
                                    <p className="text-[7px] text-indigo-900 mt-0 font-semibold">EduPlatform Academy</p>
                                </div>

                                {/* Certificate Verification (Center) */}
                                <div className="flex flex-col items-center w-1/3 px-2">
                                    <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Certificate Verification</p>
                                    <p className="font-mono text-[9px] font-bold text-indigo-700 select-all mb-0.5">{certificate.verification_code}</p>
                                    <p className="text-[7px] text-gray-400 break-all text-center leading-tight">
                                        Verify at: {window.location.origin}/certificate
                                    </p>
                                </div>

                                {/* Date & Seal Placeholder */}
                                <div className="flex flex-col items-end w-1/3">
                                    <div className="text-xs text-gray-800 mb-0.5 font-medium">
                                        {formatDate(certificate.issued_at)}
                                    </div>
                                    <div className="h-px w-20 bg-gray-400 mb-0.5"></div>
                                    <p className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">Date Issued</p>

                                    {/* Small verified badge text */}
                                    <div className="flex items-center gap-1 mt-0.5 text-green-700">
                                        <CheckCircle className="w-2 h-2" />
                                        <span className="text-[7px] font-bold uppercase tracking-wider">Officially Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Info */}
                <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Verification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Certificate ID</p>
                            <p className="font-mono font-semibold">{certificate.verification_code}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Issued On</p>
                            <p className="font-semibold">{formatDate(certificate.issued_at)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Verification URL</p>
                            <p className="text-sm truncate">{window.location.href}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* EXPORT-ONLY CERTIFICATE (Hidden from view, used for high-quality export) */}
            {/* Using fixed positioning at 0,0 with negative z-index is the most reliable way to ensure html2canvas captures full visibility without viewport clipping */}
            <div style={{ position: 'fixed', left: '0', top: '0', zIndex: -100, opacity: 0, pointerEvents: 'none' }}>
                <div
                    ref={exportRef}
                    style={{
                        width: '1123px',   // A4 landscape @ 96dpi
                        height: '794px',   // A4 landscape @ 96dpi
                        transform: 'scale(0.9)',  // Shrink content to fit
                        transformOrigin: 'top left'
                    }}
                    className="relative bg-white p-8 border-[14px] border-double border-indigo-900 flex flex-col items-center justify-between overflow-hidden box-border"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                        <div className="transform -rotate-12 text-[12rem] font-black text-indigo-900 whitespace-nowrap font-sans">
                            EDUPLATFORM
                        </div>
                    </div>

                    {/* Watermark */}
                    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
                        <div className="opacity-10 transform -rotate-12 text-[8rem] font-bold text-indigo-900">
                            CERTIFIED
                        </div>
                    </div>

                    {/* Verified Badge */}
                    <div className="absolute top-10 right-10 z-20">
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-full border border-green-200 shadow-sm">
                            <CheckCircle className="w-6 h-6" />
                            <span className="font-bold tracking-wide text-base uppercase font-sans">Verified</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col items-center mt-4 z-10 relative">
                        {/* Badge Image Data URI */}
                        <div className="mb-4">
                            <img
                                src={`data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M30 60 L20 95 L50 90 L80 95 L70 60 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="1" /><circle cx="50" cy="50" r="38" fill="#fcd34d" stroke="#b45309" stroke-width="2" /><circle cx="50" cy="50" r="32" fill="none" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2" /><defs><linearGradient id="medalGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fef3c7" /><stop offset="50%" stop-color="#fcd34d" /><stop offset="100%" stop-color="#d97706" /></linearGradient></defs><circle cx="50" cy="50" r="28" fill="url(#medalGradient)" /></svg>')}`}
                                width="100"
                                height="100"
                                alt="Award Ribbon"
                            />
                        </div>

                        <h2 className="text-xl font-black text-indigo-900 tracking-tight mb-2 font-sans text-center">EduPlatform</h2>
                        <p className="text-gray-600 font-sans text-[9px] mb-6 text-center">Academy of Excellence</p>

                        <div className="h-1 w-32 bg-indigo-900 mx-auto mb-6"></div>

                        <div className="uppercase tracking-[0.3em] text-indigo-700 text-[9px] font-bold mb-2 font-sans">
                            Academic Excellence Award
                        </div>

                        <h1 className="text-3xl font-black text-indigo-950 tracking-wider mb-2 uppercase">
                            Certificate
                        </h1>

                        <div className="text-base text-gray-500 font-light tracking-[0.4em] uppercase mb-8 font-sans">
                            of Completion
                        </div>
                    </div>

                    <div className="w-full max-w-4xl mb-6 z-10 relative text-center">
                        <p className="text-gray-600 italic text-sm mb-4">This is to officially certify that</p>

                        <h2 className="text-3xl font-bold text-indigo-900 mb-6 font-serif">
                            {certificate?.student_name}
                        </h2>

                        <p className="text-gray-600 italic text-sm mb-6">has successfully met all the academic requirements for</p>

                        <h3 className="text-xl font-bold text-gray-800 mb-6 leading-tight">
                            "{certificate?.course_name}"
                        </h3>

                        <p className="text-xs text-gray-600 font-medium font-sans mb-4 bg-gray-50 inline-block px-6 py-2 rounded-full border border-gray-100">
                            Course Duration: {new Date(new Date(certificate?.issued_at).setMonth(new Date(certificate?.issued_at).getMonth() - 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {new Date(certificate?.issued_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="w-full flex justify-between items-end mt-auto pt-8 border-t border-gray-200 font-sans px-4 pb-4 z-10 relative">
                        <div className="flex flex-col items-start w-1/3">
                            <div className="font-signature text-lg text-indigo-800 mb-2" style={{ fontFamily: 'cursive' }}>
                                {certificate?.instructor_name}
                            </div>
                            <div className="h-0.5 w-40 bg-gray-400 mb-2"></div>
                            <p className="text-[8px] font-bold text-gray-900 uppercase tracking-wider">Lead Instructor</p>
                            <p className="text-[8px] text-indigo-900 mt-1 font-semibold">EduPlatform Academy</p>
                        </div>

                        <div className="flex flex-col items-center w-1/3">
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Certificate Verification</p>
                            <p className="font-mono text-[9px] font-bold text-indigo-900 mb-1">{certificate?.verification_code}</p>
                            <p className="text-[8px] text-gray-400">
                                {window.location.origin}/certificate
                            </p>
                        </div>

                        <div className="flex flex-col items-end w-1/3">
                            <div className="text-base text-gray-800 mb-2 font-medium">
                                {formatDate(certificate?.issued_at)}
                            </div>
                            <div className="h-0.5 w-40 bg-gray-400 mb-2"></div>
                            <p className="text-[8px] font-bold text-gray-900 uppercase tracking-wider">Date Issued</p>
                            <div className="flex items-center gap-1 mt-2 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                <span className="text-[7px] font-bold uppercase tracking-wider">Officially Verified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component to show certificate generation button on course completion
export const CertificateGenerationButton = ({ courseId, studentId, studentName, courseName, onGenerate }) => {
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            // Call your API to generate certificate
            const response = await axios.post(`${API}/certificates/generate`, {
                course_id: courseId,
                student_id: studentId,
                student_name: studentName,
                course_name: courseName
            });

            if (response.data.data) {
                const certificate = response.data.data;
                // Save to localStorage
                localStorage.setItem(`certificate_${certificate.verification_code}`, JSON.stringify(certificate));
                // Track generated certificates
                const generatedCerts = JSON.parse(localStorage.getItem('my_certificates') || '[]');
                generatedCerts.push(certificate.verification_code);
                localStorage.setItem('my_certificates', JSON.stringify(generatedCerts));

                if (onGenerate) onGenerate(certificate);
                toast.success("Certificate generated successfully!");

                // Navigate to certificate view
                window.location.href = `/certificate/${certificate.verification_code}`;
            }
        } catch (err) {
            console.error("Certificate generation error:", err);
            toast.error("Failed to generate certificate");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
        >
            {generating ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Certificate...
                </>
            ) : (
                <>
                    <Award className="w-5 h-5" />
                    Generate Certificate
                </>
            )}
        </button>
    );
};

// Component to list user's certificates from localStorage
export const MyCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCertificates = async () => {
            try {
                const myCertCodes = JSON.parse(localStorage.getItem('my_certificates') || '[]');
                const loadedCerts = [];

                for (const code of myCertCodes) {
                    const certData = localStorage.getItem(`certificate_${code}`);
                    if (certData) {
                        loadedCerts.push(JSON.parse(certData));
                    }
                }

                setCertificates(loadedCerts);
            } catch (err) {
                console.error("Error loading certificates:", err);
            } finally {
                setLoading(false);
            }
        };

        loadCertificates();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (certificates.length === 0) {
        return (
            <div className="text-center p-8">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Certificates Yet</h3>
                <p className="text-gray-500">Complete courses to earn certificates!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
                <div key={cert.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <Award className="w-10 h-10 text-indigo-600" />
                        <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Verified
                        </span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">{cert.course_name}</h4>
                    <p className="text-sm text-gray-600 mb-4">Awarded to: {cert.student_name}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            {new Date(cert.issued_at).toLocaleDateString()}
                        </span>
                        <Link
                            to={`/certificate/${cert.verification_code}`}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            View Certificate →
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CertificateView;
