
import React, { useState } from 'react';
import { Mail, MessageCircle, FileText, ChevronDown, ChevronUp, Search, Info } from 'lucide-react';

const Help = () => {
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const faqs = [
        {
            question: "How do I enroll in a course?",
            answer: "You can enroll in a course by browsing the 'Browse' or 'Dashboard' page, clicking on a course card, and then clicking the 'Enroll Now' button."
        },
        {
            question: "Can I download course materials?",
            answer: "Yes, many courses offer downloadable resources. Look for the 'Resources' tab or download icons next to lecture materials."
        },
        {
            question: "How can I contact the instructor?",
            answer: "You can use the 'Chat' feature within a course page to send messages to the course chat, which the instructor monitors. Some instructors also provide their email in the course status."
        },
        {
            question: "What happens if I forget my password?",
            answer: "You can click 'Forgot Password' on the login screen to receive a password reset link via email."
        },
        {
            question: "How do I get a certificate?",
            answer: "Once you complete 100% of a course (all lectures and assignments), a certificate will be automatically generated. You can find it in the 'Certificates' tab on your dashboard."
        }
    ];

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">How can we help you?</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Browse our frequently asked questions or get in touch with our support team.
                </p>

                <div className="mt-8 max-w-xl mx-auto relative">
                    <input
                        type="text"
                        placeholder="Search for help..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm outline-none"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow text-center group cursor-pointer">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-sky-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
                    <p className="text-sm text-gray-500">Read detailed guides standard operating procedures.</p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow text-center group cursor-pointer">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                    <p className="text-sm text-gray-500">Chat with our support team in real-time.</p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow text-center group cursor-pointer">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
                    <p className="text-sm text-gray-500">Get help via email. We usually respond within 24h.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Info className="w-5 h-5 mr-2 text-sky-600" />
                        Frequently Asked Questions
                    </h2>
                </div>
                <div>
                    {filteredFaqs.length > 0 ? (
                        filteredFaqs.map((faq, index) => (
                            <div key={index} className="border-b last:border-0">
                                <button
                                    onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none"
                                >
                                    <span className="font-medium text-gray-700">{faq.question}</span>
                                    {activeAccordion === index ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>
                                {activeAccordion === index && (
                                    <div className="px-6 pb-4 text-gray-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No results found for "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Help;
