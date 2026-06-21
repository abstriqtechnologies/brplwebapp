"use client";
import React, { useState, useEffect } from "react";
import api from "@/apihelper/api";
import { getImageUrl } from "@/utils/imageHelper";
import { Loader2 } from "lucide-react";

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  order: number;
}

const MeetOurTeamSection: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get('/api/cms/our-team');
        if (response.data && response.data.data) {
          setMembers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to load team members", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) {
    return <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (members.length === 0) {
    return null; // Don't show section if no members
  }

  return (
    <section className="bg-[#f5f7fb] py-16 md:py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl md:text-4xl font-bold text-[#111a45] mb-10 md:mb-14">
          Meet Our Team
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto place-items-center">
          {members.map((member) => (
            <div
              key={member._id}
              className="flex justify-center w-full"
            >
              <div className="bg-transparent max-w-xs w-full flex flex-col group">
                <div className="relative bg-white rounded-3xl shadow-[0_18px_45px_rgba(0,0,0,0.14)] overflow-hidden w-full founder-card h-[450px]">
                  <div className="w-full h-full overflow-hidden">
                    {member.image ? (
                      <img
                        src={getImageUrl(member.image)}
                        alt={member.name}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="founder-hover-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-0 left-0 right-0 bottom-0 p-6 flex flex-col justify-end">
                      <div className="max-h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        <p className="text-white/95 text-xs md:text-sm leading-relaxed text-justify">
                          {member.bio}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-[-90px] mx-4 mb-2 bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.16)] px-6 py-4 text-center transition-all duration-300 group-hover:opacity-0 min-h-[90px] flex flex-col justify-center">
                  <h3 className="text-lg md:text-xl font-extrabold text-[#111827] leading-tight">
                    {member.name}
                  </h3>
                  <p className="text-sm md:text-base text-gray-700 mt-1 leading-snug">
                    {member.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


export default MeetOurTeamSection;
