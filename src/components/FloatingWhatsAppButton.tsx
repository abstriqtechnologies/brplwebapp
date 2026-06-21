"use client";
import React from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const FloatingWhatsAppButton = () => {
    const { settings } = useSiteSettings();
    const waNumber = settings.whatsappNumber?.replace(/\D/g, "") || "918130955866";
    const waUrl = `https://wa.me/${waNumber}`;

    return (
        <>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css" />
            <style>
                {`
          .floating_btn {
            position: fixed;
            bottom: 100px; /* Adjusted to sit closer to Register button (Top of register is ~100px) */
            right: 30px;
            width: 60px;
            height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          @media (max-width: 768px) {
            .floating_btn {
               bottom: 110px; /* Keep consistent or adjust if mobile register button is different */
               right: 20px;
            }
          }
          .contact_icon {
            background-color: #25d366;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50px;
            text-align: center;
            box-shadow: 2px 2px 3px #999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            margin-bottom: 5px;
          }
          .text_icon {
            font-size: 14px;
            color: #25d366; /* Matching WA color */
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5); /* Make it readable if bg is complex, or use white with dark shadow */
            background: rgba(255,255,255,0.8);
            padding: 2px 5px;
            border-radius: 4px;
          }
          .my-float {
            margin-top: 0px; 
          }
        `}
            </style>
            <div className="floating_btn">
                <a target="_blank" href={waUrl} rel="noreferrer">
                    <div className="contact_icon">
                        <i className="fa fa-whatsapp my-float"></i>
                    </div>
                </a>
            </div>
        </>
    );
};

export default FloatingWhatsAppButton;
