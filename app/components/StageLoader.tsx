"use client";

import dynamic from "next/dynamic";

const Stage = dynamic(() => import("./Stage"), { ssr: false });

export default function StageLoader() {
  return <Stage />;
}
