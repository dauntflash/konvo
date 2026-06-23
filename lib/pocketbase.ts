// lib/pocketbase.js
import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || "http://127.0.0.1:8090");
pb.autoCancellation(false);

export default pb;
