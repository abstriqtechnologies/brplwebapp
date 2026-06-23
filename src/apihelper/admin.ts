import api from "./api";

export type AdminRecord = {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    amount?: number;
    isPaid?: boolean;
    createdAt: string;
    updatedAt?: string;
    videoCount?: number;
};

export type PaginatedResponse<T> = {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
};

export type AdminRecordsType = "users" | "paid" | "unpaid";

// Stats
export const getDashboardStats = () => api.get<{ stats: { paidCount: number; unpaidCount: number; totalRevenue: number; totalUsers: number } }>("/api/admin/stats");

export const getDashboardCharts = () =>
    api.get<{ name: string; users: number; revenue: number }[]>("/api/admin/charts");

// Records / users
export const getAdminRecords = (
    page = 1,
    limit = 10,
    search = "",
    type: AdminRecordsType = "users",
    startDate?: Date,
    endDate?: Date
) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("type", type);
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    return api.get<PaginatedResponse<AdminRecord>>(`/api/admin/records?${params.toString()}`);
};

export const getAdminUser = (id: string) => api.get<AdminRecord>(`/api/admin/users/${id}`);

export const updateAdminUser = (id: string, body: Partial<AdminRecord>) =>
    api.patch<AdminRecord>(`/api/admin/users/${id}`, body);

export const deleteAdminUser = (id: string) => api.delete<{ success: boolean }>(`/api/admin/users/${id}`);

export const updateUserPayment = (userId: string, paymentId: string, paymentAmount: number) =>
    api.patch<{ success: boolean; user: AdminRecord }>(`/api/admin/users/${userId}/payment`, {
        paymentId,
        paymentAmount,
    });

export const sendThankYouEmail = (userId: string) =>
    api.post<{ sent: boolean; message?: string }>(`/api/admin/users/${userId}/send-thank-you`);

export const downloadUserInvoice = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/invoice`, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to download invoice");
    return await res.blob();
};

export const exportUsersCsv = (search = "", type: AdminRecordsType = "users", startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    return `/api/admin/users/export?${params.toString()}`;
};

// Coupons
export const listCoupons = (page = 1, limit = 50, search = "") =>
    api.get<PaginatedResponse<any>>(`/api/admin/coupons?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
export const createCoupon = (body: any) => api.post("/api/admin/coupons", body);
export const updateCoupon = (id: string, body: any) => api.patch(`/api/admin/coupons/${id}`, body);
export const deleteCoupon = (id: string) => api.delete(`/api/admin/coupons/${id}`);
export const listCouponUsage = (page = 1, limit = 50) =>
    api.get<PaginatedResponse<any>>(`/api/admin/coupons/usage?page=${page}&limit=${limit}`);

// Generic CRUD factories
const crud = (resource: string) => ({
    list: (page = 1, limit = 50, search = "") =>
        api.get<PaginatedResponse<any>>(
            `/api/admin/${resource}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        ),
    get: (id: string) => api.get(`/api/admin/${resource}/${id}`),
    create: (body: any) => api.post(`/api/admin/${resource}`, body),
    update: (id: string, body: any) => api.patch(`/api/admin/${resource}/${id}`, body),
    remove: (id: string) => api.delete(`/api/admin/${resource}/${id}`),
});

export const eventsApi = crud("events");
export const jobsApi = crud("jobs");
export const ambassadorsApi = crud("ambassadors");
export const teamsApi = crud("teams");
export const partnersApi = crud("partners");
export const campaignsApi = crud("campaigns");
export const faqsApi = crud("faqs");
export const blogApi = crud("blog");
export const newsApi = crud("news");

// Payments
export const getPayments = (page = 1, limit = 20, status = "") => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status) params.set("status", status);
    return api.get<PaginatedResponse<any> & { summary: { totalAmount: number; totalCount: number } }>(
        `/api/admin/payments?${params.toString()}`
    );
};

// Contact leads
export const getContactLeads = (page = 1, limit = 50, status = "") => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status) params.set("status", status);
    return api.get<PaginatedResponse<any>>(`/api/admin/contact-leads?${params.toString()}`);
};

export const updateContactLead = (id: string, body: any) =>
    api.patch(`/api/admin/contact-leads/${id}`, body);

export const deleteContactLead = (id: string) => api.delete(`/api/admin/contact-leads/${id}`);

// Single-document CMS
export const getSettings = () => api.get("/api/admin/settings");
export const updateSettings = (body: any) => api.patch("/api/admin/settings", body);

export const getSocialContact = () => api.get("/api/admin/social-contact");
export const updateSocialContact = (body: any) => api.patch("/api/admin/social-contact", body);

export const listPageBanners = () => api.get<{ items: any[] }>("/api/admin/page-banner");
export const getPageBanner = (key: string) => api.get(`/api/admin/page-banner?key=${encodeURIComponent(key)}`);
export const upsertPageBanner = (body: any) => api.post("/api/admin/page-banner", body);
export const updatePageBanner = (id: string, body: any) => api.patch("/api/admin/page-banner", { id, ...body });
export const deletePageBanner = (id: string) => api.delete(`/api/admin/page-banner?id=${id}`);

export const getLegal = (type: "privacy" | "terms" | "rulebook") =>
    api.get(`/api/admin/legal/${type}`);
export const updateLegal = (type: "privacy" | "terms" | "rulebook", body: any) =>
    api.patch(`/api/admin/legal/${type}`, body);

export const listSeo = () => api.get<{ items: any[] }>("/api/admin/seo");
export const getSeo = (path: string) => api.get(`/api/admin/seo?path=${encodeURIComponent(path)}`);
export const upsertSeo = (body: any) => api.post("/api/admin/seo", body);
export const updateSeo = (id: string, body: any) => api.patch("/api/admin/seo", { id, ...body });
export const deleteSeo = (id: string) => api.delete(`/api/admin/seo?id=${id}`);

export const getAboutSection = (section: string) => api.get(`/api/admin/about-us/${section}`);
export const updateAboutSection = (section: string, body: any) =>
    api.patch(`/api/admin/about-us/${section}`, body);

export const getHomeSection = (section: string) => api.get(`/api/admin/home/${section}`);
export const updateHomeSection = (section: string, body: any) =>
    api.patch(`/api/admin/home/${section}`, body);

export const getRegistrationPage = () => api.get("/api/admin/registration-page");
export const updateRegistrationPage = (body: any) => api.patch("/api/admin/registration-page", body);

export const getRegistrationSection = (section: string) =>
    api.get(`/api/admin/registration/${section}`);
export const updateRegistrationSection = (section: string, body: any) =>
    api.patch(`/api/admin/registration/${section}`, body);
