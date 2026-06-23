"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Save, Mail, Shield, User as UserIcon, Lock } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";

const ROLE_LABEL: Record<string, string> = {
    superadmin: "Super Admin",
    subadmin: "Subadmin",
    seo_content: "SEO Content",
};

export default function AdminProfilePage() {
    const { me, refresh, logout } = useAdminAuth();
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [oldPwd, setOldPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [pwdBusy, setPwdBusy] = useState(false);

    useEffect(() => {
        if (me) setName(me.name || "");
    }, [me]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.patch("/api/admin/me", { name });
            if (res.ok) {
                toast({ title: "Success", description: "Profile updated" });
                refresh();
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async () => {
        if (!oldPwd || !newPwd) return;
        if (newPwd.length < 8) {
            toast({ variant: "destructive", title: "Error", description: "New password must be at least 8 characters" });
            return;
        }
        setPwdBusy(true);
        try {
            const res = await api.post("/api/admin/auth/change-password", { oldPassword: oldPwd, newPassword: newPwd });
            if (res.ok) {
                toast({ title: "Success", description: "Password changed" });
                setOldPwd("");
                setNewPwd("");
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setPwdBusy(false);
        }
    };

    if (!me) {
        return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold">Profile</h1>
                <p className="text-slate-500 mt-1">Your admin account details.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 text-2xl font-bold">
                            {(me.name || me.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <CardTitle>{me.name || "Admin"}</CardTitle>
                            <p className="text-sm text-slate-500">{me.email}</p>
                        </div>
                        <Badge className="ml-auto bg-amber-500">
                            <Shield className="w-3 h-3 mr-1" /> {ROLE_LABEL[me.role] || me.role}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                            <Label>Email (read-only)</Label>
                            <Input value={me.email} disabled className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save profile
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Change password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Current password</Label>
                            <Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                        </div>
                        <div>
                            <Label>New password</Label>
                            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={changePassword} disabled={pwdBusy} variant="outline">
                            {pwdBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                            Update password
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sign out</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={logout} variant="outline" className="text-red-600 border-red-300">
                        <LogOut className="w-4 h-4 mr-2" /> Log out of this account
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
