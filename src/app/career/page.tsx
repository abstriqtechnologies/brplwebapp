"use client";

import { useState, useEffect } from "react";
import SEO from "@/components/SEO";
import api from "@/apihelper/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { MapPin, Briefcase, IndianRupee, Clock, FileText, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import { SafeHtml } from "@/components/SafeHtml";

interface Job {
    _id: string;
    title: string;
    description: string;
    salary: string;
    status: 'Open' | 'Closed';
    experience: string;
    jdFile: string;
    jdContent?: string;
}

const ITEMS_PER_PAGE = 10;

const Career = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await api.get('/api/jobs');
                if (response.data && response.data.data) {
                    setJobs(response.data.data.filter((job: Job) => job.status === 'Open'));
                }
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    const handleApply = () => {
        router.push('/contact-us');
    };

    // Pagination Logic
    const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedJobs = jobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <SEO
                title="Careers"
                description="Join the Beyond Reach Premier League team. Explore career opportunities and help us shape the future."
            />
            <PageBanner pageKey="careers" title="Careers" currentPage="Careers" />

            <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
                {/* <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-[#111a45] mb-4 uppercase tracking-wide">
                        Join Our <span className="text-[#FFC928]">Team</span>
                    </h2>
                    <div className="h-1.5 w-24 bg-[#FFC928] rounded-full mx-auto mb-6"></div>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        We are always looking for talented individuals to join our mission.
                        Check out our current openings below.
                    </p>
                </div> */}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-[#111A45]" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Openings Currently</h3>
                        <p className="text-gray-500">Please check back later for new opportunities.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                            <Table>
                                <TableHeader className="bg-[#111a45] hover:bg-[#111a45]">
                                    <TableRow className="hover:bg-[#111a45]">
                                        <TableHead className="text-white font-bold w-[30%]">Role</TableHead>
                                        <TableHead className="text-white font-bold">Experience</TableHead>
                                        <TableHead className="text-white font-bold">Salary (CTC)</TableHead>
                                        <TableHead className="text-white font-bold">Status</TableHead>
                                        <TableHead className="text-white font-bold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedJobs.map((job) => (
                                        <TableRow key={job._id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell className="font-semibold text-[#111a45] py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-lg">{job.title}</span>
                                                    <span className="text-xs text-gray-500 font-normal line-clamp-1 mt-1">{job.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-gray-600">
                                                    <Clock className="w-4 h-4 mr-2 text-[#FFC928]" />
                                                    {job.experience}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-gray-600">
                                                    <IndianRupee className="w-4 h-4 mr-2 text-[#FFC928]" />
                                                    {job.salary}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                                    {job.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-[#111a45] text-[#111a45] hover:bg-[#111a45] hover:text-white"
                                                        onClick={() => setSelectedJob(job)}
                                                    >
                                                        <FileText className="w-4 h-4 mr-1" /> View JD
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-[#111a45] text-white hover:bg-[#111a45]/90"
                                                        onClick={handleApply}
                                                    >
                                                        Apply <Send className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>

                                        {Array.from({ length: totalPages }).map((_, index) => (
                                            <PaginationItem key={index}>
                                                <PaginationLink
                                                    isActive={currentPage === index + 1}
                                                    onClick={() => handlePageChange(index + 1)}
                                                    className="cursor-pointer"
                                                >
                                                    {index + 1}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* JD Modal */}
            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 bg-gray-50 border-b">
                        <DialogTitle className="text-2xl font-bold text-[#111a45]">
                            {selectedJob?.title}
                        </DialogTitle>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {selectedJob?.experience} Exp</span>
                            <span className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" /> {selectedJob?.salary}</span>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 bg-white relative w-full h-full overflow-y-auto p-6">
                        {selectedJob?.jdContent ? (
                            <SafeHtml html={selectedJob.jdContent} className="prose max-w-none" />
                        ) : selectedJob?.jdFile ? (
                            <>
                                <iframe
                                    src={selectedJob.jdFile} // Browser will handle PDF/Image. Word docs might download.
                                    className="w-full h-full border-0 absolute inset-0"
                                    title="Job Description"
                                />
                                <div className="absolute inset-0 flex items-center justify-center -z-10 text-gray-400">
                                    Loading JD...
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                No Description Available
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-white flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
                        <Button className="bg-[#111a45]" onClick={handleApply}>Apply for this Position</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Career;
